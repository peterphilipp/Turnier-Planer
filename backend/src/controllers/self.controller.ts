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

  const shiftsRaw = await prisma.shift.findMany({
    where: { tournamentId: targetTournamentId },
    include: { globalTimeSlot: true, workArea: true }
  });
  // Alias für Frontend-Kompatibilität
  const shifts = shiftsRaw.map(s => ({
    ...s,
    zeitslot: s.globalTimeSlot,
    arbeitsbereich: s.workArea
  }));

  const volunteerShiftsRaw = await prisma.volunteerShift.findMany({
    where: { tournamentId: targetTournamentId },
    include: { 
      user: { select: { id: true, name: true } }, 
      shift: { 
        select: {
          id: true,
          date: true,
          zeitslotId: true,
          arbeitsbereichId: true,
          maxVolunteers: true,
          globalTimeSlot: true,
          workArea: true
        }
      } 
    }
  });
  // Alias für Frontend-Kompatibilität
  const volunteerShifts = volunteerShiftsRaw.map(vs => ({
    ...vs,
    shift: vs.shift ? {
      ...vs.shift,
      zeitslot: vs.shift.globalTimeSlot,
      arbeitsbereich: vs.shift.workArea
    } : null
  }));

  const tournament = await prisma.tournament.findUnique({
    where: { id: targetTournamentId },
    include: { club: true }
  });

  res.json({ shifts, volunteerShifts, volunteer: user, tournament });
};

export const assignShift = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

  const { shiftId, date } = req.body;
  if (!shiftId || !date) return res.status(400).json({ error: 'shiftId und date erforderlich' });

  const shiftRaw = await prisma.shift.findUnique({ where: { id: shiftId }, include: { globalTimeSlot: true, workArea: true } });
  const shift = shiftRaw ? {
    ...shiftRaw,
    zeitslot: shiftRaw.globalTimeSlot,
    arbeitsbereich: shiftRaw.workArea
  } : null;
  if (!shift) return res.status(404).json({ error: 'Shift nicht gefunden' });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

  // Prüfen, ob der User für denselben Zeitraum schon woanders eingeteilt ist (vereinfacht)
  const existing = await prisma.volunteerShift.findFirst({
    where: { userId, date: new Date(date), shiftId }
  });
  if (existing) {
    return res.status(400).json({ error: 'Du bist für diesen Job-Slot bereits eingetragen.' });
  }

  const vs = await prisma.volunteerShift.create({
    data: {
      userId,
      tournamentId: shift.tournamentId,
      shiftId,
      date: new Date(date),
      slot: shift.zeitslot ? `${shift.zeitslot.name} (${shift.zeitslot.startTime}-${shift.zeitslot.endTime})` : 'Unbekannt',
      role: 'Helfer',
      areaId: shift.arbeitsbereichId ? String(shift.arbeitsbereichId) : null
    }
  });

  logJobAssigned(userId, user.name || '', shiftId, date);
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
