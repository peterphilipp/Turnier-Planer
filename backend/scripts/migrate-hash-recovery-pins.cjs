/**
 * Einmalige Migration: Recovery-PINs wurden ursprünglich im KLARTEXT gespeichert
 * und waren zusätzlich über mehrere API-Antworten abrufbar (/login, /me,
 * /profile, GET /api/volunteers). Sie gelten damit als kompromittiert.
 *
 * Dieses Skript ersetzt jeden Klartext-PIN durch einen bcrypt-Hash. Zwei Modi:
 *
 *   (Standard) HASH-IN-PLACE
 *     Der bestehende PIN bleibt für den Nutzer gültig, liegt aber nur noch
 *     gehasht in der DB. Kein Nutzer verliert seine Recovery-Möglichkeit.
 *     Da die PINs zuvor geleakt sein können, ist das die *funktionale*, nicht
 *     die maximal sichere Variante.
 *
 *   (mit --invalidate) ENTWERTEN
 *     Klartext-PINs werden auf NULL gesetzt. Betroffene Nutzer können den
 *     PIN-Reset dann nicht mehr nutzen (E-Mail-Reset bleibt) und erhalten bei
 *     der nächsten PIN-Nutzung ohnehin einen frischen, rotierten PIN.
 *     Empfohlen, wenn die DB je öffentlich lag.
 *
 * Idempotent: bereits gehashte Werte (Präfix $2) werden übersprungen.
 */
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');

const INVALIDATE = process.argv.includes('--invalidate');

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      where: { recoveryPin: { not: null } },
      select: { id: true, name: true, recoveryPin: true }
    });

    const plaintext = users.filter(u => u.recoveryPin && !u.recoveryPin.startsWith('$2'));

    if (plaintext.length === 0) {
      console.log('[migrate-hash-recovery-pins] Keine Klartext-PINs gefunden – nichts zu tun.');
      return;
    }

    console.log(`[migrate-hash-recovery-pins] ${plaintext.length} Klartext-PIN(s) gefunden. Modus: ${INVALIDATE ? 'ENTWERTEN' : 'HASH-IN-PLACE'}`);

    for (const u of plaintext) {
      const value = INVALIDATE ? null : await bcrypt.hash(u.recoveryPin, 10);
      await prisma.user.update({ where: { id: u.id }, data: { recoveryPin: value } });
      console.log(`  id=${u.id} (${u.name}): ${INVALIDATE ? 'auf NULL gesetzt' : 'gehasht'}`);
    }

    console.log('[migrate-hash-recovery-pins] Fertig.');
    if (!INVALIDATE) {
      console.log('[migrate-hash-recovery-pins] HINWEIS: Die PINs bleiben gültig, waren aber ggf. über frühere API-Antworten sichtbar. Für maximale Sicherheit erneut mit --invalidate ausführen.');
    }
  } catch (e) {
    console.error('[migrate-hash-recovery-pins] Fehler:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
