# 📋 PROJECT MEMORY - Macht das Turnier!

## Projektübersicht
- **Name**: machdasturnier (ehemals "Turnier-Planer", vormals "TSV Holm Planungs Tool")
- **Repo**: https://github.com/peterphilipp/machdasturnier.git
- **Docker Image**: `machdasturnier` (GHCR)
- **Domain**: machdasturnier.mygate.dedyn.io

## Tech Stack
| Schicht | Technologie |
|---------|-------------|
| Frontend | React 18 + Vite + TypeScript |
| Backend | Express.js + tsx (TypeScript Runtime) |
| Datenbank | SQLite + Prisma ORM |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| E-Mail | Resend API (im .env der Produktion gesetzt) |
| Deployment | Docker Compose + GitHub Actions CI/CD (GHCR) |

## Architektur
- **Single Domain** mit URL-Routing: `?view=admin` → Admin, sonst SelfServiceView
- **Frontend**: React SPA (Vite dev auf Port 5173, prod via nginx)
- **Backend**: Express API auf Port 5000, tsx Runtime (`npx tsx src/server.ts`)
- **Datenbank**: SQLite `dev.db` persistent über Docker Volume

## Wichtige Dateipfade
```
backend/
  prisma/schema.prisma          # Datenmodell
  src/server.ts                 # Express Server + Route Registration
  src/auth.cjs                  # JWT Auth (CommonJS für bcrypt compatibility)
  src/controllers/*.controller.ts
  src/routes/*.routes.ts
frontend/
  src/App.tsx                   # URL-Routing: Admin vs SelfServiceView
  src/components/SelfServiceView.tsx  # 📱 Helfer-Portal (mobile-first)
  src/components/admin/stammdaten/   # 🖥️ Admin Stammdaten-Komponenten
    Vereine.tsx                 # Club Management + Logo-Farbanalyse
    Helfer.tsx                  # Volunteer CRUD
    Lebensmittel.tsx            # Food Categories/Items
    LebensmittelSlots.tsx       # Food Donation Slots Editor
    Jahrgaenge.tsx              # Year Groups Master Data
  src/components/admin/organisation/
    Buchungen.tsx               # Shift Management (Uebersicht)
    Jobslots.tsx                # Slot Creation
frontend/src/components/admin/shared.ts  # TypeScript Interfaces

docker-compose.yml              # Docker Compose Config
.github/workflows/deploy.yml    # CI/CD Pipeline
```

## Backend Runtime Rules
- **CMD**: `npx tsx src/server.ts` (NICHT compiled JS!)
- **Schema-Änderungen**: `prisma db push`, NICHT `migrate deploy` – Begründung und Absicherung im Abschnitt "🗄️ DATABASE MIGRATION STRATEGY"
- **Prisma DLL Locks**: Zuerst Node via Port/PID killen, dann `prisma generate`
- **Resend API**: Lazy-instantiate (`new Resend()`) nur wenn `RESEND_API_KEY` gesetzt

## Docker Rules
- Backend: Node 22, tsx Runtime, entrypoint mit Backup → Datenumbau-Skripte → `prisma db push`
- Frontend: Node 22, npm build → nginx
- Image Name: `machdasturnier` (lowercase für GHCR)
- SQLite Volume persistent über Docker

## Server Restart Rule (Windows)
```bash
netstat -ano | grep :<PORT> | awk '{print $5}' | head -n 1 | xargs -I {} taskkill //F //PID {} 2>&1
```
**NIEMALS** `taskkill //IM node.exe` oder WMIC verwenden!

## Vite HMR Cache Fix
Bei HMR-Fehlern: `rm -rf node_modules/.vite` + Node-Prozess killen.

---

# 📦 PRISMA SCHEMA

