-- CreateTable
CREATE TABLE "slot_types" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3b98f8',
    "minVolunteers" INTEGER NOT NULL DEFAULT 2,
    "maxVolunteers" INTEGER NOT NULL DEFAULT 8,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "material_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'Stk',
    "done" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "material_items_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_shifts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "slot_type_id" INTEGER,
    "slot" TEXT NOT NULL DEFAULT '',
    "area_id" TEXT,
    "max_volunteers" INTEGER NOT NULL DEFAULT 8,
    "description" TEXT,
    CONSTRAINT "shifts_slot_type_id_fkey" FOREIGN KEY ("slot_type_id") REFERENCES "slot_types" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shifts_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_shifts" ("area_id", "date", "description", "id", "max_volunteers", "slot", "tournament_id") SELECT "area_id", "date", "description", "id", "max_volunteers", "slot", "tournament_id" FROM "shifts";
DROP TABLE "shifts";
ALTER TABLE "new_shifts" RENAME TO "shifts";
CREATE TABLE "new_tournaments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aktiv',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_tournaments" ("created_at", "description", "end_date", "id", "name", "start_date") SELECT "created_at", "description", "end_date", "id", "name", "start_date" FROM "tournaments";
DROP TABLE "tournaments";
ALTER TABLE "new_tournaments" RENAME TO "tournaments";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "slot_types_name_key" ON "slot_types"("name");
