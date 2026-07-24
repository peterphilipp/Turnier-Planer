import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { Resend } from 'resend';
import { logLoginSuccess, logLoginFailed, logPasswordResetRequested, logPasswordResetCompleted, logRegistrationCreated } from '../utils/logger.js';
import JWT_SECRET from '../config/jwt.js';

function getClientIp(req: express.Request): string | undefined {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() 
    || req.socket.remoteAddress;
}

const router = express.Router();

/** Entfernt den Passwort-Hash aus einem User-Objekt, bevor es ausgeliefert wird. */
function sanitizeUser<T extends { password?: string | null }>(user: T): Omit<T, 'password'> {
  const { password, ...safe } = user;
  return safe;
}

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const ip = getClientIp(req);
    logPasswordResetRequested(email, ip);

    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return res.json({ message: 'Wenn das Konto existiert, wurde ein Reset-Link gesendet.' });

    // Alte Tokens löschen
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    // Neuen Token generieren
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 Stunde

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt
      }
    });

    // E-Mail über Resend senden
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    
    if (process.env.RESEND_API_KEY) {
      try {
        const primaryAdmin = await prisma.user.findFirst({
          where: { isPrimaryAdmin: true, email: { not: null } }
        });
        
        let emailFrom = process.env.EMAIL_FROM || 'Turnier-Planer <noreply@turnier-planer.mygate.dedyn.io>';
        if (primaryAdmin && primaryAdmin.email) {
          emailFrom = `${primaryAdmin.name} <${primaryAdmin.email}>`;
        }

        const resend = new Resend(process.env.RESEND_API_KEY);
        const result = await resend.emails.send({
          from: emailFrom,
          to: user.email as string,
          subject: 'Passwort zurücksetzen',
          html: `
            <h2>Passwort zurücksetzen</h2>
            <p>Hallo ${user.name},</p>
            <p>Klicke auf den folgenden Link, um dein Passwort zurücksetzen:</p>
            <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#0d6efd;color:#fff;text-decoration:none;border-radius:8px;">Passwort zurücksetzen</a></p>
            <p>Der Link ist 1 Stunde gültig.</p>
            <p style="color:#999;font-size:12px;">Wenn du keine Passwortänderung angefordert hast, ignoriere diese E-Mail.</p>
          `
        });
        console.log(JSON.stringify({ 
          event: 'EMAIL_SENT', 
          to: user.email, 
          subject: 'Passwort zurücksetzen', 
          messageId: result.data?.id,
          timestamp: new Date().toISOString()
        }));
      } catch (emailErr) {
        console.error(JSON.stringify({ 
          event: 'EMAIL_FAILED', 
          to: user.email, 
          error: emailErr instanceof Error ? emailErr.message : String(emailErr),
          timestamp: new Date().toISOString()
        }));
      }
    } else {
      const masked = resetUrl.replace(/token=[^&]+/g, 'token=****');
      console.log(JSON.stringify({ 
        event: 'EMAIL_SKIPPED_NO_API_KEY', 
        to: user.email,
        masked_url: masked,
        timestamp: new Date().toISOString()
      }));
    }
    
    // Token im Log ausgeben (maskiert)
    const maskedToken = token.substring(0, 8) + '...';
    console.log(JSON.stringify({ 
      event: 'PASSWORD_RESET_TOKEN_GENERATED', 
      userId: user.id,
      email: user.email,
      masked_token: maskedToken,
      expires_at: expiresAt.toISOString(),
      timestamp: new Date().toISOString()
    }));

    res.json({ message: 'Wenn das Konto existiert, wurde ein Reset-Link gesendet.' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Token und neues Passwort erforderlich' });

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!resetToken || !resetToken.user) return res.status(400).json({ error: 'Ungültiger oder abgelaufener Token' });

    // Passwort hashen
    const hashed = await bcrypt.hash(newPassword, 10);

    // Passwort aktualisieren
    await prisma.user.update({
      where: { id: resetToken.userId as number },
      data: { password: hashed }
    });

    // Token als verwendet markieren
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true }
    });

    logPasswordResetCompleted(resetToken.userId as number, resetToken.user.name, getClientIp(req));
    res.json({ message: 'Passwort erfolgreich zurückgesetzt' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const identifier = email || name;
    
    if (!identifier) {
      return res.status(400).json({ error: 'Name oder E-Mail erforderlich' });
    }

    const ip = getClientIp(req);
    const user = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { email: identifier },
          { name: identifier }
        ]
      },
      include: { children: true }
    });
    
    if (!user) {
        logLoginFailed(identifier, 'Benutzer nicht gefunden', getClientIp(req) || '');
        return res.status(401).json({ error: 'Benutzer nicht gefunden' });
      }

      const match = await bcrypt.compare(password, user.password || '');
      if (!match) {
        logLoginFailed(identifier, 'Falsches Passwort', getClientIp(req) || '');
        return res.status(401).json({ error: 'Falsches Passwort' });
      }

      logLoginSuccess(user.email || identifier, getClientIp(req));
      
      // Admin-Rechte dynamisch forcieren, falls die Umgebungsvariable gesetzt ist
      const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.toLowerCase().split(',').map(e => e.trim()) : [];
      let userRole = typeof user.role === 'string' && ['HELPER', 'ORGANIZER', 'ADMIN'].includes(user.role) ? user.role : 'HELPER';
      
      if (user.email && adminEmails.includes(user.email.toLowerCase()) && userRole !== 'ADMIN') {
        userRole = 'ADMIN';
        // Optional in DB aktualisieren, damit es dauerhaft bleibt
        await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
        user.role = 'ADMIN';
      }

      const token = jwt.sign({ userId: user.id, role: userRole }, JWT_SECRET, { expiresIn: '30d' });
      res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: 'Ungültiger Token' });
    }
    res.json(sanitizeUser(user));
  } catch (err) {
    res.status(401).json({ error: 'Ungültiger Token' });
  }
});

