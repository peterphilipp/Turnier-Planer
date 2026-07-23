# Turnier-Planer – Strategische Roadmap

## 🟢 Phase 1 – Kern-Turnierworkflow (fehlendes Herzstück)

### ER-Modell Phase 1

```mermaid
erDiagram
    Tournament ||--|| YearGroup : "gehört zu"
    Tournament ||--o{ TimeSlot : "plant"
    Tournament ||--o{ Field : "verwaltet"
    Tournament ||--o{ Group : "hat"
    Tournament ||--o{ Match : "enthält"
    Tournament ||--o{ StandingsEntry : "berechnet"

    YearGroup {
        int id PK
        string name "z.B. 'Jahrgang 2016'"
        int birthYearStart
        int birthYearEnd
        boolean isActive
    }

    TimeSlot {
        int id PK
        int tournamentId FK
        date DateTime
        startTime String "09:00"
        endTime String "10:30"
        label String? "Spielphase/Pause/Finale"
        int order
    }

    Field {
        int id PK
        int tournamentId FK
        string name "Feld 1–6"
        string status "verfügbar/belegt/Wartung"
    }

    Group {
        int id PK
        string name "Gruppe A, B, C..."
        int tournamentId FK
    }

    Team {
        int id PK
        string name "TSV A, TSV B..."
        int groupId FK
        int tournamentId FK
    }

    Match {
        int id PK
        int timeSlotId FK
        int fieldId FK
        int teamAId FK
        int teamBId FK
        int? scoreA
        int? scoreB
        string phase "Gruppenphase/K.o./Finale"
        string status "geplant/gespielt/abgesagt"
    }

    StandingsEntry {
        int id PK
        int teamId FK
        int tournamentId FK
        int played, won, drawn, lost
        int goalsFor, goalsAgainst, points
        int position
    }

    TimeSlot ||--o{ Match : "enthält"
    Field ||--o{ Match : "wird genutzt von"
    Group ||--o{ Team : "enthält"
    Team ||--o| Match : "spielt als A"
    Team ||--o| Match : "spielt als B"
```

### Implementierungsplan Phase 1

#### Schritt 1: Schema-Erweiterung (Prisma)
- [ ] `Tournament.yearGroupId` FK → YearGroup
- [ ] Neues Modell `TimeSlot` (Tagesraster mit Pausen)
- [ ] Neues Modell `Field` (Platz/Feld Management)
- [ ] Neues Modell `StandingsEntry` (Turniertabelle)
- [ ] `Team.tournamentId` FK hinzufügen
- [ ] `Match.fieldId`, `Match.timeSlotId`, `Match.phase`, `Match.status`

#### Schritt 2: Backend-Endpunkte
- [ ] CRUD für TimeSlots (`/api/time-slots`)
- [ ] CRUD für Fields (`/api/fields`)
- [ ] CRUD für Groups (`/api/groups`) – existiert teilweise
- [ ] CRUD für Teams (`/api/teams`) – existiert teilweise
- [ ] CRUD für Matches (`/api/matches`) – existiert teilweise
- [ ] Standings-Berechnung (`POST /api/matches/:id/result`)

#### Schritt 3: Admin-UI-Komponenten
- [ ] `TurnierTage.tsx` – TimeSlot/Raster pro Tag verwalten
- [ ] `Felder.tsx` – Felder anlegen/verwalten
- [ ] `GruppenUndTeams.tsx` – Gruppen + Teams anlegen
- [ ] `Spielplan.tsx` – Matches auf Raster ziehen (Drag & Drop)
- [ ] `Ergebnisse.tsx` – Scores eintragen, Tabelle live aktualisieren

#### Schritt 4: SelfServiceView Integration
- [ ] Spielplan für Helfer/Eltern anzeigen
- [ ] Eigene Schichten + nächste Spiele anzeigen
- [ ] Ergebnisse/Tabelle im Mobile-First Design

---

## 🟡 Phase 2 – Kommunikation & Automatisierung
- Benachrichtigungen: E-Mail/SMS bei Schichtänderungen, Erinnerungen vor dem Turnier
- Massen-E-Mails: Admins können alle Helfer eines Bereichs kontaktieren
- QR-Codes: Für Helferausweise oder Spendenquittungen

## 🟡 Phase 3 – Mobile Experience
- PWA: SelfServiceView als installierbare App (offline-fähig)
- Push-Benachrichtigungen: Web Push API für Echtzeit-Mitteilungen
- Foto-Upload: Helfer können Einsatzfotos hochladen

## 🟠 Phase 4 – Business Logic & Reporting
- Statistiken: Spenden, Einsatzstunden, Teilnehmerzahlen
- Export: CSV/PDF für Vereinsdokumentation
- Zahlungen: Turniergebühren, Verpflegungszuschüsse

## 🔵 Phase 5 – Skalierung & Multi-Tournament
- Multi-Turnier-Support: Gleichzeitige Verwaltung mehrerer Events
- Vereins-Portale: Subdomain-basierte Isolation pro Verein
- API-First: OpenAPI/Swagger für externe Integrationen
