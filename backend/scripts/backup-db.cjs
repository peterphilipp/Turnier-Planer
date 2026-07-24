/**
 * Legt vor (potenziell destruktiven) DB-Operationen ein Backup der SQLite-Datei an.
 * Aufruf: node --env-file=.env scripts/backup-db.cjs   (bzw. `npm run db:backup`)
 *
 * Löst den DB-Pfad genauso auf wie Prisma: relative file:-URLs relativ zum
 * Schema-Verzeichnis (backend/prisma). Behält die letzten MAX_BACKUPS Sicherungen.
 */
const fs = require('fs');
const path = require('path');

const MAX_BACKUPS = 20;
const schemaDir = path.resolve(__dirname, '..', 'prisma');

const url = process.env.DATABASE_URL || 'file:./prisma/data/dev.db';
if (!url.startsWith('file:')) {
  console.error('[backup] Nur SQLite (file:) wird unterstützt, DATABASE_URL =', url);
  process.exit(1);
}
const rel = url.slice('file:'.length);
const dbPath = path.isAbsolute(rel) ? rel : path.resolve(schemaDir, rel);

if (!fs.existsSync(dbPath)) {
  console.error('[backup] DB-Datei nicht gefunden:', dbPath);
  process.exit(1);
}

const backupDir = path.resolve(schemaDir, 'backups');
fs.mkdirSync(backupDir, { recursive: true });

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dest = path.join(backupDir, `dev-${stamp}.db`);
fs.copyFileSync(dbPath, dest);
// WAL/SHM (falls vorhanden) für konsistente Kopie mitsichern
for (const suffix of ['-wal', '-shm']) {
  if (fs.existsSync(dbPath + suffix)) fs.copyFileSync(dbPath + suffix, dest + suffix);
}
console.log('[backup] ✅ gesichert ->', path.relative(process.cwd(), dest));

// Aufräumen: nur die neuesten MAX_BACKUPS behalten
const backups = fs.readdirSync(backupDir).filter(f => /^dev-.*\.db$/.test(f)).sort();
for (const f of backups.slice(0, Math.max(0, backups.length - MAX_BACKUPS))) {
  fs.rmSync(path.join(backupDir, f), { force: true });
  fs.rmSync(path.join(backupDir, f + '-wal'), { force: true });
  fs.rmSync(path.join(backupDir, f + '-shm'), { force: true });
}
