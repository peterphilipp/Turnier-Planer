import { startRegistration, startAuthentication, browserSupportsWebAuthn, browserSupportsWebAuthnAutofill, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser';
import {
  getPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  getPasskeyAuthenticationOptions,
  verifyPasskeyAuthentication,
  getMyPasskeys
} from '../api';

/** Face ID/Touch ID/Android-Fingerabdruck als Authenticator verfügbar (nicht nur ein externer Security Key)? */
export async function isPasskeySupported(): Promise<boolean> {
  if (!browserSupportsWebAuthn()) return false;
  try {
    return await platformAuthenticatorIsAvailable();
  } catch {
    return false;
  }
}

/** Unterstützt der Browser "Conditional UI" (Passkey-Vorschlag direkt im Login-Feld, ohne Klick)? */
export async function isConditionalUiSupported(): Promise<boolean> {
  try {
    return await browserSupportsWebAuthnAutofill();
  } catch {
    return false;
  }
}

/** Setzt einen bestehenden Login voraus - registriert das aktuelle Gerät als zusätzlichen Passkey. */
export async function registerPasskey(label?: string): Promise<void> {
  const { options, challengeToken } = await getPasskeyRegistrationOptions();
  const response = await startRegistration({ optionsJSON: options });
  await verifyPasskeyRegistration({ response, challengeToken, label });
}

/**
 * Meldet mit einem zuvor registrierten Passkey an und liefert Token+User wie
 * der Passwort-Login. identifier ist optional - ohne ihn läuft der
 * identifier-lose ("discoverable") Flow: der Browser zeigt selbst alle für
 * diese Seite hinterlegten Passkeys auf dem Gerät zur Auswahl an.
 */
export async function loginWithPasskey(identifier?: string): Promise<{ token: string; user: any }> {
  const { options, challengeToken } = await getPasskeyAuthenticationOptions(identifier);
  const response = await startAuthentication({ optionsJSON: options });
  return await verifyPasskeyAuthentication({ response, challengeToken });
}

/**
 * Conditional UI: bietet dem Nutzer den Passkey direkt im Login-Feld an,
 * ganz ohne Klick, sobald der Login-Bildschirm lädt - sofern Browser/Gerät
 * das unterstützen und ein passender Passkey hinterlegt ist. Das Login-Feld
 * braucht dafür autoComplete="username webauthn", sonst hat der Browser
 * nichts, woran er den Vorschlag anzeigen könnte.
 *
 * Bricht sauber ab (liefert null), wenn Conditional UI nicht unterstützt wird
 * oder der Nutzer stattdessen einen anderen Anmeldeweg abschließt/die Seite
 * verlässt (AbortError) - das ist der normale, erwartete Fall, kein Fehler.
 */
export async function tryConditionalPasskeyLogin(): Promise<{ token: string; user: any } | null> {
  if (!(await isConditionalUiSupported())) return null;

  const { options, challengeToken } = await getPasskeyAuthenticationOptions();
  try {
    const response = await startAuthentication({ optionsJSON: options, useBrowserAutofill: true });
    return await verifyPasskeyAuthentication({ response, challengeToken });
  } catch (e: any) {
    if (e?.name === 'AbortError') return null;
    throw e;
  }
}

/** Hat der aktuell eingeloggte User bereits mindestens einen Passkey eingerichtet? */
export async function hasRegisteredPasskey(): Promise<boolean> {
  try {
    const list = await getMyPasskeys();
    return Array.isArray(list) && list.length > 0;
  } catch {
    return false;
  }
}
