# ⚽ Turnier-Planer

Webanwendung zur Planung von Fußballturnieren, Verwaltung von Helfer-Dienstplänen und Koordination von Lebensmittel-Spenden.

## Features
- ✅ Turniere, Gruppen & Spielplan erstellen
- ✅ Ergebnisse live pflegen
- 👥 Wochen-Dienstplan für Helfer mit Drag & Drop
- 🍞 Lebensmittel-Spendenmanagement (Jahrgang-basiert)
- 🏅 Vereinsbranding (3-Farben-Theming + Logo)
- 🔐 SelfService-Portal für Helfer (Login, Buchung, Spenden)
- 📧 Passwort-zurücksetzen per E-Mail (Resend)
- 🐳 Dockerized (Backend + Frontend)
- 🚀 GitHub Actions CI/CD Pipeline

---

## Architektur

```mermaid
graph TD
    subgraph Browser ["🌐 Benutzer / Browser"]
        URL["URL: turnier-planer.mygate.dedyn.io\n?view=admin → Admin\n(kein Parameter) → SelfService"]
    end

    subgraph Frontend ["⚛️ Frontend – React + Vite"]
        App["App.tsx\nURL-Routing\nView-Selector"]
        SS["SelfServiceView\n📱 Helfer-Portal"]
        Admin["Admin-Bereich\n🖥️ Management"]
    end

    subgraph Backend ["🟢 Backend – Express + tsx"]
        API["Express API\nPort: 5000"]
        Auth["Auth\nJWT + bcrypt"]
        Email["E-Mail\nResend API"]
    end

    subgraph Data ["💾 Daten"]
        DB[("SQLite\ndev.db\nPrisma ORM")]
    end

    URL --> App
    App --> SS
    App --> Admin
    SS --> API
    Admin --> API
    API --> Auth
    API --> Email
    API --> DB
```

### Tech Stack

| Schicht       | Technologie                          |
|---------------|--------------------------------------|
| Frontend      | React 18 + Vite + TypeScript         |
| Backend       | Express.js + tsx (TypeScript Runtime)|
| Datenbank     | SQLite + Prisma ORM                  |
| Auth          | JWT (`jsonwebtoken`) + bcrypt        |
| E-Mail        | Resend API                           |
| Deployment    | Docker Compose + GitHub Actions      |
| CI/CD         | GHCR (GitHub Container Registry)     |

### Zwei Ansichten über URL-Routing

Die Anwendung bietet zwei getrennte Oberflächen, die **über eine einzige Domain** gesteuert werden:

| URL | Ansicht | Zielgruppe |
|-----|---------|------------|
| `https://turnier-planer.mygate.dedyn.io` | SelfServiceView | Helfer |
| `?view=admin` Query-Parameter | Admin (App.tsx) | Administration |

---

## ER-Modell

> ℹ️ **Verbindliche Quelle des Datenmodells ist [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma).**
> Das folgende Diagramm und das Data Dictionary sind eine vereinfachte, teils historische
> Übersicht. Wichtigste Abweichung: Die Helfer-Entität heißt im Code **`User`** (nicht `Volunteer`),
> die Rolle ist ein String-Enum **`role`** mit Werten `HELPER` / `ORGANIZER` / `ADMIN`
> (nicht ein `roles`-JSON-Array), und Kinder liegen im Modell **`UserChild`**.

