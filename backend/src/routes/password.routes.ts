import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const JWT_SECRET = process.env.JWT_SECRET || 'tsv-holm-secret-2025';

const router = express.Router();

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    const volunteer = await prisma.volunteer.findFirst({ where: { email } });
    if (!volunteer) return res.json({ message: 'Wenn das Konto existiert, wurde ein Reset-Link gesendet.' });

    // Alte Tokens löschen
    await prisma.passwordResetToken.deleteMany({ where: { volunteerId: volunteer.id } });

    // Neuen Token generieren
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 Stunde

    await prisma.passwordResetToken.create({
      data: {
        volunteerId: volunteer.id,
        token,
        expiresAt
      }
    });

    // E-Mail über Resend senden
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    
    if (resend) {
      try {
        await resend.emails.send({
          from: 'Turnier-Planer <noreply@turnier-planer.mygate.dedyn.io>',
          to: volunteer.email,
          subject: 'Passwort zurücksetzen',
          html: `
            <h2>Passwort zurücksetzen</h2>
            <p>Hallo ${volunteer.name},</p>
            <p>Klicke auf den folgenden Link, um dein Passwort zurückzusetzen:</p>
            <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#0d6efd;color:#fff;text-decoration:none;border-radius:8px;">Passwort zurücksetzen</a></p>
            <p>Der Link ist 1 Stunde gültig.</p>
            <p style="color:#999;font-size:12px;">Wenn du keine Passwortänderung angefordert hast, ignoriere diese E-Mail.</p>
          `
        });
      } catch (emailErr) {
        console.error('E-Mail konnte nicht gesendet werden:', emailErr);
      }
    }
    
    // Fallback: Token im Log ausgeben
    console.log(`\n🔑 PASSWORT-RESET LINK (gültig 1h):\n${resetUrl}\n`);

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
      include: { volunteer: true }
    });

    if (!resetToken) return res.status(400).json({ error: 'Ungültiger oder abgelaufener Token' });

    // Passwort hashen
    const hashed = await bcrypt.hash(newPassword, 10);

    // Passwort aktualisieren
    await prisma.volunteer.update({
      where: { id: resetToken.volunteerId },
      data: { password: hashed }
    });

    // Token als verwendet markieren
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true }
    });

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

    const volunteer = await prisma.volunteer.findFirst({ 
      where: { 
        OR: [
          { email: identifier },
          { name: identifier }
        ]
      },
      include: { children: true }
    });
    
    if (!volunteer || !volunteer.password) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const match = await bcrypt.compare(password, volunteer.password);
    if (!match) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten' });
    }

    const token = jwt.sign({ volunteerId: volunteer.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, volunteer });
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
    const decoded = jwt.verify(token, JWT_SECRET) as { volunteerId: number };
    
    const volunteer = await prisma.volunteer.findUnique({ where: { id: decoded.volunteerId } });
    if (!volunteer) {
      return res.status(401).json({ error: 'Ungültiger Token' });
    }
    res.json(volunteer);
  } catch (err) {
    res.status(401).json({ error: 'Ungültiger Token' });
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
      decoded = jwt.verify(token, JWT_SECRET) as { volunteerId: number };
    } catch {
      return res.status(401).json({ error: 'Ungültiger Token' });
    }
    
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Bitte alle Felder ausfuellen' });

    const volunteer = await prisma.volunteer.findUnique({ where: { id: decoded.volunteerId } });
    if (!volunteer || !volunteer.password) return res.status(401).json({ error: 'Ungültige Anmeldedaten' });

    const match = await bcrypt.compare(currentPassword, volunteer.password);
    if (!match) return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.volunteer.update({
      where: { id: decoded.volunteerId },
      data: { password: hashed }
    });

    res.json({ success: true });
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
      decoded = jwt.verify(token, JWT_SECRET) as { volunteerId: number };
    } catch {
      return res.status(401).json({ error: 'Ungültiger Token' });
    }

    const { name, email, phone, childName, childYear, children } = req.body;
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (childName !== undefined) updateData.childName = childName || null;
    if (childYear !== undefined) updateData.childYear = childYear ? parseInt(childYear) : null;

    // Kinder aktualisieren
    if (children && Array.isArray(children)) {
      // Alte Kinder löschen
      await prisma.volunteerChild.deleteMany({ where: { volunteerId: decoded.volunteerId } });
      // Neue Kinder erstellen
      updateData.children = {
        create: children.map((c: { childName: string; childYear: number }) => ({
          childName: c.childName,
          childYear: parseInt(c.childYear)
        }))
      };
    }

    const volunteer = await prisma.volunteer.update({
      where: { id: decoded.volunteerId },
      data: updateData,
      include: { children: true }
    });

    res.json(volunteer);
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, phone, password, childName, childYear, children } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Fehlende Pflichtfelder' });

    const existing = await prisma.volunteer.findFirst({ where: { email } });
    if (existing) return res.status(409).json({ error: 'Email wird bereits verwendet' });

    // Aktives Turnier automatisch zuweisen
    const activeTournament = await prisma.tournament.findFirst({
      where: { status: 'aktiv' },
      orderBy: { startDate: 'desc' }
    });

    const hashed = await bcrypt.hash(password, 10);
    const createData: any = {
      name,
      email,
      phone,
      childName: childName || null,
      childYear: childYear ? parseInt(childYear) : null,
      password: hashed,
      roles: '["Helfer"]',
      tournamentId: activeTournament?.id || null
    };

    // Kinder erstellen
    if (children && Array.isArray(children) && children.length > 0) {
      createData.children = {
        create: children.map((c: { childName: string; childYear: number }) => ({
          childName: c.childName,
          childYear: parseInt(c.childYear)
        }))
      };
    }

    const volunteer = await prisma.volunteer.create({
      data: createData,
      include: { children: true }
    });

    const token = jwt.sign({ volunteerId: volunteer.id }, JWT_SECRET, { expiresIn: '30d' });
    res.status(201).json({ token, volunteer });
  } catch (err) {
    next(err);
  }
});

export default router;
