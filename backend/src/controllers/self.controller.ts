import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import jwt from 'jsonwebtoken';
import { logJobAssigned, logJobUnassigned } from '../utils/logger.js';
import JWT_SECRET from '../config/jwt.js';

// Helper: Get userId from token
const getUserId = (req: Request): number | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const bearerToken = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(bearerToken, JWT_SECRET) as { userId: number };
    return decoded.userId;
  } catch {
    return null;
  }
};

/** Minuten seit Mitternacht → "HH:MM". */
const minToTime = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export const getAvailable = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    include: { children: true }
  });
  
  if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

  let targetTournamentId = user.tournamentId;

  // Wenn kein Turnier zugewiesen, das neueste aktive Turnier nehmen
  if (!targetTournamentId) {
    const latestActive = await prisma.tournament.findFirst({
      where: { status: 'aktiv' },
      orderBy: { startDate: 'desc' }
    });
    if (latestActive) {
      targetTournamentId = latestActive.id;
      // Optional: Direkt beim User speichern, damit er in Zukunft fest zugeordnet ist
      await prisma.user.update({ where: { id: userId }, data: { tournamentId: targetTournamentId } });
      user.tournamentId = targetTournamentId;
    }
  }

  if (!targetTournamentId) {
    return res.json({ shifts: [], volunteerShifts: [], volunteer: null });
  }

  const shifts = await prisma.shift.findMany({
    where: { tournamentId: targetTournamentId },
    include: { day: true, daySlot: true, workArea: true }
  });

  const volunteerShifts = await prisma.volunteerShift.findMany({
    where: { tournamentId: targetTournamentId },
    include: {
      user: { select: { id: true, name: true } },
      shift: { include: { day: true, daySlot: true, workArea: true } }
    }
  });

  const tournament = await prisma.tournament.findUnique({
    where: { id: targetTournamentId },
    include: { club: true }
  });

  res.json({ shifts, volunteerShifts, volunteer: user, tournament });
};

export const assignShift = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

  const { shiftId } = req.body;
  if (!shiftId) return res.status(400).json({ error: 'shiftId erforderlich' });

  const shift = await prisma.shift.findUnique({ where: { id: shiftId }, include: { day: true, daySlot: true, workArea: true } });
  if (!shift) return res.status(404).json({ error: 'Shift nicht gefunden' });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

  // Bereits für diesen Job-Slot eingetragen?
  const existing = await prisma.volunteerShift.findFirst({ where: { userId, shiftId } });
  if (existing) {
    return res.status(400).json({ error: 'Du bist für diesen Job-Slot bereits eingetragen.' });
  }

  const shiftDate = shift.day?.date ?? new Date();
  const slotLabel = shift.daySlot ? `${minToTime(shift.daySlot.startMin)}-${minToTime(shift.daySlot.endMin)}` : 'Unbekannt';

  const vs = await prisma.volunteerShift.create({
    data: {
      userId,
      tournamentId: shift.tournamentId,
      shiftId,
      date: shiftDate,
      slot: slotLabel,
      role: shift.workArea?.name || 'Helfer',
      areaId: String(shift.tournamentWorkAreaId)
    }
  });

  logJobAssigned(userId, user.name || '', shiftId, shiftDate.toISOString());
  res.json(vs);
};

export const unassignShift = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

  const volunteerShiftId = parseInt(req.params.id as string);
  
  const existing = await prisma.volunteerShift.findUnique({ 
    where: { id: volunteerShiftId },
    include: { user: true }
  });
  if (!existing || existing.userId !== userId) {
    return res.status(403).json({ error: 'Zugriff verweigert oder nicht gefunden' });
  }

  const userName = existing.user?.name || 'Unbekannt';
  const shiftDate = existing?.date ? new Date(existing.date).toISOString().split('T')[0] : '';
  await prisma.volunteerShift.delete({ where: { id: volunteerShiftId } });
  logJobUnassigned(userId, userName, existing.shiftId || 0, shiftDate);
  res.json({ success: true });
};
