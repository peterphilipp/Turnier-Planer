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

```
┌─────────────────────────────────────────────────────────┐
│                    Benutzer / Browser                     │
└──────────────┬──────────────────────────────┬───────────┘
               │                              │
    ┌──────────▼──────────┐        ┌─────────▼──────────┐
    │  turnier-planer.     │        │  turnier-planer-   │
    │  mygate.dedyn.io     │        │  admin.mygate...   │
    │                      │        │                     │
    │  SelfServiceView     │        │  AdminView (App)   │
    │  (Helfer-Portal)     │        │  (Admin-Bereich)   │
    └──────────┬───────────┘        └─────────┬──────────┘
               │                              │
               ▼                              │
    ┌──────────────────────┐                   │
    │   Vite Dev / Nginx   │                   │
    │   (Frontend Build)   │                   │
    └──────────┬───────────┘                   │
               │                                │
               ▼                                │
    ┌──────────────────────┐                   │
    │  Express + tsx       │◄──────────────────┘
    │  (Backend API)       │
    │  Port: 5000          │
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────┐
    │   SQLite (dev.db)    │
    │   Prisma ORM         │
    └──────────────────────┘
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

Die Anwendung bietet zwei getrennte Oberflächen, die über die URL gesteuert werden:

| URL / Subdomain                    | Ansicht          | Zielgruppe   |
|------------------------------------|------------------|--------------|
| `turnier-planer.mygate.dedyn.io`  | SelfServiceView  | Helfer       |
| `turnier-planer-admin.mygate...`  | Admin (App.tsx)  | Administration |
| `?view=admin` Query-Parameter      | Admin            | Override     |

---

## ER-Modell

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
| **Volunteer** | Helferin/Helfer mit Login-Daten, Rollen und Kinder-Informationen |
| **VolunteerChild** | Kind einer Helferin (Name + Jahrgang) für Spendenfilterung |
| **VolunteerShift** | Zuweisung: Wer ist wann in welcher Schicht? |
| **FoodCategory / FoodItem** | Lebensmittel-Kategorien und -Artikel mit Preisen |
| **YearGroup** | Jahrgang (Geburtsjahr-Bereich) für zielgruppengerechte Spendenplanung |
| **FoodDonationSlot** | Zielmenge pro Artikel + Jahrgang, wird durch Spenden gefüllt |
| **FoodDonation** | Konkrete Spende einer Helferin (verknüpft mit Slot oder frei) |
| **MaterialItem** | Materialliste für das Turnier |
| **PasswordResetToken** | Token-basiertes Passwort-zurücksetzen |

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

## Deployment (GitHub Secrets erforderlich)
- `DEPLOY_USER` = SSH Benutzername des Zielservers
- `DEPLOY_HOST` = IP oder Domain des Zielservers

Push nach `master` → GitHub Actions baut & pusht die Images → Pullt sie auf dem Server.

### Subdomains konfigurieren
Für den URL-basierten Zugriff müssen zwei Subdomains eingerichtet werden:

| Subdomain | Ziel |
|-----------|------|
| `turnier-planer.mygate.dedyn.io` | SelfServiceView (Standard) |
| `turnier-planer-admin.mygate.dedyn.io` | Admin-Bereich |

---

## Anpassung
Pass bei Bedarf die Felder, Rollen und Zeitslots in den Komponenten an.  
Die SQLite-Datenbank bleibt automatisch persistent über Docker Volumes.

---
Macht das Turnier! ⚽🏆
