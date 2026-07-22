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

```
┌──────────┐       ┌──────────────┐       ┌──────────┐
│   Club   │1    *│  Tournament  │1    *│  Group   │
│          │◄─────►│              │◄────►│          │
│ id       │       │ id           │       │ id       │
│ name     │       │ name         │       │ name     │
│ logo     │       │ startDate    │       │ tournamentId├──► Tournament
│ colors   │       │ endDate      │       └──────────┘
└──────────┘       │ status       │              │
                   │ clubId       │              ▼
                   └──────┬───────┐       ┌──────────┐
                          │        │1    *│  Team    │
                          ▼        │       │          │
                   ┌──────────┐   │       │ id       │
                   │ Material │   │       │ name     │
                   │  Item    │   │       │ groupId  ├──► Group
                   └──────────┘   │       │ goalsFor │
                                    │       └──────────┘
                          ┌────────┴─────┐              │
                          ▼              │              ▼
                   ┌──────────┐          │       ┌──────────┐
                   │  Shift   │          │       │  Match   │
                   │          │          │       │          │
                   │ id       │          │       │ id       │
                   │ date     │          │       │ time     │
                   │ zeitslot ├───┐      │       │ teamAId  ├──► Team A
                   │ arbeits- │   │      │       │ teamBId  ├──► Team B
                   │  bereich │   │      │       │ scoreA/B │
                   └──────────┘   │      │       └──────────┘
                                    │      │
                          ┌─────────┴──────┘
                          ▼
                   ┌──────────┐
                   │ Volunteer│1    *│ VolunteerShift │
                   │          │◄────►│                │
                   │ id       │      │ id             │
                   │ name     │      │ volunteerId    ├──► Volunteer
                   │ email    │      │ shiftId        ├──► Shift
                   │ phone    │      │ date           │
                   │ password │      │ slot / role    │
                   │ roles    │      └────────────────┘
                   │ children │
                   │ (1:N)    │
                   └────┬─────┘
                        │
              ┌─────────▼──────────┐
              │ VolunteerChild     │
              │                    │
              │ id                 │
              │ volunteerId        ├──► Volunteer
              │ childName          │
              │ childYear          │
              └────────────────────┘

  ┌──────────────┐       ┌──────────────────┐       ┌──────────────┐
  │ FoodCategory │1    *│   FoodItem       │1    *│FoodDonation │
  │              │◄─────►│                  │◄────►│              │
  │ id           │       │ id               │       │ id           │
  │ name/icon    │       │ categoryId       ├──► Category │
  │ order        │       │ name / price     │       │ volunteerId├──► Volunteer
  └──────────────┘       │ unit             │       │ slotId     ├──► Slot
                         └────────┬─────────┘       │ quantity   │
                                  │1    *            └────────────┘
                           ┌──────▼───────┐
                           │FoodDonationSlot│
                           │                │
                           │ id             │
                           │ tournamentId   ├──► Tournament
                           │ yearGroupId    ├──► YearGroup
                           │ foodItemId     ├──► FoodItem
                           │ targetQuantity │
                           │ collected      │
                           └────────────────┘

  ┌──────────────┐       ┌──────────────┐
  │  YearGroup   │1    *│FoodDonationSlot│
  │              │◄─────►│                │
  │ id           │       │                │
  │ name         │       └────────────────┘
  │ birthYearStart│
  │ birthYearEnd │
  └──────────────┘
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
