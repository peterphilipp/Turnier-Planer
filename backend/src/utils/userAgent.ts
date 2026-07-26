/**
 * Grobe, dependency-freie Geräte-/Browser-Erkennung aus dem User-Agent-Header,
 * ausschließlich für eine lesbare Anzeige in der Benutzerverwaltung (Detail-
 * ansicht "auf welchen Geräten ist Push aktiviert") - kein Anspruch auf
 * Vollständigkeit/Genauigkeit wie eine dedizierte UA-Parser-Bibliothek.
 */
export function describeUserAgent(ua?: string | null): string {
  if (!ua) return 'Unbekanntes Gerät';

  const isIphone = /iPhone/i.test(ua);
  const isIpad = /iPad/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isWindows = /Windows/i.test(ua);
  const isMac = /Macintosh/i.test(ua) && !isIphone && !isIpad;
  const isLinux = /Linux/i.test(ua) && !isAndroid;

  let device = 'Gerät';
  if (isIphone) device = 'iPhone';
  else if (isIpad) device = 'iPad';
  else if (isAndroid) device = 'Android';
  else if (isWindows) device = 'Windows';
  else if (isMac) device = 'Mac';
  else if (isLinux) device = 'Linux';

  // Reihenfolge wichtig: iOS-Browser (CriOS/FxiOS) und Edge enthalten selbst
  // "Chrome"/"Safari"-Tokens im User-Agent - spezifischere Muster zuerst prüfen.
  let browser = 'Browser';
  if (/Edg\/|EdgA|EdgiOS/i.test(ua)) browser = 'Edge';
  else if (/CriOS/i.test(ua)) browser = 'Chrome';
  else if (/FxiOS/i.test(ua)) browser = 'Firefox';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/Chrome/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua)) browser = 'Safari';

  return `${device} · ${browser}`;
}
