# 📋 PROJECT MEMORY - Turnier-Planer

## Projektübersicht
- **Name**: Turnier-Planer (ehemals "TSV Holm Planungs Tool")
- **Repo**: https://github.com/peterphilipp/Turnier-Planer.git
- **Docker Image**: `turnier-planer` (GHCR)
- **Domain**: turnier-planer.mygate.dedyn.io

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
- **Migrations**: Immer `prisma db push` (kein `prisma migrate dev`)
- **Prisma DLL Locks**: Zuerst Node via Port/PID killen, dann `prisma generate`
- **Resend API**: Lazy-instantiate (`new Resend()`) nur wenn `RESEND_API_KEY` gesetzt

## Docker Rules
- Backend: Node 22, tsx Runtime, entrypoint mit `prisma db push`
- Frontend: Node 22, npm build → nginx
- Image Name: `turnier-planer` (lowercase für GHCR)
- SQLite Volume persistent über Docker

## Server Restart Rule (Windows)
```bash
netstat -ano | grep :<PORT> | awk '{print $5}' | head -n 1 | xargs -I {} taskkill //F //PID {} 2>&1
```
**NIEMALS** `taskkill //IM node.exe` oder WMIC verwenden!

## Vite HMR Cache Fix
Bei HMR-Fehlern: `rm -rf node_modules/.vite` + Node-Prozess killen.

---

# 📦 PRISMA SCHEMA (17 Models)

## Core Entities
| Model | Beschreibung | Wichtige Felder |
|-------|-------------|-----------------|
| **Club** | Verein mit Branding | `name`, `logo` (Base64), `primaryColor`, `secondaryColor`, `accentColor` |
| **Tournament** | Turnier | `name`, `startDate`, `endDate`, `status` (aktiv/beendet/archiviert), `clubId` FK |
| **Group** | Gruppe | `name`, `tournamentId` FK |
| **Team** | Mannschaft | `name`, `groupId` FK, `goalsFor`, `goalsAgainst` |
| **Match** | Begegnung | `teamAId`, `teamBId`, `scoreA/B`, `field`, `time` |

## Scheduler Entities
| Model | Beschreibung | Wichtige Felder |
|-------|-------------|-----------------|
| **Arbeitsbereich** | Physische Station | `name`, `icon`, `minVolunteers`, `maxVolunteers`, `color` |
| **Zeitslot** | Zeitfenster | `name`, `startTime`, `endTime`, `color`, `order` |
| **Shift** | Konkreter Job-Slot | `tournamentId`, `date`, `zeitslotId` FK, `arbeitsbereichId` FK, `maxVolunteers` |

## User / Helfer Entities
> Verbindlich: `backend/prisma/schema.prisma`. Die Helfer-Entität heißt im Code **`User`** (Tabelle `users`), nicht `Volunteer`.

| Model | Beschreibung | Wichtige Felder |
|-------|-------------|-----------------|
| **User** | Helferin/Helfer | `name`, `email`, `phone`, `password` (bcrypt), `role` (Enum-artig: `HELPER`/`ORGANIZER`/`ADMIN`), `isPrimaryAdmin`, `consentGiven`/`consentDate`, `tournamentId` FK |
| **UserChild** | Kind einer Helferin | `userId` FK, `childName`, `childYear` |
| **VolunteerShift** | Zuweisung | `userId` FK, `shiftId` FK, `tournamentId` FK, `date`, `slot`, `role`, `areaId` |

## Food Donation Entities
| Model | Beschreibung | Wichtige Felder |
|-------|-------------|-----------------|
| **FoodCategory** | Kategorie | `name`, `icon`, `order` |
| **FoodItem** | Artikel | `categoryId` FK, `name`, `price`, `unit` |
| **YearGroup** | Jahrgang | `name`, `birthYearStart`, `birthYearEnd`, `order`, `isActive` |
| **FoodDonationSlot** | Spenden-Ziel | `tournamentId`, `yearGroupId` FK, `foodItemId` FK, `targetQuantity`, `collected` (auto-increment) |
| **FoodDonation** | Konkrete Spende | `tournamentId`, `volunteerId` FK, `slotId` FK, `foodItemId` FK, `quantity`, `note` |

## Other Entities
| Model | Beschreibung | Wichtige Felder |
|-------|-------------|-----------------|
| **MaterialItem** | Materialgegenstand | `tournamentId`, `name`, `quantity`, `unit`, `done` |
| **PasswordResetToken** | Reset-Token | `volunteerId` FK, `token` (unique), `expiresAt`, `used` |

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
- Image Name: `turnier-planer` (lowercase!)

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
- Fix: Entrypoint Script mit `prisma db push` vor Server-Start

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

---

# 🔄 NEXT STEPS

1. **Vereine.tsx Layout**: Logo-Upload und Farbanalyse eine Zeile nach unten verschieben (Editzeile zu voll)
2. **Docker Rebuild**: `docker compose up -d --build` um alle Änderungen zu deployen
3. **Testing**: RBAC mit verschiedenen User-Rollen testen
4. **Admin-User erstellen**: curl POST /api/auth/register mit manuellem roles-Feld (oder über Helfer.tsx nachträglich)

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
