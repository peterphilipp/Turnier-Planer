/**
 * Zentrale, validierte JWT-Secret-Quelle.
 *
 * Bewusst KEIN Fallback-Default: Ist JWT_SECRET nicht (ausreichend) gesetzt,
 * wird der Prozess sofort beendet (fail-fast). Damit kann niemals mit einem
 * im Quellcode bekannten Default-Secret signiert/verifiziert werden.
 */
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.trim().length < 16) {
  console.error(
    '[FATAL] JWT_SECRET ist nicht gesetzt oder zu kurz (mind. 16 Zeichen erforderlich). ' +
      'Server wird aus Sicherheitsgründen nicht gestartet.'
  );
  process.exit(1);
}

export default JWT_SECRET as string;
