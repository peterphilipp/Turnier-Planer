import 'express-async-errors'; // Must be at the very top for async error catching
import express from 'express';
import cors from 'cors';
import prisma from './config/prisma.js';

// Route imports
import tournamentRoutes from './routes/tournament.routes.js';
import groupRoutes from './routes/group.routes.js';
import teamRoutes from './routes/team.routes.js';
import matchRoutes from './routes/match.routes.js';
import volunteerRoutes from './routes/volunteer.routes.js';
import shiftRoutes from './routes/shift.routes.js';
import volunteerShiftRoutes from './routes/volunteerShift.routes.js';
import arbeitsbereichRoutes from './routes/arbeitsbereich.routes.js';
import zeitslotRoutes from './routes/zeitslot.routes.js';
import materialRoutes from './routes/material.routes.js';
import healthRoutes from './routes/health.routes.js';

// Middleware imports
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ===================== Endpoints =====================
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/volunteer-shifts', volunteerShiftRoutes);
app.use('/api/arbeitsbereiche', arbeitsbereichRoutes);
app.use('/api/zeit-slots', zeitslotRoutes);
app.use('/api/material', materialRoutes);
app.use('/api/health', healthRoutes);

// ===================== Error Handling =====================
// This must be registered after all routes
app.use(errorHandler);

// ===================== Server Start & DB-Verbindung =====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log(`[OK] Backend läuft auf Port ${PORT} & DB verbunden`);
  } catch (connectionError) {
    console.error('[FATAL ERROR] Datenbankverbindung fehlgeschlagen:', connectionError.message);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('DB getrennt - Server gestoppt');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
