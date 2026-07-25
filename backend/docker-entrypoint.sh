#!/bin/sh
set -e

echo "  Alte Shift-Daten pruefen (Tag-/Slot-System Migration)..."
node scripts/migrate-day-slot-system.cjs

echo "  Prisma Schema synchronisieren..."
npx prisma db push --accept-data-loss

echo "  Slot-Herkunft nachtragen (Tage vor sourceGlobalSlotId-Einfuehrung)..."
node scripts/backfill-slot-provenance.cjs

echo "  Recovery-PINs hashen (falls noch im Klartext gespeichert)..."
node scripts/migrate-hash-recovery-pins.cjs

echo "  Standarddaten importieren (Ignition Phase)..."
npx prisma db seed

echo "  Backend startet..."
# Direkt das lokale Binary starten statt "npx tsx": npx spawnt tsx als
# Kindprozess und beendet ihn bei SIGTERM (Container-Stop/Neustart) mit einem
# irrefuehrenden "npm error signal SIGTERM" im Log, obwohl es sich um ein
# normales Herunterfahren handelt. Per exec direkt wird der Node-Prozess
# selbst zu PID 1 und erhaelt/behandelt das Signal sauber.
exec node_modules/.bin/tsx src/server.ts