> **Die vollständige Modell-Übersicht steht in [`docs/datenmodell.md`](docs/datenmodell.md)
> und wird aus `backend/prisma/schema.prisma` erzeugt** — verbindlich ist immer das Schema.
> Neu erzeugen: `npm run docs:datamodel` im Ordner `backend`. Die CI prüft bei jedem Lauf,
> dass die Datei zum Schema passt.
>
> Diese Liste wurde früher von Hand gepflegt und stand irgendwann bei 17 Modellen,
> während das Schema 36 enthielt. Deshalb steht hier nur noch die Orientierung,
> welche Modelle den Kern ausmachen — nicht mehr deren Felder.

## Die tragenden Modelle

| Bereich | Modelle | Worum es geht |
|---------|---------|---------------|
| **Verein & Turnier** | `Club`, `Tournament` | Branding und der Rahmen, an dem fast alles hängt |
| **Spielbetrieb** | `YearGroup`, `Group`, `Team`, `Match`, `Field`, `StandingsEntry`, `KnockoutBracket` | Gruppenphase, Spielplan, Tabelle, K.-o.-Runde |
| **Helferplanung** | `WorkArea` → `TournamentWorkArea` → `Shift` → `VolunteerShift` | Katalog, Turnier-Kopie, konkrete Schicht, Zusage einer Person |
| **Tagesstruktur** | `GlobalDayTemplate`, `TemplateWorkArea`, `TournamentDay`, `DaySlot` | Vorlage eines Tagtyps und der daraus erzeugte Turniertag mit seinen Zeitfenstern |
| **Menschen** | `User`, `UserRoleEntry`, `VolunteerChild`, `Passkey`, `PushSubscription`, `UserNotification` | Konto, Mehrfachrollen, Kinder, Anmeldung, Benachrichtigung |
| **Verpflegung** | `FoodDonationSlot`, `FoodDonation`, `FoodItem`, `FoodCategory`, `ShoppingCatalogItem`, `ShoppingListItem` | Spendenaufrufe, Zusagen und Einkauf |

**Zwei Muster, die immer wieder auftauchen:**

1. **Katalog → Turnier-Kopie.** `WorkArea` (Stammdaten) wird beim Einrichten eines Turniers
   nach `TournamentWorkArea` kopiert. Änderungen am Katalog wirken damit nicht rückwirkend
   in laufende Turniere. `sourceWorkAreaId` hält die Herkunft fest.
2. **Ein `DaySlot` ist ein Zeitfenster des Tages**, pro Tag eindeutig über (Start, Ende).
   Welche Bereiche darin arbeiten, sagen die `Shift`-Einträge — nicht der Slot.

---

# 🎨 CLUB THEMING & LOGO ANALYSIS

## 3-Farben-Theming
- **Primary**: Header/Gradients
- **Secondary**: Buttons/Accents  
- **Accent**: Status/Highlights

## Logo Color Extraction (Vereine.tsx)
- Canvas-basierte Farbanalyse mit 4 Strategien:
  1. **Standard** (step=32, skip=8, minBrightness=50)
  2. **Grob** (step=64, skip=16, minBrightness=80) - weniger Farben
  3. **Fein** (step=16, skip=4, minBrightness=20) - mehr Nuancen
  4. **Kontrast** (step=48, skip=12, minBrightness=100) - hoher Kontrast

## Wichtige UX-Regeln
- Color-Picker zeigen **live** extrahierte Farben an (gebunden an `extractedColors`)
- `useEffect` sync't automatisch `extractedColors → clubForm` bei jeder Änderung
- Logo wird als Base64-DataURI gespeichert (`overflow: hidden` in rounded container)
- "✓ Übernehmen" kopiert angepasste Werte zurück zu `clubForm`

---

# 📱 SELF-SERVICE VIEW (Mobile-First)

## Features
- Login/Register mit JWT
- "Deine Schichten" + "Offene Schichten" mit SVG Icons (+, ✓, ↩️)
- Lebensmittel-Spenden nach Jahrgang gefiltert
- Hamburger-Menü für Profil/Passwort
- Club-Theming (Header gradient, Buttons, Status)