// GET /api/auth/export – Auskunft nach Art. 15 DSGVO
router.get('/export', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    } catch {
      return res.status(401).json({ error: 'Ungültiger Token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        children: true,
        shifts: {
          include: { shift: { include: { workArea: true, globalTimeSlot: true, tournament: true } } }
        },
        foodDonations: {
          include: { foodItem: true }
        }
      }
    });

    if (!user) return res.status(404).json({ error: 'Nicht gefunden' });

    // Keine sensiblen Daten exportieren (kein Passwort)
    const exportData = {
      exportedAt: new Date().toISOString(),
      appName: 'Turnier-Planer',
      personalData: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        children: user.children.map(c => ({ childName: c.childName, childYear: c.childYear })),
      },
      shifts: (user as any).shifts.map((s: any) => ({
        date: s.date,
        slot: s.slot,
        role: s.role,
        arbeitsbereich: s.shift?.workArea?.name ?? null,
        zeitslot: s.shift?.globalTimeSlot ? `${s.shift.globalTimeSlot.name} (${s.shift.globalTimeSlot.startTime}-${s.shift.globalTimeSlot.endTime})` : null
      })),
      donations: (user as any).foodDonations.map((d: any) => ({
        foodItem: d.foodItem?.name,
        quantity: d.quantity,
        note: d.note,
        createdAt: d.createdAt
      }))
    };

    res.json(exportData);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/password
