# ⚽ TSV Holm Turnierplaner

Webanwendung zur Planung von Fußballturnieren und Verwaltung von Helfer-Dienstplänen.

## Features
- ✅ Turniere, Gruppen & Spielplan erstellen
- ✅ Ergebnisse live pflegen
- 👥 Wochen-Dienstplan für Helfer mit Drag & Drop
- 🐳 Dockerized (Backend + Frontend)
- 🚀 GitHub Actions CI/CD Pipeline

## Lokaler Start
```bash
# Dependencies installieren
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Datenbank initialisieren
cd backend && npx prisma migrate dev --name init && cd ..

# Server starten
docker compose up --build
```
🔗 Frontend: http://localhost:8080  
🔗 Backend API: http://localhost:5000

## Deployment (GitHub Secrets erforderlich)
- `DEPLOY_USER` = SSH Benutzername des Zielservers
- `DEPLOY_HOST` = IP oder Domain des Zielservers

Push nach `main` → GitHub Actions baut & pusht die Images → Pullt sie auf dem Server.

## Anpassung
Pass bei Bedarf die Felder, Rollen und Zeitslots in `frontend/src/components/SchedulerView.tsx` an.
Die SQLite-Datenbank bleibt automatisch persistent über Docker Volumes.

---
Macht das Turnier! ⚽🏆
