/*
  Prisma Migration: remove_accent_color

  Entfernt die Spalte "accent_color" aus der Tabelle "clubs".
  Die Spalte wurde im Schema entfernt (Vereinsfarbe + Aktionsfarbe = 2 Farben).
  
  SQLite erfordert Table-Recreation zum Löschen einer Spalte.
*/

PRAGMA foreign_keys=OFF;

BEGIN TRANSACTION;

-- Neue clubs-Tabelle ohne accent_color erstellen
CREATE TABLE "clubs_new" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
  "name" TEXT NOT NULL,
  "logo" TEXT,
  "primary_color" TEXT NOT NULL DEFAULT '#0d6efd',
  "secondary_color" TEXT NOT NULL DEFAULT '#6c757d',
  "city" TEXT
);

-- Daten kopieren (ohne accent_color)
INSERT INTO "clubs_new" ("id", "name", "logo", "primary_color", "secondary_color", "city")
SELECT "id", "name", "logo", "primary_color", "secondary_color", "city" FROM "clubs";

-- Alte Tabelle löschen und neue umbenennen
DROP TABLE "clubs";
ALTER TABLE "clubs_new" RENAME TO "clubs";

COMMIT;

PRAGMA foreign_keys=ON;
