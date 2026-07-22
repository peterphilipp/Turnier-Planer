-- CreateTable
CREATE TABLE "tournaments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "groups" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "tournament_id" INTEGER NOT NULL,
    CONSTRAINT "groups_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "teams" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "group_id" INTEGER NOT NULL,
    "goals_for" INTEGER NOT NULL DEFAULT 0,
    "goals_against" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "teams_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "matches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "team_a_id" INTEGER NOT NULL,
    "team_b_id" INTEGER NOT NULL,
    "score_a" INTEGER,
    "score_b" INTEGER,
    "field" TEXT NOT NULL DEFAULT 'Feld 1',
    "time" DATETIME NOT NULL,
    CONSTRAINT "matches_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "matches_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "teams" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "volunteers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "roles" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "volunteer_shifts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "volunteer_id" INTEGER NOT NULL,
    "tournament_id" INTEGER,
    "date" DATETIME NOT NULL,
    "slot" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "area_id" TEXT,
    CONSTRAINT "volunteer_shifts_volunteer_id_fkey" FOREIGN KEY ("volunteer_id") REFERENCES "volunteers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "volunteer_shifts_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "slot" TEXT NOT NULL,
    "area_id" TEXT,
    "max_volunteers" INTEGER NOT NULL DEFAULT 8,
    "description" TEXT,
    CONSTRAINT "shifts_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "area_configs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "area_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "min_volunteers" INTEGER NOT NULL DEFAULT 2,
    "max_volunteers" INTEGER NOT NULL DEFAULT 8,
    "color" TEXT NOT NULL DEFAULT '#3b98f8'
);

-- CreateIndex
CREATE UNIQUE INDEX "area_configs_area_id_key" ON "area_configs"("area_id");
