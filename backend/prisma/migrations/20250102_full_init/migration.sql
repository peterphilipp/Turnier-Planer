-- CreateTable
CREATE TABLE "tournaments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'aktiv',
    "turnier_modus" TEXT NOT NULL DEFAULT 'GRUPPEN_KO',
    "teams_advancing_per_group" INTEGER NOT NULL DEFAULT 2,
    "playout_all_placements" BOOLEAN NOT NULL DEFAULT false,
    "third_place_match" BOOLEAN NOT NULL DEFAULT true,
    "qualification_rule" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "club_id" INTEGER,
    "logo" TEXT,
    "has_sponsor" BOOLEAN NOT NULL DEFAULT false,
    "sponsor_name" TEXT,
    "sponsor_url" TEXT,
    "estimated_visitors" INTEGER,
    "team_count" INTEGER,
    CONSTRAINT "tournaments_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tournament_memberships" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "tournament_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tournament_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tournament_memberships_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "clubs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "primary_color" TEXT NOT NULL DEFAULT '#0d6efd',
    "secondary_color" TEXT NOT NULL DEFAULT '#6c757d',
    "city" TEXT
);

-- CreateTable
CREATE TABLE "groups" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "tournament_id" INTEGER NOT NULL,
    "year_group_id" INTEGER,
    CONSTRAINT "groups_year_group_id_fkey" FOREIGN KEY ("year_group_id") REFERENCES "year_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "groups_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "teams" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "group_id" INTEGER,
    "tournament_id" INTEGER,
    "year_group_id" INTEGER,
    "club_id" INTEGER,
    "goals_for" INTEGER NOT NULL DEFAULT 0,
    "goals_against" INTEGER NOT NULL DEFAULT 0,
    "bracket_typ" TEXT,
    CONSTRAINT "teams_year_group_id_fkey" FOREIGN KEY ("year_group_id") REFERENCES "year_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "teams_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "teams_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "teams_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "matches" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "year_group_id" INTEGER,
    "bracket_id" INTEGER,
    "time_slot_id" INTEGER,
    "field_id" INTEGER,
    "team_a_id" INTEGER,
    "team_b_id" INTEGER,
    "placeholder_a" TEXT,
    "placeholder_b" TEXT,
    "score_a" INTEGER,
    "score_b" INTEGER,
    "phase" TEXT NOT NULL DEFAULT 'Gruppenphase',
    "runde" TEXT,
    "bracket_typ" TEXT,
    "sieger_id" INTEGER,
    "verlierer_id" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'geplant',
    "time" DATETIME NOT NULL,
    "lower_bound" INTEGER,
    "stage" INTEGER,
    "upper_bound" INTEGER,
    CONSTRAINT "matches_year_group_id_fkey" FOREIGN KEY ("year_group_id") REFERENCES "year_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "matches_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "matches_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "matches_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "fields" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "matches_time_slot_id_fkey" FOREIGN KEY ("time_slot_id") REFERENCES "time_slots" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "matches_bracket_id_fkey" FOREIGN KEY ("bracket_id") REFERENCES "knockout_brackets" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "password" TEXT,
    "role" TEXT NOT NULL DEFAULT 'HELPER',
    "tournament_id" INTEGER,
    "consent_given" BOOLEAN NOT NULL DEFAULT false,
    "consent_date" DATETIME,
    "recovery_pin" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_login_at" DATETIME,
    "last_activity_at" DATETIME,
    CONSTRAINT "users_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "webauthn_credentials" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "transports" TEXT,
    "device_type" TEXT,
    "backed_up" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "webauthn_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "volunteer_children" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "child_name" TEXT NOT NULL,
    "child_year" INTEGER NOT NULL,
    CONSTRAINT "volunteer_children_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "volunteer_shifts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "tournament_id" INTEGER,
    "shift_id" INTEGER,
    "date" DATETIME NOT NULL,
    "slot" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "area_id" TEXT,
    "rating_workload" INTEGER,
    "rating_organization" INTEGER,
    "rating_fun" INTEGER,
    "rating_comment" TEXT,
    "reminder_sent_before" BOOLEAN NOT NULL DEFAULT false,
    "thanks_sent_after" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "volunteer_shifts_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "volunteer_shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "volunteer_shifts_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "arbeitsbereiche" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '📍',
    "order" INTEGER NOT NULL DEFAULT 0,
    "min_volunteers" INTEGER NOT NULL DEFAULT 2,
    "max_volunteers" INTEGER NOT NULL DEFAULT 8,
    "color" TEXT NOT NULL DEFAULT '#3b98f8',
    "operating_start_min" INTEGER,
    "operating_end_min" INTEGER,
    "is_standard" BOOLEAN NOT NULL DEFAULT false,
    "is_obsolete" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "global_day_templates" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "is_obsolete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "work_area_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#e7f1ff',
    "is_obsolete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "global_day_slots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "template_id" INTEGER NOT NULL,
    "start_min" INTEGER NOT NULL,
    "end_min" INTEGER NOT NULL,
    "label" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b98f8',
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "global_day_slots_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "global_day_templates" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "global_day_slot_work_areas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "global_slot_id" INTEGER NOT NULL,
    "work_area_id" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "global_day_slot_work_areas_global_slot_id_fkey" FOREIGN KEY ("global_slot_id") REFERENCES "global_day_slots" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "global_day_slot_work_areas_work_area_id_fkey" FOREIGN KEY ("work_area_id") REFERENCES "arbeitsbereiche" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tournament_work_areas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "source_work_area_id" INTEGER,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '📍',
    "order" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#3b98f8',
    "min_volunteers" INTEGER NOT NULL DEFAULT 2,
    "max_volunteers" INTEGER NOT NULL DEFAULT 8,
    "operating_start_min" INTEGER,
    "operating_end_min" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "tournament_work_areas_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tournament_days" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT,
    "source_template_id" INTEGER,
    CONSTRAINT "tournament_days_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tournament_day_work_areas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "tournament_day_id" INTEGER NOT NULL,
    "tournament_work_area_id" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "target_helpers" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "tournament_day_work_areas_tournament_day_id_fkey" FOREIGN KEY ("tournament_day_id") REFERENCES "tournament_days" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tournament_day_work_areas_tournament_work_area_id_fkey" FOREIGN KEY ("tournament_work_area_id") REFERENCES "tournament_work_areas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "day_slots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_day_id" INTEGER NOT NULL,
    "start_min" INTEGER NOT NULL,
    "end_min" INTEGER NOT NULL,
    "label" TEXT,
    "color" TEXT NOT NULL DEFAULT '#3b98f8',
    "order" INTEGER NOT NULL DEFAULT 0,
    "source_global_slot_id" INTEGER,
    CONSTRAINT "day_slots_tournament_day_id_fkey" FOREIGN KEY ("tournament_day_id") REFERENCES "tournament_days" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "tournament_day_id" INTEGER NOT NULL,
    "day_slot_id" INTEGER NOT NULL,
    "tournament_work_area_id" INTEGER NOT NULL,
    "start_min" INTEGER,
    "end_min" INTEGER,
    "min_volunteers" INTEGER NOT NULL DEFAULT 2,
    "max_volunteers" INTEGER NOT NULL DEFAULT 8,
    "description" TEXT,
    CONSTRAINT "shifts_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shifts_tournament_day_id_fkey" FOREIGN KEY ("tournament_day_id") REFERENCES "tournament_days" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shifts_day_slot_id_fkey" FOREIGN KEY ("day_slot_id") REFERENCES "day_slots" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shifts_tournament_work_area_id_fkey" FOREIGN KEY ("tournament_work_area_id") REFERENCES "tournament_work_areas" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER,
    "token" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "food_categories" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🍽️',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "food_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "price" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'Stk',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "food_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "food_categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "food_donations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "food_donation_slot_id" INTEGER,
    "food_item_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "food_donations_food_donation_slot_id_fkey" FOREIGN KEY ("food_donation_slot_id") REFERENCES "food_donation_slots" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "food_donations_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "food_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "food_donations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "food_donations_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "year_groups" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "birth_year_start" INTEGER NOT NULL,
    "birth_year_end" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "food_donation_slots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "year_group_id" INTEGER,
    "food_item_id" INTEGER,
    "target_quantity" INTEGER NOT NULL DEFAULT 0,
    "collected" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" INTEGER,
    CONSTRAINT "food_donation_slots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "food_donation_slots_food_item_id_fkey" FOREIGN KEY ("food_item_id") REFERENCES "food_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "food_donation_slots_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "food_donation_slots_year_group_id_fkey" FOREIGN KEY ("year_group_id") REFERENCES "year_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shopping_catalog_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'Stk',
    "barcode" TEXT,
    "food_category_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shopping_catalog_items_food_category_id_fkey" FOREIGN KEY ("food_category_id") REFERENCES "food_categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shopping_list_items" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "catalog_item_id" INTEGER NOT NULL,
    "planned_quantity" INTEGER NOT NULL DEFAULT 0,
    "purchased_quantity" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shopping_list_items_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shopping_list_items_catalog_item_id_fkey" FOREIGN KEY ("catalog_item_id") REFERENCES "shopping_catalog_items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "time_slots" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "year_group_id" INTEGER,
    "date" DATETIME NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "label" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "time_slots_year_group_id_fkey" FOREIGN KEY ("year_group_id") REFERENCES "year_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "time_slots_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "fields" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "year_group_id" INTEGER,
    "name" TEXT NOT NULL DEFAULT 'Feld 1',
    "status" TEXT NOT NULL DEFAULT 'verfügbar',
    CONSTRAINT "fields_year_group_id_fkey" FOREIGN KEY ("year_group_id") REFERENCES "year_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "fields_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "knockout_brackets" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "year_group_id" INTEGER,
    "name" TEXT NOT NULL,
    "runde" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "knockout_brackets_year_group_id_fkey" FOREIGN KEY ("year_group_id") REFERENCES "year_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "knockout_brackets_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "standings_entries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "team_id" INTEGER NOT NULL,
    "tournament_id" INTEGER NOT NULL,
    "played" INTEGER NOT NULL DEFAULT 0,
    "won" INTEGER NOT NULL DEFAULT 0,
    "drawn" INTEGER NOT NULL DEFAULT 0,
    "lost" INTEGER NOT NULL DEFAULT 0,
    "goals_for" INTEGER NOT NULL DEFAULT 0,
    "goals_against" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "standings_entries_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "standings_entries_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tournament_clubs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "tournament_id" INTEGER NOT NULL,
    "club_id" INTEGER NOT NULL,
    CONSTRAINT "tournament_clubs_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tournament_clubs_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_TournamentYearGroups" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_TournamentYearGroups_A_fkey" FOREIGN KEY ("A") REFERENCES "tournaments" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_TournamentYearGroups_B_fkey" FOREIGN KEY ("B") REFERENCES "year_groups" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_WorkAreaToCategories" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_WorkAreaToCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "arbeitsbereiche" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_WorkAreaToCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "work_area_categories" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "tournament_memberships_user_id_idx" ON "tournament_memberships"("user_id");