router.patch('/password', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    } catch {
      return res.status(401).json({ error: 'Ungültiger Token' });
    }
    
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Bitte alle Felder ausfuellen' });

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.password) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashed }
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/account – Löschung nach Art. 17 DSGVO
router.delete('/account', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    } catch {
      return res.status(401).json({ error: 'Ungültiger Token' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return res.status(404).json({ error: 'Nicht gefunden' });

    // Bestehende Einsätze archivieren (nicht löschen – rechtliche Aufbewahrung)
    await prisma.volunteerShift.updateMany({
      where: { userId: decoded.userId },
      data: { userId: null }
    });

    // Spenden verknüpfung lösen
    await prisma.foodDonation.updateMany({
      where: { userId: decoded.userId },
      data: { userId: null }
    });

    // Kinder löschen
    await prisma.userChild.deleteMany({ where: { userId: decoded.userId } });

    // Reset-Tokens löschen
    await prisma.passwordResetToken.deleteMany({ where: { userId: decoded.userId } });

    // Konto löschen (Passwort wird bcrypt-gehashet, nicht umkehrbar)
    await prisma.user.delete({ where: { id: decoded.userId } });

    res.json({ message: 'Dein Konto wurde erfolgreich gelöscht. Alle personenbezogenen Daten wurden entfernt.' });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/profile
router.patch('/profile', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    } catch {
      return res.status(401).json({ error: 'Ungültiger Token' });
    }

    const { name, email, phone, children, consentGiven } = req.body;
    let updateData: any = { name, email, phone };
    if (consentGiven !== undefined) {
      updateData.consentGiven = consentGiven;
      updateData.consentDate = consentGiven ? new Date() : null;
    }

    // Kinder aktualisieren
    if (children && Array.isArray(children)) {
      // Alte Kinder löschen
      await prisma.userChild.deleteMany({ where: { userId: decoded.userId } });
      // Neue Kinder erstellen
      updateData.children = {
        create: children.map((c: { childName: string; childYear: number }) => ({
          childName: c.childName,
          childYear: parseInt(c.childYear as any)
        }))
      };
    }

    const user = await prisma.user.update({
      where: { id: decoded.userId },
      data: updateData,
      include: { children: true }
    });

    res.json(sanitizeUser(user));
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password, children, consentGiven } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Fehlende Pflichtfelder' });
    if (consentGiven !== true) return res.status(400).json({ error: 'Datenschutzerklärung muss akzeptiert werden' });

    const existing = await prisma.user.findFirst({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email wird bereits verwendet' });

    // Admin-Berechtigungen robuster machen: Über Umgebungsvariable oder als allererster Nutzer
    const adminEmails = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.toLowerCase().split(',').map(e => e.trim()) : [];
    const isForcedAdmin = adminEmails.includes(email.toLowerCase());

    // Aktives Turnier automatisch zuweisen
    const activeTournament = await prisma.tournament.findFirst({
      where: { status: 'aktiv' },
      orderBy: { startDate: 'desc' }
    });

    // Erster User bekommt automatisch ADMIN-Rechte (falls kein Admin existiert)
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    const isFirstAdmin = adminCount === 0;

    const hashed = await bcrypt.hash(password, 10);
    const createData: any = {
      name,
      email,
      phone,
      password: hashed,
      role: (isFirstAdmin || isForcedAdmin) ? 'ADMIN' : 'HELPER',
      tournamentId: activeTournament?.id || null,
      consentGiven: true,
      consentDate: new Date()
    };

    // Kinder erstellen
    if (children && Array.isArray(children) && children.length > 0) {
      createData.children = {
        create: children.map((c: { childName: string; childYear: number }) => ({
          childName: c.childName,
          childYear: parseInt(c.childYear as any)
        }))
      };
    }

    const ip = getClientIp(req);
    const user = await prisma.user.create({
      data: createData,
      include: { children: true }
    });

    logRegistrationCreated(user.name, user.email || '', ip);
    // Rolle aus dem neu erstellten User lesen und ins JWT aufnehmen
    const newRole = typeof user.role === 'string' && ['HELPER', 'ORGANIZER', 'ADMIN'].includes(user.role)
      ? user.role
      : 'HELPER';
    const token = jwt.sign({ userId: user.id, role: newRole }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    next(err);
  }
});

export default router;