## Mobile CSS Rules
- Buttons mit SVG: `flexShrink: 0` auf Parent, `overflow: hidden` auf Button
- Shift Cards: `textOverflow: ellipsis`, right-aligned date/time
- Children Form: `flexWrap: wrap`, `minWidth: 140`, `width: 70`

---

# 🖥️ ADMIN VIEW (Desktop)

## Tab Structure
```
📊 Management Buchungen    → Uebersicht.tsx (collapsible helper details)
📋 Job-Slots               → Jobslots.tsx (bulk creation, multi-date/area)
🍞 Lebensmittel-Slots      → LebensmittelSlots.tsx (multi-year-group)

Stammdaten:
  🛡️ Vereine              → Vereine.tsx (club management + logo analysis)
  👥 Helfer                → Helfer.tsx (volunteer CRUD)
  🍞 Lebensmittel          → Lebensmittel.tsx (categories/items)
  🎓 Jahrgänge            → Jahrgaenge.tsx (year groups master data)
```

## Design Rules
- Desktop AdminView: Mobile-first SelfServiceView Design (gradients, rounded corners, cards)
- Tournament Selector: Über Organization-Sub-Navigation (nicht globaler Header)
- Keine Emojis in Haupt-Tabs (nur in Sub-Tabs/Icons)
- Bordered/Rounded Container für "Dienstplan & Zuweisung"

---

# 🔐 DSGVO/GDPR COMPLIANCE

## Implemented
- Einwilligungs-Checkbox in Registration
- Datenschutzerklärung `/privacy`
- Maskierte Reset-Token Logs
- Datenexport nach Art. 15 DSGVO (vorbereitet)
- Konto-Löschung & Widerruf (vorbereitet)
- Keine sensiblen Daten in Browser Console

## Children's Data (Art. 8 DSGVO)
- `childName` + `childYear` auf Volunteer
- `VolunteerChild` Model für mehrere Kinder pro Helfer
- Spendenfilterung nach Jahrgang

---

# 🗄️ DATABASE MIGRATION STRATEGY

> **Achtung, hier stand jahrelang das Gegenteil der Wahrheit.** Bis August 2026
> beschrieb dieser Abschnitt eine dreistufige `prisma migrate deploy`-Kette und
> verbot `db push` ausdrücklich. Gebaut war nie etwas davon — real lief an allen
> drei Stellen `db push`. Der Abschnitt beschreibt jetzt, was tatsächlich passiert.

## Wie es wirklich läuft: `prisma db push`

Das Schema wird per `prisma db push --accept-data-loss` synchronisiert, an drei
Stellen:

| Ort | Befehl |
|-----|--------|
| CI (`deploy.yml`, Test-Job) | `npx prisma db push --accept-data-loss` auf eine frische `ci.db` |
| Docker-Build (`Dockerfile`) | `RUN npx prisma db push --accept-data-loss` |
| Container-Start (`docker-entrypoint.sh`) | `npx prisma db push --accept-data-loss` |

Es gibt **keine** gepflegte Migrationskette. Unter
`backend/prisma/migrations/` liegt nur noch `20250102_full_init` als
historischer Rest; der Ordner ist seit den Mehrfachrollen nicht mehr aktuell
(ihm fehlen u.a. `user_roles`, `passkeys`, `user_notifications`) und wird von
nichts ausgeführt.

## Warum das so ist

Die alten Migrationen waren ad-hoc geschriebenes SQL und ergaben keine gültige
Kette von "leer → aktuelles Schema". `migrate deploy` konnte darauf nicht
aufsetzen. Statt die Kette zu reparieren, wurde auf `db push` umgestellt — die
Begründung steht als Kommentar im Workflow.

Für dieses Projekt ist das vertretbar: eine SQLite-Datei, eine Instanz, ein
Deploy-Kanal. Es ist eine bewusste Entscheidung, kein Versehen.