-- CreateIndex
CREATE INDEX "tournament_memberships_tournament_id_idx" ON "tournament_memberships"("tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_memberships_user_id_tournament_id_key" ON "tournament_memberships"("user_id", "tournament_id");

-- CreateIndex
CREATE INDEX "groups_tournament_id_idx" ON "groups"("tournament_id");

-- CreateIndex
CREATE INDEX "groups_year_group_id_idx" ON "groups"("year_group_id");

-- CreateIndex
CREATE INDEX "teams_tournament_id_idx" ON "teams"("tournament_id");

-- CreateIndex
CREATE INDEX "teams_group_id_idx" ON "teams"("group_id");

-- CreateIndex
CREATE INDEX "teams_year_group_id_idx" ON "teams"("year_group_id");

-- CreateIndex
CREATE INDEX "teams_club_id_idx" ON "teams"("club_id");

-- CreateIndex
CREATE INDEX "matches_tournament_id_idx" ON "matches"("tournament_id");

-- CreateIndex
CREATE INDEX "matches_year_group_id_idx" ON "matches"("year_group_id");

-- CreateIndex
CREATE INDEX "matches_bracket_id_idx" ON "matches"("bracket_id");

-- CreateIndex
CREATE INDEX "matches_team_a_id_idx" ON "matches"("team_a_id");

-- CreateIndex
CREATE INDEX "matches_team_b_id_idx" ON "matches"("team_b_id");

-- CreateIndex
CREATE INDEX "matches_field_id_idx" ON "matches"("field_id");

-- CreateIndex
CREATE INDEX "matches_time_slot_id_idx" ON "matches"("time_slot_id");

-- CreateIndex
CREATE INDEX "users_tournament_id_idx" ON "users"("tournament_id");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "webauthn_credentials_credential_id_key" ON "webauthn_credentials"("credential_id");

-- CreateIndex
CREATE INDEX "webauthn_credentials_user_id_idx" ON "webauthn_credentials"("user_id");

-- CreateIndex
CREATE INDEX "volunteer_children_user_id_idx" ON "volunteer_children"("user_id");

-- CreateIndex
CREATE INDEX "volunteer_shifts_user_id_idx" ON "volunteer_shifts"("user_id");

-- CreateIndex
CREATE INDEX "volunteer_shifts_tournament_id_idx" ON "volunteer_shifts"("tournament_id");

-- CreateIndex
CREATE INDEX "volunteer_shifts_shift_id_idx" ON "volunteer_shifts"("shift_id");

-- CreateIndex
CREATE UNIQUE INDEX "work_area_categories_name_key" ON "work_area_categories"("name");

-- CreateIndex
CREATE INDEX "global_day_slots_template_id_idx" ON "global_day_slots"("template_id");

-- CreateIndex
CREATE INDEX "global_day_slot_work_areas_work_area_id_idx" ON "global_day_slot_work_areas"("work_area_id");

-- CreateIndex
CREATE UNIQUE INDEX "global_day_slot_work_areas_global_slot_id_work_area_id_key" ON "global_day_slot_work_areas"("global_slot_id", "work_area_id");

-- CreateIndex
CREATE INDEX "tournament_work_areas_tournament_id_idx" ON "tournament_work_areas"("tournament_id");

-- CreateIndex
CREATE INDEX "tournament_days_tournament_id_idx" ON "tournament_days"("tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_days_tournament_id_date_key" ON "tournament_days"("tournament_id", "date");

-- CreateIndex
CREATE INDEX "tournament_day_work_areas_tournament_id_idx" ON "tournament_day_work_areas"("tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_day_work_areas_tournament_day_id_tournament_work_area_id_key" ON "tournament_day_work_areas"("tournament_day_id", "tournament_work_area_id");

-- CreateIndex
CREATE INDEX "day_slots_tournament_day_id_idx" ON "day_slots"("tournament_day_id");

-- CreateIndex
CREATE INDEX "shifts_tournament_id_idx" ON "shifts"("tournament_id");

-- CreateIndex
CREATE INDEX "shifts_tournament_day_id_idx" ON "shifts"("tournament_day_id");

-- CreateIndex
CREATE INDEX "shifts_day_slot_id_idx" ON "shifts"("day_slot_id");

-- CreateIndex
CREATE INDEX "shifts_tournament_work_area_id_idx" ON "shifts"("tournament_work_area_id");

-- CreateIndex
CREATE INDEX "material_items_tournament_id_idx" ON "material_items"("tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "food_items_category_id_idx" ON "food_items"("category_id");

-- CreateIndex
CREATE INDEX "food_donations_tournament_id_idx" ON "food_donations"("tournament_id");

-- CreateIndex
CREATE INDEX "food_donations_user_id_idx" ON "food_donations"("user_id");

-- CreateIndex
CREATE INDEX "food_donations_food_donation_slot_id_idx" ON "food_donations"("food_donation_slot_id");

-- CreateIndex
CREATE INDEX "food_donations_food_item_id_idx" ON "food_donations"("food_item_id");

-- CreateIndex
CREATE INDEX "food_donation_slots_user_id_idx" ON "food_donation_slots"("user_id");

-- CreateIndex
CREATE INDEX "food_donation_slots_year_group_id_idx" ON "food_donation_slots"("year_group_id");

-- CreateIndex
CREATE INDEX "food_donation_slots_food_item_id_idx" ON "food_donation_slots"("food_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "food_donation_slots_tournament_id_year_group_id_food_item_id_key" ON "food_donation_slots"("tournament_id", "year_group_id", "food_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_catalog_items_barcode_key" ON "shopping_catalog_items"("barcode");

-- CreateIndex
CREATE INDEX "shopping_catalog_items_barcode_idx" ON "shopping_catalog_items"("barcode");

-- CreateIndex
CREATE INDEX "shopping_catalog_items_food_category_id_idx" ON "shopping_catalog_items"("food_category_id");

-- CreateIndex
CREATE INDEX "shopping_list_items_tournament_id_idx" ON "shopping_list_items"("tournament_id");

-- CreateIndex
CREATE INDEX "shopping_list_items_catalog_item_id_idx" ON "shopping_list_items"("catalog_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "shopping_list_items_tournament_id_catalog_item_id_key" ON "shopping_list_items"("tournament_id", "catalog_item_id");

-- CreateIndex
CREATE INDEX "time_slots_tournament_id_idx" ON "time_slots"("tournament_id");

-- CreateIndex
CREATE INDEX "time_slots_year_group_id_idx" ON "time_slots"("year_group_id");

-- CreateIndex
CREATE INDEX "fields_tournament_id_idx" ON "fields"("tournament_id");

-- CreateIndex
CREATE INDEX "fields_year_group_id_idx" ON "fields"("year_group_id");

-- CreateIndex
CREATE INDEX "knockout_brackets_tournament_id_idx" ON "knockout_brackets"("tournament_id");

-- CreateIndex
CREATE INDEX "knockout_brackets_year_group_id_idx" ON "knockout_brackets"("year_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "standings_entries_team_id_key" ON "standings_entries"("team_id");

-- CreateIndex
CREATE INDEX "standings_entries_tournament_id_idx" ON "standings_entries"("tournament_id");

-- CreateIndex
CREATE UNIQUE INDEX "standings_entries_team_id_tournament_id_key" ON "standings_entries"("team_id", "tournament_id");

-- CreateIndex
CREATE INDEX "tournament_clubs_club_id_idx" ON "tournament_clubs"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_clubs_tournament_id_club_id_key" ON "tournament_clubs"("tournament_id", "club_id");

-- CreateIndex
CREATE UNIQUE INDEX "_TournamentYearGroups_AB_unique" ON "_TournamentYearGroups"("A", "B");

-- CreateIndex
CREATE INDEX "_TournamentYearGroups_B_index" ON "_TournamentYearGroups"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_WorkAreaToCategories_AB_unique" ON "_WorkAreaToCategories"("A", "B");

-- CreateIndex
CREATE INDEX "_WorkAreaToCategories_B_index" ON "_WorkAreaToCategories"("B");

