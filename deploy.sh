#!/bin/bash
# Einmaliges Deployment auf deinem Remote-Server durchführen
echo "🔄 Docker Images werden pullt..."
docker compose pull
docker compose up -d
echo "✅ Deployment abgeschlossen!"
