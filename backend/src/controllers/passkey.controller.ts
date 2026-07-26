import { Response } from 'express';
import jwt from 'jsonwebtoken';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';
import prisma from '../config/prisma.js';
import JWT_SECRET from '../config/jwt.js';
import { AuthRequest } from '../middleware/auth.js';
import { getRpID, getOrigin, rpName } from '../config/webauthn.js';
import { resolveRoleAndForceAdmin, signSessionToken } from '../utils/authSession.js';
import { logLoginSuccess, logLoginFailed } from '../utils/logger.js';

/**
 * Entfernt Geheimnisse aus einem User-Objekt, bevor es ausgeliefert wird -
 * gleiche Form wie in password.routes.ts (dort bewusst nicht importiert, um
 * diesen Controller nicht an die Router-Datei zu koppeln).
 */
function sanitizeUser<T extends { password?: string | null; recoveryPin?: string | null }>(
  user: T
): Omit<T, 'password' | 'recoveryPin'> {
  const { password, recoveryPin, ...safe } = user;
  return safe;
}

function getClientIp(req: AuthRequest): string | undefined {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
    || req.socket.remoteAddress;
}

/**
 * Die Challenge wird bewusst NICHT serverseitig zwischengespeichert (kein
 * Session-Store, passt zum bestehenden zustandslosen JWT-Ansatz dieser App),
 * sondern als kurzlebiges, signiertes Token an den Client zurückgegeben und
 * beim Verify-Call wieder mitgeschickt. Die Signatur verhindert Manipulation,
 * die kurze Gültigkeit begrenzt das Replay-Fenster.
 */
interface ChallengeTokenPayload {
  purpose: 'webauthn-register' | 'webauthn-login';
  userId: number;
  challenge: string;
}

function signChallengeToken(payload: ChallengeTokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '5m' });
}

function verifyChallengeToken(token: string): ChallengeTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as ChallengeTokenPayload;
  } catch {
    return null;
  }
}

type StoredTransports = string[] | undefined;

function parseTransports(raw: string | null): StoredTransports {
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

// ===================== Registrierung (authentifiziert) =====================

/** Setzt einen bestehenden Login voraus - ein Passkey wird "on top" zum Konto hinzugefügt, nie zur Erstanmeldung genutzt. */
export const getRegistrationOptions = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { webAuthnCredentials: true } });
  if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

  const options = await generateRegistrationOptions({
    rpName,
    rpID: getRpID(),
    userName: user.email || user.name,
    userDisplayName: user.name,
    attestationType: 'none',
    excludeCredentials: user.webAuthnCredentials.map(c => ({
      id: c.credentialId,
      transports: parseTransports(c.transports) as any
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred'
    }
  });

  const challengeToken = signChallengeToken({ purpose: 'webauthn-register', userId, challenge: options.challenge });
  res.json({ options, challengeToken });
};

export const verifyRegistration = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const { response, challengeToken, label } = req.body;
  if (!response || !challengeToken) return res.status(400).json({ error: 'Ungültige Anfrage' });

  const payload = verifyChallengeToken(challengeToken);
  if (!payload || payload.purpose !== 'webauthn-register' || payload.userId !== userId) {
    return res.status(400).json({ error: 'Challenge abgelaufen oder ungültig - bitte erneut versuchen' });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: payload.challenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpID()
    });
  } catch (e: any) {
    return res.status(400).json({ error: 'Passkey-Registrierung fehlgeschlagen: ' + e.message });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return res.status(400).json({ error: 'Passkey-Registrierung konnte nicht verifiziert werden' });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  await prisma.webAuthnCredential.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      transports: credential.transports ? JSON.stringify(credential.transports) : null,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      label: (typeof label === 'string' && label.trim()) ? label.trim().slice(0, 100) : null
    }
  });

  res.status(201).json({ success: true });
};

/** Eigene Passkeys auflisten (für die Verwaltung im Menü/Profil). */
export const listCredentials = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const credentials = await prisma.webAuthnCredential.findMany({
    where: { userId },
    select: { id: true, label: true, deviceType: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
  res.json(credentials);
};

export const deleteCredential = async (req: AuthRequest, res: Response) => {
  const userId = req.userId!;
  const id = parseInt(req.params.id as string, 10);
  const existing = await prisma.webAuthnCredential.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return res.status(404).json({ error: 'Passkey nicht gefunden' });
  }
  await prisma.webAuthnCredential.delete({ where: { id } });
  res.status(204).send();
};

// ===================== Anmeldung (öffentlich) =====================

export const getAuthenticationOptions = async (req: AuthRequest, res: Response) => {
  const { identifier } = req.body;
  if (!identifier) return res.status(400).json({ error: 'Name oder E-Mail erforderlich' });

  const user = await prisma.user.findFirst({
    where: { OR: [{ email: identifier }, { name: identifier }] },
    include: { webAuthnCredentials: true }
  });

  if (!user || user.webAuthnCredentials.length === 0) {
    return res.status(400).json({ error: 'Für dieses Konto ist kein Passkey eingerichtet.' });
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpID(),
    allowCredentials: user.webAuthnCredentials.map(c => ({
      id: c.credentialId,
      transports: parseTransports(c.transports) as any
    })),
    userVerification: 'preferred'
  });

  const challengeToken = signChallengeToken({ purpose: 'webauthn-login', userId: user.id, challenge: options.challenge });
  res.json({ options, challengeToken });
};

export const verifyAuthentication = async (req: AuthRequest, res: Response) => {
  const { response, challengeToken } = req.body;
  if (!response || !challengeToken) return res.status(400).json({ error: 'Ungültige Anfrage' });

  const payload = verifyChallengeToken(challengeToken);
  if (!payload || payload.purpose !== 'webauthn-login') {
    return res.status(401).json({ error: 'Challenge abgelaufen oder ungültig - bitte erneut versuchen' });
  }

  const credentialRow = await prisma.webAuthnCredential.findUnique({ where: { credentialId: response.id } });
  if (!credentialRow || credentialRow.userId !== payload.userId) {
    logLoginFailed('passkey:' + payload.userId, 'Passkey nicht erkannt', getClientIp(req) || '');
    return res.status(401).json({ error: 'Passkey nicht erkannt' });
  }

  const user = await prisma.user.findUnique({ where: { id: credentialRow.userId } });
  if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: payload.challenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpID(),
      credential: {
        id: credentialRow.credentialId,
        publicKey: new Uint8Array(Buffer.from(credentialRow.publicKey, 'base64')),
        counter: credentialRow.counter,
        transports: parseTransports(credentialRow.transports) as any
      }
    });
  } catch (e: any) {
    return res.status(400).json({ error: 'Passkey-Anmeldung fehlgeschlagen: ' + e.message });
  }

  if (!verification.verified) {
    logLoginFailed(user.email || user.name, 'Passkey-Verifikation fehlgeschlagen', getClientIp(req) || '');
    return res.status(401).json({ error: 'Passkey-Anmeldung konnte nicht verifiziert werden' });
  }

  // Counter aktualisieren (Schutz gegen geklonte Authenticatoren/Replay).
  await prisma.webAuthnCredential.update({
    where: { id: credentialRow.id },
    data: { counter: verification.authenticationInfo.newCounter }
  });

  logLoginSuccess(user.email || user.name, getClientIp(req));

  const userRole = await resolveRoleAndForceAdmin(user);
  const token = signSessionToken(user.id, userRole);
  res.json({ token, user: sanitizeUser(user) });
};