## Was das kostet — und was dagegen abgesichert ist

`--accept-data-loss` entfernt gelöschte Spalten kommentarlos. Es gibt keine
Schema-Historie und keinen Rollback per Migration. Dagegen stehen zwei Dinge:

1. **Backup vor jedem Schema-Push.** `scripts/backup-db.cjs` läuft im Entrypoint
   unmittelbar vor `db push`. Das ist der einzige Rückweg — behandle ihn
   entsprechend.
2. **Datenumbauten als eigene, idempotente Skripte** in `backend/scripts/`, die
   der Entrypoint in fester Reihenfolge ausführt. Alles, was `db push` nicht von
   allein richtig macht (Daten umhängen, Duplikate zusammenführen, Felder
   nachfüllen), gehört dorthin.

## Workflow: Schema-Änderung → Deployment

```
1. schema.prisma ändern
2. Braucht die Änderung einen Datenumbau?
   → Skript in backend/scripts/ schreiben, idempotent, mit Kommentar warum
   → im docker-entrypoint.sh einhängen
   → VOR dem "db push", wenn die Änderung sonst daran scheitert
     (z.B. neuer Unique-Index auf Daten, die noch Duplikate enthalten)
   → NACH dem "db push", wenn das Skript neue Spalten braucht
3. Lokal: npx prisma db push  (Node-Prozesse vorher killen, s.u.)
4. npm run docs:datamodel  → docs/datenmodell.md neu erzeugen und mitcommitten
5. Commit + Push; Release erst bei ausdrücklicher Freigabe taggen
```

## Datenumbau-Skripte (Reihenfolge wie im Entrypoint)

| Skript | Zweck | läuft |
|--------|-------|-------|
| `migrate-day-slot-system.cjs` | Altes Shift-Format auf Tag-/Slot-System | vor `db push` |
| `migrate-dedupe-day-slots.cjs` | Doppelte Zeitfenster je Tag zusammenführen | vor `db push` |
| `backfill-user-roles.cjs` | Einzelrolle → Mehrfachrollen-Tabelle | nach `db push` |
| `backfill-tournament-membership.cjs` | Mitgliedschaften aus Schichten/Spenden ableiten | nach `db push` |
| `migrate-hash-recovery-pins.cjs` | Recovery-PINs hashen | nach `db push` |
| `migrate-food-unit-liter.cjs` | Einheit `L` → `Liter` | nach `db push` |

Alle sind idempotent: ein zweiter Lauf ändert nichts mehr.

## SQLite-Hinweis

SQLite kann `ALTER TABLE ... DROP COLUMN` erst ab 3.35.0 (2021). `db push`
löst das selbst über Table Recreation — genau deshalb ist das Backup davor
nicht optional.

## Wenn du zurück auf Migrationen willst

Dann richtig: Baseline aus dem Ist-Schema erzeugen, als applied markieren, ab
dann ausschließlich `migrate dev` / `migrate deploy`, und `db push` überall
entfernen. Halbherzig ist schlechter als der jetzige ehrliche `db push` —
eine Kette, die niemand pflegt, hat genau in den Zustand geführt, der hier
aufgeräumt wurde.

---

# 🚀 DEPLOYMENT

## GitHub Secrets Required
- `DEPLOY_USER`: SSH Benutzername
- `DEPLOY_HOST`: Server IP/Domain
- `RESEND_API_KEY`: E-Mail API Key

## Docker Compose
```yaml
services:
  backend:
    build: ./backend
    ports: ["5000:5000"]
    volumes: ["./data:/app/data"]  # SQLite persistent
    environment:
      - RESEND_API_KEY=...
  
  frontend:
    build: ./frontend
    ports: ["8080:80"]
```

## CI/CD (GitHub Actions)
- Push nach `master` → baut Images → push zu GHCR → deploy auf Server
- Image Name: `machdasturnier` (lowercase!)

