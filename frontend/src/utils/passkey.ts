import { startRegistration, startAuthentication, browserSupportsWebAuthn, platformAuthenticatorIsAvailable } from '@simplewebauthn/browser';
import {
  getPasskeyRegistrationOptions,
  verifyPasskeyRegistration,
  getPasskeyAuthenticationOptions,
  verifyPasskeyAuthentication
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

/** Setzt einen bestehenden Login voraus - registriert das aktuelle Gerät als zusätzlichen Passkey. */
export async function registerPasskey(label?: string): Promise<void> {
  const { options, challengeToken } = await getPasskeyRegistrationOptions();
  const response = await startRegistration({ optionsJSON: options });
  await verifyPasskeyRegistration({ response, challengeToken, label });
}

/** Meldet mit einem zuvor registrierten Passkey an und liefert Token+User wie der Passwort-Login. */
export async function loginWithPasskey(identifier: string): Promise<{ token: string; user: any }> {
  const { options, challengeToken } = await getPasskeyAuthenticationOptions(identifier);
  const response = await startAuthentication({ optionsJSON: options });
  return await verifyPasskeyAuthentication({ response, challengeToken });
}