```mermaid
erDiagram
    Club ||--o{ Tournament : "owns"
    Tournament ||--o{ Group : "has"
    Tournament ||--o{ Match : "contains"
    Tournament ||--o{ Shift : "has"
    Tournament ||--o{ VolunteerShift : "has"
    Tournament ||--o{ FoodDonation : "has"
    Tournament ||--o{ FoodDonationSlot : "has"
    Tournament ||--o{ MaterialItem : "has"

    Group ||--o{ Team : "contains"
    Team ||--o| Match : "teamA"
    Team ||--o| Match : "teamB"

    Volunteer ||--o{ VolunteerChild : "has"
    Volunteer ||--o{ VolunteerShift : "assigned"
    Volunteer ||--o{ FoodDonation : "makes"
    Volunteer ||--o{ FoodDonationSlot : "targets"

    Shift }o--|| Zeitslot : "uses"
    Shift }o--|| Arbeitsbereich : "at"
    VolunteerShift }o--|| Volunteer : "by"
    VolunteerShift }o--|| Shift : "for"

    FoodCategory ||--o{ FoodItem : "contains"
    YearGroup ||--o{ FoodDonationSlot : "defines"
    FoodItem ||--o{ FoodDonation : "donated"
    FoodItem ||--o{ FoodDonationSlot : "targeted"
    FoodDonation }o--|| FoodDonationSlot : "fulfills"

    Club {
        int id PK
        string name
        string logo
        string primaryColor
        string secondaryColor
        string accentColor
    }

    Tournament {
        int id PK
        string name
        datetime startDate
        datetime endDate
        string status
        int clubId FK
    }

    Group {
        int id PK
        string name
        int tournamentId FK
    }

    Team {
        int id PK
        string name
        int groupId FK
        int goalsFor
        int goalsAgainst
    }

    Match {
        int id PK
        int teamAId FK
        int teamBId FK
        int scoreA
        int scoreB
        datetime time
        string field
    }

    Volunteer {
        int id PK
        string name
        string email
        string phone
        string password
        string roles
        int tournamentId FK
    }

    VolunteerChild {
        int id PK
        int volunteerId FK
        string childName
        int childYear
    }

    VolunteerShift {
        int id PK
        int volunteerId FK
        int shiftId FK
        datetime date
        string slot
        string role
    }

    Arbeitsbereich {
        int id PK
        string name
        string icon
        int minVolunteers
        int maxVolunteers
        string color
    }

    Zeitslot {
        int id PK
        string name
        string startTime
        string endTime
        string color
        int order
    }

    Shift {
        int id PK
        int tournamentId FK
        datetime date
        int zeitslotId FK
        int arbeitsbereichId FK
        int maxVolunteers
    }

    FoodCategory {
        int id PK
        string name
        string icon
        int order
    }

    FoodItem {
        int id PK
        int categoryId FK
        string name
        string price
        string unit
    }

    YearGroup {
        int id PK
        string name
        int birthYearStart
        int birthYearEnd
        boolean isActive
    }

    FoodDonationSlot {
        int id PK
        int tournamentId FK
        int yearGroupId FK
        int foodItemId FK
        int targetQuantity
        int collected
    }

    FoodDonation {
        int id PK
        int tournamentId FK
        int volunteerId FK
        int slotId FK
        int foodItemId FK
        int quantity
        string note
    }

    MaterialItem {
        int id PK
        int tournamentId FK
        string name
        int quantity
        string unit
        boolean done
    }

    PasswordResetToken {
        int id PK
        int volunteerId FK
        string token
        datetime expiresAt
        boolean used
    }
```

### Datenmodell-Übersicht

