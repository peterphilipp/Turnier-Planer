import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors, { CorsOptions } from 'cors';

/**
 * HTTP-Header-Härtung.
 *
 * contentSecurityPolicy ist bewusst DEAKTIVIERT: Das Frontend nutzt durchgängig
 * Inline-Styles (style={{...}} in jeder Komponente). Eine Standard-CSP ohne
 * 'unsafe-inline' würde die App komplett unbenutzbar machen. Alle übrigen
 * Schutz-Header (HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy,
 * Cross-Origin-*) bleiben aktiv.
 *
 * TODO: CSP aktivieren, sobald die Inline-Styles in eine CSS-Datei ausgelagert sind.
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: false,
  // Verhindert nicht, dass die eigene PWA Assets lädt, blockt aber Fremd-Embedding
  crossOriginEmbedderPolicy: false
});

/**
 * CORS-Whitelist statt `cors()` mit Wildcard.
 *
 * In Produktion liefert derselbe Express-Prozess das Frontend aus (SPA aus
 * ../dist) – die App selbst braucht also gar kein CORS. Die Wildcard erlaubte
 * es hingegen jeder beliebigen Website, die unauthentifizierten Endpunkte
 * (/login, /reset-by-pin, /forgot-password*) aus den Browsern ihrer Besucher
 * heraus aufzurufen – also verteilten Brute-Force über fremde IPs, was
 * IP-basiertes Rate-Limiting aushebelt.
 */
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000', // Vite dev
  'http://localhost:5173'  // Vite default
].filter((o): o is string => !!o);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    // Kein Origin-Header = same-origin, curl, Health-Checks, Server-zu-Server
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin nicht erlaubt (CORS)'));
  },
  credentials: true
};
export const corsMiddleware = cors(corsOptions);

/**
 * Globales Limit: absichtlich großzügig, damit normale Nutzung (Admin klickt
 * sich durch die Turnierplanung, viele parallele Queries) nie anschlägt.
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte versuche es später erneut.' }
});

/**
 * Strenges Limit für unauthentifizierte Auth-Endpunkte.
 *
 * Diese Routen sind die eigentlichen Angriffsziele:
 *  - /login              -> Credential Stuffing
 *  - /reset-by-pin       -> PIN-Brute-Force (setzt direkt ein neues Passwort!)
 *  - /forgot-password    -> Mail-Bombing + Kosten/Reputation im Resend-Account
 *  - /forgot-password-push -> Push-Bombing + Entwerten offener Reset-Tokens
 *  - /register           -> Massen-Accounts
 *
 * `skipSuccessfulRequests` sorgt dafür, dass legitime Nutzer, die sich korrekt
 * anmelden, das Budget nicht verbrauchen – nur Fehlversuche zählen.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Zu viele Fehlversuche. Bitte warte 15 Minuten und versuche es dann erneut.' }
});

/**
 * Sehr strenges Limit für den PIN-Reset. Der PIN hat ~2^40 Entropie und ist
 * bcrypt-gehasht, aber dieser Endpunkt setzt ohne zweiten Faktor ein neues
 * Passwort – hier zählt jeder einzelne Versuch.
 */
export const pinResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Zu viele Fehlversuche mit der Helfer-PIN. Bitte warte eine Stunde oder nutze den E-Mail-Reset.' }
});
