/**
 * Überträgt die alte Einzelrolle (users.role) in die Tabelle user_roles.
 *
 * Idempotent: Nutzer, die dort bereits mindestens einen Eintrag haben, werden
 * übersprungen. Läuft bei jedem Start mit und ist nach der ersten Migration
 * praktisch ein No-Op.
 */
const { PrismaClient } = require('@prisma/client');

const GUELTIG = ['HELPER', 'ORGANIZER', 'ADMIN', 'TRAINER'];

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: { id: true, role: true, userRoles: { select: { id: true } } }
    });

    let uebertragen = 0;
    for (const u of users) {
      if (u.userRoles.length > 0) continue;

      // Alte Datenbestände konnten die Rolle als JSON-Array-String halten -
      // das deckt der Fallback in middleware/auth.ts bis heute ab.
      let rollen = [];
      if (typeof u.role === 'string' && GUELTIG.includes(u.role)) {
        rollen = [u.role];
      } else if (typeof u.role === 'string') {
        try {
          const geparst = JSON.parse(u.role);
          if (Array.isArray(geparst)) rollen = geparst.filter(r => GUELTIG.includes(r));
        } catch {
          // unlesbar -> Standardrolle
        }
      }
      if (rollen.length === 0) rollen = ['HELPER'];

      await prisma.userRole.createMany({
        data: rollen.map(role => ({ userId: u.id, role }))
      });
      uebertragen++;
    }

    console.log(`  [Rollen] ${uebertragen} Nutzer auf Mehrfachrollen übertragen (${users.length - uebertragen} bereits vorhanden).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(err => {
  console.error('  [Rollen] Backfill fehlgeschlagen:', err.message);
  process.exit(1);
});
