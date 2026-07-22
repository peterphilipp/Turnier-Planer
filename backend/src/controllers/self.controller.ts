import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tsv-holm-secret-2025';

// Helper: Get volunteerId from token
const getVolunteerId = (req: Request): number | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { volunteerId: number };
    return decoded.volunteerId;
  } catch {
    return null;
  }
};

export const getAvailable = async (req: Request, res: Response) => {
  const volunteerId = getVolunteerId(req);
  if (!volunteerId) return res.status(401).json({ error: 'Nicht authentifiziert' });

  const volunteer = await prisma.volunteer.findUnique({ 
    where: { id: volunteerId },
    include: { children: true }
  });
  if (!volunteer || !volunteer.tournamentId) {
    return res.json({ shifts: [], volunteerShifts: [], volunteer: null });
  }

  const shifts = await prisma.shift.findMany({
    where: { tournamentId: volunteer.tournamentId },
    include: { zeitslot: true, arbeitsbereich: true }
  });

  const volunteerShifts = await prisma.volunteerShift.findMany({
    where: { tournamentId: volunteer.tournamentId },
    include: { 
      volunteer: { select: { id: true, name: true } }, 
      shift: { include: { zeitslot: true, arbeitsbereich: true } } 
    }
  });

  res.json({ shifts, volunteerShifts });
};

export const assignShift = async (req: Request, res: Response) => {
  const volunteerId = getVolunteerId(req);
  if (!volunteerId) return res.status(401).json({ error: 'Nicht authentifiziert' });

  const { shiftId, date } = req.body;
  if (!shiftId || !date) return res.status(400).json({ error: 'shiftId und date erforderlich' });

  const shift = await prisma.shift.findUnique({ where: { id: shiftId }, include: { zeitslot: true, arbeitsbereich: true } });
  if (!shift) return res.status(404).json({ error: 'Shift nicht gefunden' });

  const volunteer = await prisma.volunteer.findUnique({ where: { id: volunteerId } });
  if (!volunteer) return res.status(404).json({ error: 'Volunteer nicht gefunden' });

  // Prüfen, ob der User für denselben Zeitraum schon woanders eingeteilt ist (vereinfacht)
  const existing = await prisma.volunteerShift.findFirst({
    where: { volunteerId, date: new Date(date), shiftId }
  });
  if (existing) {
    return res.status(400).json({ error: 'Du bist für diesen Job-Slot bereits eingetragen.' });
  }

  const vs = await prisma.volunteerShift.create({
    data: {
      volunteerId,
      tournamentId: volunteer.tournamentId,
      shiftId,
      date: new Date(date),
      slot: shift.zeitslot ? `${shift.zeitslot.name} (${shift.zeitslot.startTime}-${shift.zeitslot.endTime})` : 'Unbekannt',
      role: 'Helfer',
      areaId: shift.arbeitsbereichId ? String(shift.arbeitsbereichId) : null
    }
  });

  res.json(vs);
};

export const unassignShift = async (req: Request, res: Response) => {
  const volunteerId = getVolunteerId(req);
  if (!volunteerId) return res.status(401).json({ error: 'Nicht authentifiziert' });

  const volunteerShiftId = parseInt(req.params.id);
  
  const existing = await prisma.volunteerShift.findUnique({ where: { id: volunteerShiftId } });
  if (!existing || existing.volunteerId !== volunteerId) {
    return res.status(403).json({ error: 'Zugriff verweigert oder nicht gefunden' });
  }

  await prisma.volunteerShift.delete({ where: { id: volunteerShiftId } });
  res.json({ success: true });
};
