/**
 * Relying-Party-Konfiguration für Passkeys (WebAuthn), abgeleitet aus
 * FRONTEND_URL statt einer eigenen neuen Env-Variable - das ist bereits die
 * verbindliche Quelle für "wo läuft das Frontend" (siehe auch
 * resolveFrontendUrl() in password.routes.ts) und muss exakt mit der Origin
 * übereinstimmen, unter der der Browser die Passkey-API aufruft, sonst
 * schlägt die Verifikation fehl.
 */
const RP_NAME = 'Macht das Turnier!';

function frontendUrl(): string {
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

/** Reine Domain ohne Protokoll/Port - WebAuthn verlangt hier einen validen Hostnamen. */
export function getRpID(): string {
  try {
    return new URL(frontendUrl()).hostname;
  } catch {
    return 'localhost';
  }
}

/** Vollständige Origin (mit Protokoll), gegen die der Browser-Response geprüft wird. */
export function getOrigin(): string {
  return frontendUrl();
}

export const rpName = RP_NAME;
