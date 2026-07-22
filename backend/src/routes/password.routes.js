import express from 'express';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import prisma from '../config/prisma.js';

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

    // In Production: E-Mail senden
    // const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    // await sendEmail(volunteer.email, 'Passwort zurücksetzen', `Klicke hier: ${resetUrl}`);

    // Für Development: Token im Log ausgeben
    const resetUrl = `http://localhost:5173/reset-password?token=${token}`;
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

export default router;