| Modell | Beschreibung |
|--------|-------------|
| **Club** | Verein mit Logo und 3-Farben-Theming (Primary/Secondary/Accent) |
| **Tournament** | Turnier mit Status (aktiv/beendet/archiviert), verknüpft mit Club |
| **Group / Team** | Gruppenphase: Groups enthalten Teams, Teams spielen Matches |
| **Match** | Begegnung zwischen zwei Teams mit Ergebnis und Feld/Zeit |
| **Arbeitsbereich** | Physischer Station (Verkaufsstand, Grillstand, etc.) mit Min/Max Helfer |
| **Zeitslot** | Zeitfenster (Start/Ende) für Schichten |
| **Shift** | Konkreter Job-Slot: Datum × Zeitslot × Arbeitsbereich |
| **User** (Code-Name; früher „Volunteer") | Helferin/Helfer mit Login-Daten, Rolle (`role`: HELPER/ORGANIZER/ADMIN) |
| **UserChild** (früher „VolunteerChild") | Kind einer Helferin (Name + Jahrgang) für Spendenfilterung |
| **VolunteerShift** | Zuweisung: Wer ist wann in welcher Schicht? |
| **FoodCategory / FoodItem** | Lebensmittel-Kategorien und -Artikel mit Preisen |
| **YearGroup** | Jahrgang (Geburtsjahr-Bereich) für zielgruppengerechte Spendenplanung |
| **FoodDonationSlot** | Zielmenge pro Artikel + Jahrgang, wird durch Spenden gefüllt |
| **FoodDonation** | Konkrete Spende einer Helferin (verknüpft mit Slot oder frei) |
| **MaterialItem** | Materialliste für das Turnier |
| **PasswordResetToken** | Token-basiertes Passwort-zurücksetzen |

---

## Data Dictionary

### 🏅 Club (Verein)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `name` | String | ❌ | Vereinsname |
| `logo` | String | ✅ | Logo als Base64-DataURI |
| `primaryColor` | String | ❌ | Hauptfarbe (#hex), Header/Gradients |
| `secondaryColor` | String | ❌ | Sekundärfarbe (#hex), Buttons/Akzente |
| `accentColor` | String | ❌ | Akzentfarbe (#hex), Status/Highlights |

### 🏟️ Tournament (Turnier)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `name` | String | ❌ | Turniername |
| `description` | String | ✅ | Beschreibung/Details |
| `startDate` | DateTime | ❌ | Erster Turniertag |
| `endDate` | DateTime | ❌ | Letzter Turniertag |
| `status` | String | ❌ | `aktiv` / `beendet` / `archiviert` |
| `clubId` | Int (FK) | ✅ | Verknüpfter Verein → Club.id |

### 👥 Group (Gruppe)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `name` | String | ❌ | Gruppenname (z.B. "Gruppe A") |
| `tournamentId` | Int (FK) | ❌ | Gehört zu → Tournament.id |

### ⚽ Team (Mannschaft)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `name` | String | ❌ | Mannschaftsname |
| `groupId` | Int (FK) | ❌ | Gehört zu → Group.id |
| `goalsFor` | Int | ❌ | Erzielte Tore |
| `goalsAgainst` | Int | ❌ | Gegene Tore |

### 📋 Match (Begegnung)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `tournamentId` | Int (FK) | ❌ | Gehört zu → Tournament.id |
| `teamAId` | Int (FK) | ❌ | Team A → Team.id |
| `teamBId` | Int (FK) | ❌ | Team B → Team.id |
| `scoreA` | Int | ✅ | Ergebnis Team A (null = ausstehend) |
| `scoreB` | Int | ✅ | Ergebnis Team B (null = ausstehend) |
| `field` | String | ❌ | Spielfeld (Standard: "Feld 1") |
| `time` | DateTime | ❌ | Angesetzt Spielzeit |

### 👤 User (Helferin/Helfer – im Code `User`, Tabelle `users`)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `name` | String | ❌ | Vollständiger Name |
| `email` | String | ✅ | E-Mail-Adresse (Login/Passwort-Zurücksetzen) |
| `phone` | String | ✅ | Telefonnummer |
| `password` | String | ✅ | bcrypt-Hash (optional, nur bei Registrierung gesetzt) |
| `role` | String (Enum-artig) | ❌ | `HELPER` / `ORGANIZER` / `ADMIN` (Default: `HELPER`) |
| `isPrimaryAdmin` | Boolean | ❌ | Primärer Admin (E-Mail-Absender), Default: false |
| `consentGiven` / `consentDate` | Boolean / DateTime | ✅ | DSGVO-Einwilligung |
| `tournamentId` | Int (FK) | ✅ | Aktuelles Turnier → Tournament.id |

> Kinder-Daten liegen in **`UserChild`** (nicht mehr als `childName`/`childYear` am User).

### 👶 VolunteerChild (Kind einer Helferin)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `volunteerId` | Int (FK) | ❌ | Gehört zu → Volunteer.id |
| `childName` | String | ❌ | Name des Kindes |
| `childYear` | Int | ❌ | Geburtsjahr (z.B. 2015 für Jahrgang 2013) |

### 📅 VolunteerShift (Helfer-Einsatz)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `volunteerId` | Int (FK) | ❌ | Helferin/Helfer → Volunteer.id |
| `shiftId` | Int (FK) | ✅ | Konkreter Job-Slot → Shift.id |
| `date` | DateTime | ❌ | Einsatzdatum |
| `slot` | String | ❌ | Zeitslot-Name (z.B. "09:00–12:00") |
| `role` | String | ❌ | Rolle/Aufgabe |

### 📍 Arbeitsbereich (Station)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `name` | String | ❌ | Name (z.B. "Verkaufsstand", "Grillstand") |
| `icon` | String | ❌ | Emoji-Icon (Standard: "📍") |
| `minVolunteers` | Int | ❌ | Mindestanzahl Helfer (Default: 2) |
| `maxVolunteers` | Int | ❌ | Maximalanzahl Helfer (Default: 8) |
| `color` | String | ❌ | Farbwert für UI-Badges (#hex) |

### ⏰ Zeitslot (Zeitfenster)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `name` | String | ❌ | Anzeigename (z.B. "Morgen") |
| `startTime` | String | ❌ | Startzeit (ISO 8601: "09:00") |
| `endTime` | String | ❌ | Endzeit (ISO 8601: "12:00") |
| `color` | String | ❌ | Farbwert für UI (#hex) |
| `order` | Int | ❌ | Sortierreihenfolge (Default: 0) |

### 🔧 Shift (Job-Slot)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `tournamentId` | Int (FK) | ❌ | Gehört zu → Tournament.id |
| `date` | DateTime | ❌ | Einsatzdatum |
| `zeitslotId` | Int (FK) | ✅ | Zeitfenster → Zeitslot.id |
| `arbeitsbereichId` | Int (FK) | ✅ | Station → Arbeitsbereich.id |
| `maxVolunteers` | Int | ❌ | Max. Helfer (Default: 8, überschreibt Arbeitsbereich) |

### 📂 FoodCategory (Lebensmittel-Kategorie)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `name` | String | ❌ | Kategoriename (z.B. "Kuchen", "Getränke") |
| `icon` | String | ❌ | Emoji-Icon (Standard: "🍽️") |
| `order` | Int | ❌ | Sortierreihenfolge (Default: 0) |

### 🍰 FoodItem (Lebensmittel-Artikel)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `categoryId` | Int (FK) | ❌ | Kategorie → FoodCategory.id |
| `name` | String | ❌ | Artikelname (z.B. "Selbstgemachter Kuchen") |
| `price` | String | ✅ | Preisangabe (optional) |
| `unit` | String | ❌ | Einheit (Default: "Stk") |

### 🎓 YearGroup (Jahrgang)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `name` | String | ❌ | Anzeigename (z.B. "Jahrgang 2013") |
| `birthYearStart` | Int | ❌ | Startjahr der Altersgruppe |
| `birthYearEnd` | Int | ❌ | Endjahr der Altersgruppe |
| `order` | Int | ❌ | Sortierreihenfolge (Default: 0) |
| `isActive` | Boolean | ❌ | Aktiv/Inaktiv (Default: true) |

### 🎯 FoodDonationSlot (Spenden-Ziel)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `tournamentId` | Int (FK) | ❌ | Gehört zu → Tournament.id |
| `yearGroupId` | Int (FK) | ✅ | Ziel-Jahrgang → YearGroup.id |
| `foodItemId` | Int (FK) | ✅ | Gewünschter Artikel → FoodItem.id |
| `targetQuantity` | Int | ❌ | Zielmenge (Default: 0) |
| `collected` | Int | ❌ | Aktuelle gespendete Menge (wird automatisch inkrementiert) |

### 📦 FoodDonation (Konkrete Spende)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `tournamentId` | Int (FK) | ❌ | Gehört zu → Tournament.id |
| `volunteerId` | Int (FK) | ❌ | Spender:in → Volunteer.id |
| `foodDonationSlotId` | Int (FK) | ✅ | Verknüpfter Slot → FoodDonationSlot.id |
| `foodItemId` | Int (FK) | ❌ | Gespendeter Artikel → FoodItem.id |
| `quantity` | Int | ❌ | Menge |
| `note` | String | ✅ | Notiz/Freitext |

### 📋 MaterialItem (Materialgegenstand)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `tournamentId` | Int (FK) | ❌ | Gehört zu → Tournament.id |
| `name` | String | ❌ | Gegenstandsname |
| `quantity` | Int | ❌ | Menge (Default: 1) |
| `unit` | String | ❌ | Einheit (Default: "Stk") |
| `done` | Boolean | ❌ | Abgehakt/Erledigt (Default: false) |

### 🔑 PasswordResetToken (Passwort-Zurücksetzen)
| Feld | Typ | Nullable | Beschreibung |
|------|-----|----------|-------------|
| `id` | Int (PK) | ❌ | Primärschlüssel |
| `volunteerId` | Int (FK) | ❌ | Gehört zu → Volunteer.id |
| `token` | String | ❌ | Einmaliger Reset-Token (unique) |
| `expiresAt` | DateTime | ❌ | Ablaufzeit des Tokens |
| `used` | Boolean | ❌ | Bereits verwendet (Default: false) |

---

## Lokaler Start

```bash
# Dependencies installieren
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Datenbank initialisieren
cd backend && npx prisma db push && cd ..

# Server starten
docker compose up --build
```

🔗 Frontend: http://localhost:8080  
🔗 Backend API: http://localhost:5000

---

## Deployment (GitHub Actions)

Die Applikation wird vollautomatisch per GitHub Actions als Docker-Container gebaut.

**Wichtig:** Ein normaler Commit auf `master` löst **keinen** Build aus, um Ressourcen zu sparen und unfertige Versionen zu vermeiden.

### Ein Deployment auslösen

Es gibt zwei Wege, um eine neue Version (Image) zu bauen:

1. **Version Tag (Best Practice):**
   Wenn du eine stabile Version veröffentlichen willst, erstelle lokal einen Git-Tag und pushe ihn:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
   GitHub Actions erkennt den Tag `v...` und baut automatisch das Image.

2. **Manuell anstoßen:**
   Gehe auf GitHub unter **Actions** -> **Build & Push Docker Image** und klicke rechts auf **Run workflow**.

*(Hinweis zur Datenbank: Beim allerersten Start in Produktion sorgt die Ignition Phase (`prisma/seed.ts`) dafür, dass Standard-Lebensmittel und Arbeitsbereiche automatisch angelegt werden. Die Test-Datenbank `dev.db` wird dabei niemals mit deployed).*

### Zugriff über eine einzige Domain
Alle Funktionen sind über **eine Subdomain** erreichbar – die Ansicht wird per Query-Parameter gesteuert:

| URL | Ansicht |
|-----|---------|
| `https://turnier-planer.mygate.dedyn.io` | SelfServiceView (Helfer-Portal) |
| `https://turnier-planer.mygate.dedyn.io?view=admin` | Admin-Bereich |

**Vorteil:** Keine zweite Subdomain oder DNS-Einträge nötig. Admin-Zugriff direkt über URL-Parameter.

---

## Anpassung
Pass bei Bedarf die Felder, Rollen und Zeitslots in den Komponenten an.  
Die SQLite-Datenbank bleibt automatisch persistent über Docker Volumes.

---
Macht das Turnier! ⚽🏆