---

# 🐛 KNOWN ISSUES & FIXES

## Vite HMR Cache Corruption
- Symptom: `The requested module does not provide an export named 'default'`
- Fix: `rm -rf node_modules/.vite` + Node-Prozess killen via Port/PID

## Prisma DLL Locks (Windows)
- Symptom: `EPERM: operation not permitted, rename ... query_engine-windows.dll.node`
- Fix: Zuerst Node via Port/PID killen, dann `prisma generate`

## Docker SQLite Initialization
- Problem: Volume ist beim ersten Start leer
- Fix: Entrypoint legt das Schema per `prisma db push` an; das Backup davor darf beim Erststart fehlschlagen (`|| echo`), weil es noch keine DB gibt

## Resend API Crash on Startup
- Problem: `new Resend()` bei fehlendem Key crasht
- Fix: Lazy-instantiate nur wenn `RESEND_API_KEY` gesetzt + graceful fallback

---

# 📝 RECENT CHANGES (Last Commits)

| Commit | Message |
|--------|---------|
| ??? | feat: RBAC implementiert – UserContext, api.ts 403-Handling, requireAdmin Fix, App.tsx rollenbasiert |
| de8ae57 | fix: Farben werden automatisch beim Speichern übernommen (Auto-Sync) |
| 5f6caab | fix: Color-Picker zeigt extrahierte Farben live an |
| c19c068 | fix: Farbanalyse komplett neu geschrieben mit Debug-Logging |

---

# 🔐 RBAC (Role-Based Access Control) – IMPLEMENTIERT

## Rollen-System
> Rolle ist ein **einzelnes** Feld `User.role` (kein `roles`-JSON-Array). Werte: `HELPER` / `ORGANIZER` / `ADMIN`.

| Rolle | Key (`role`) | Berechtigungen |
|-------|-----|----------------|
| Admin | `ADMIN` | Vollzugriff auf alles, kann andere Admins erstellen |
| Organisator | `ORGANIZER` | Vollzugriff auf Admin-Bereich (kein User-Management) |
| Helfer | `HELPER` | Nur SelfServiceView (Jobs, Verpflegung, Profil) |

## Backend Implementation
- **`backend/src/utils/roles.ts`**: Rollen-Definitionen + Helper-Funktionen (`isAdminRole`, `hasRole`)
- **`backend/src/middleware/auth.ts`**:
  - `authenticate()`: Prüft JWT + hängt volunteerId an req
  - `requireRole(requiredRoles)`: Prüft JWT + DB-Rollen gegen requiredRoles
  - `requireAdmin()`: Prüft JWT + Admin/Organisator Rolle (NEU: prüft jetzt wirklich Rollen!)
- **`backend/src/routes/password.routes.ts`**: Login gibt die Rolle im JWT mit (`jwt.sign({ userId, role })`); Passwort-Hash wird nie ausgeliefert
- **Alle Admin-Routes** geschützt mit `authenticate` + `requireAdmin`; JWT_SECRET ist Pflicht (Fail-Fast, kein Default)

## Frontend Implementation
- **`frontend/src/context/UserContext.tsx`**: 
  - `UserProvider`: Wrappt App, liest token/volunteer aus localStorage
  - `useUser()`: Hook für `isLoggedIn`, `roles`, `isAdmin`, `isOrganizer`, `login()`, `logout()`
- **`frontend/src/api.ts`**:
  - `setAuthToken(token)`: Setzt globalen Token für API-Calls
  - `ApiError` mit `.status` property (401, 403)
  - Automatische Token-Injection in alle apiFetch calls
- **`frontend/src/App.tsx`**:
  - AdminView: Nur sichtbar wenn `isAdmin || isOrganizer`
  - Helfer sieht "Zugriff verweigert" Screen statt Admin-Tabs
  - Rollen-Badge im Header (👑 Admin / 🔧 Organisator)
  - 401 → Auto-Logout + Redirect zu SelfService
  - 403 → Fehleranzeige mit "Erneut versuchen"

