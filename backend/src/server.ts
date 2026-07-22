import 'express-async-errors'; // Must be at the very top for async error catching
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './config/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
import passwordRoutes from './routes/password.routes.js';
import clubRoutes from './routes/club.routes.js';
import selfRoutes from './routes/self.routes.js';
import foodRoutes from './routes/food.routes.js';
import foodDonationSlotRoutes from './routes/foodDonationSlot.routes.js';
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
app.use('/api/auth', passwordRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/self', selfRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/food-donation-slots', foodDonationSlotRoutes);
// ===================== Serve Frontend (SPA) =====================
const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

// SPA fallback: alle nicht-API-Routen -> index.html
app.get('*', (req: Request, res: Response) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.resolve(distPath, 'index.html'));
});

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
