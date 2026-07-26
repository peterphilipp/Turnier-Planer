import { Router } from 'express';
import { z } from 'zod';
import validate from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/security.js';
import {
  getRegistrationOptions,
  verifyRegistration,
  listCredentials,
  deleteCredential,
  getAuthenticationOptions,
  verifyAuthentication
} from '../controllers/passkey.controller.js';

// response ist die komplexe, browserabhängige WebAuthn-Antwortstruktur
// (PublicKeyCredential als JSON) - die eigentliche, sicherheitsrelevante
// Prüfung übernimmt @simplewebauthn/server in verifyRegistrationResponse/
// verifyAuthenticationResponse; hier reicht die Existenzprüfung der
// Top-Level-Felder.
const verifyRegistrationSchema = z.object({
  response: z.any(),
  challengeToken: z.string().min(1, 'challengeToken erforderlich'),
  label: z.string().max(100).optional()
});

// identifier optional: fehlt er, läuft der identifier-lose ("discoverable")
// Anmeldeflow (siehe getAuthenticationOptions) - der Browser bietet dann
// selbst alle passenden Passkeys auf dem Gerät an, ohne dass Name/E-Mail
// vorher eingegeben werden muss.
const authOptionsSchema = z.object({
  identifier: z.string().trim().max(255).optional()
});

const verifyAuthenticationSchema = z.object({
  response: z.any(),
  challengeToken: z.string().min(1, 'challengeToken erforderlich')
});

const router = Router();

// Registrierung: setzt einen bestehenden Login voraus (Passkey wird zum
// Konto hinzugefügt, nie zur Erstanmeldung genutzt).
router.post('/register-options', authenticate, getRegistrationOptions);
router.post('/register-verify', authenticate, validate(verifyRegistrationSchema), verifyRegistration);
router.get('/', authenticate, listCredentials);
router.delete('/:id', authenticate, deleteCredential);

// Anmeldung: öffentlich, wie /api/auth/login - eigenes Rate-Limit gegen
// Enumeration/Brute-Force über den identifier-Lookup.
router.post('/login-options', authLimiter, validate(authOptionsSchema), getAuthenticationOptions);
router.post('/login-verify', authLimiter, validate(verifyAuthenticationSchema), verifyAuthentication);

export default router;