## Wichtige Regeln
- **Nie** `requireAdmin` ohne `authenticate` kombinieren (redundant!)
- **Immer** `requireRole(['HELPER'])` für SelfService-Routes verwenden
- Register endpoint setzt `role: 'HELPER'` (bzw. `ADMIN` für ersten Nutzer / `ADMIN_EMAILS`)
- Admin/Organizer können die Rolle über Helfer.tsx ändern

## Datenbank & Sync
- **SQLite** (`file:./prisma/data/dev.db`) — KEIN PostgreSQL!
- DATABASE_URL im `.env`: `"file:./prisma/data/dev.db"`
- **CRITICAL**: Backend server muss vor `npx prisma generate` gestoppt werden (File-Locks)
- **DB-Sync Prod → Test**: SQLite DB kopieren via `cp data/dev.db /path/to/test/db`
  - Oder: `sqlite3 dev.db ".dump" | sqlite3 test-db.sqlite`
  - Kein pg_dump/psql — das war ein falscher Assumpt!
- **DB-Pfade prüfen** vor jeglichen DB-Operationen
- **Admin DB-Management**: Neuer Tab "🗄️ DB-Management" im Stammdaten-Bereich (nur Admins)
  - Backend: `GET /api/admin/db/dump` → Base64-encoded SQLite DB
  - Backend: `POST /api/admin/db/import` → Base64-encoded DB importieren
  - Frontend: `DbManagement.tsx` mit Download/Upload-Buttons
  - Geschützt mit `authenticate()` + `requireAdmin()`
  - Import erstellt automatisch Backup (`backup-{timestamp}.db`)

## Shift maxVolunteers Issue
- Anzeige "X/Y" in SelfServiceView = `remaining/maxVolunteers` (noch frei / insgesamt)
- `maxVolunteers` kommt aus der **Shift-Tabelle**, NICHT aus dem WorkArea-Katalog
- Katalog-Wert (`workArea.maxVolunteers`) wird beim Generieren übernommen, kann aber manuell überschrieben werden
- Produktion hatte Shift #211 mit `maxVol=5`, lokal keine Schichten → unterschiedliche Anzeige
- **Code ist korrekt** — Differenz kommt ausschließlich aus DB-Zuständen

---

# 🔄 NEXT STEPS

1. **[DONE]** Migration Strategy dokumentiert + accentColor entfernt + deploy.yml/Docker/entrypoint aktualisiert
2. **Backend restart** um neuen Prisma Client zu laden (accentColor entfernt)
3. **Docker Rebuild**: `docker compose up -d --build` für Production-Deploy
4. **Testing**: Barcode-Scan mit OFF hierarchy mapping testen
5. **Monitoring**: v1.10.22 push reminder behavior beobachten

---

# ⚠️ WICHTIGE REGELN (User Preferences)

## UI/UX Regeln
- **Keine browser-native `alert()` oder `confirm()` verwenden!** Immer das bestehende `modal.alert()` System aus `../Modal` nutzen
- Modal-System: `import { modal } from '../Modal'` → `await modal.alert({ title, message })`
- Alle UI-Meldungen müssen als modale Dialoge dargestellt werden (keine systemstandard Popups)
- **Nicht-interaktiv**: Keine `prompt()` oder native Browser-Dialoge

## Debugging/Loop Rules
- Bei wiederholten Loop-Warnungen des Users: Sofort die Loop unterbrechen und direkt implementieren
- Nicht mehrere Male dieselben grep-Befehle ausführen - direkt zum Fix übergehen

## Release Rules
- **Niemals eigenmächtig Releases erstellen!**
- Nur auf explizites User-Kommando "Release" hin ein Release durchführen (tag + push)
- Vor einem Release immer kurz den Commit-Zusammenfassung nennen und auf Freigabe warten
