import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const getTimeSlots = async (req: Request, res: Response) => {
  const tournamentId = parseInt(String(req.query.tournamentId as string));
  if (!tournamentId) return res.status(400).json({ error: 'tournamentId erforderlich' });
  
  const slots = await prisma.timeSlot.findMany({
    where: { tournamentId },
    orderBy: [{ date: 'asc' }, { order: 'asc' }]
  });
  return res.json(slots);
};

export const getTimeSlotById = async (req: Request, res: Response) => {
  const slot = await prisma.timeSlot.findUnique({
    where: { id: parseInt(String(req.params.id as string)) },
    include: { matches: true }
  });
  if (!slot) return res.status(404).json({ error: 'Zeitslot nicht gefunden' });
  return res.json(slot);
};

export const createTimeSlot = async (req: Request, res: Response) => {
  const { tournamentId, date, startTime, endTime, label, order, yearGroupId } = req.body;
  
  if (!tournamentId || !date || !startTime || !endTime) {
    return res.status(400).json({ error: 'tournamentId, date, startTime, endTime erforderlich' });
  }

  const slot = await prisma.timeSlot.create({
    data: {
      tournamentId,
      yearGroupId: yearGroupId || null,
      date: new Date(date),
      startTime,
      endTime,
      label,
      order: order || 0
    },
    include: { matches: true }
  });
  res.status(201).json(slot);
};

export const updateTimeSlot = async (req: Request, res: Response) => {
  const body = req.body;
  if (body.date) body.date = new Date(body.date);
  
  const slot = await prisma.timeSlot.update({
    where: { id: parseInt(String(req.params.id as string)) },
    data: body,
    include: { matches: true }
  });

  // Spielplan invalidieren – nur für dieses Turnier + Jahrgang (nicht turnierübergreifend)
  if (slot.yearGroupId) {
    await prisma.match.deleteMany({ where: { tournamentId: slot.tournamentId, yearGroupId: slot.yearGroupId } });
    await prisma.standingsEntry.deleteMany({ where: { tournamentId: slot.tournamentId, team: { yearGroupId: slot.yearGroupId } } });
  }

  return res.json(slot);
};

export const deleteTimeSlot = async (req: Request, res: Response) => {
  const id = parseInt(String(req.params.id as string));
  const slot = await prisma.timeSlot.findUnique({ where: { id } });

  // Spielplan invalidieren – nur für dieses Turnier + Jahrgang (nicht turnierübergreifend)
  if (slot?.yearGroupId) {
    await prisma.match.deleteMany({ where: { tournamentId: slot.tournamentId, yearGroupId: slot.yearGroupId } });
    await prisma.standingsEntry.deleteMany({ where: { tournamentId: slot.tournamentId, team: { yearGroupId: slot.yearGroupId } } });
  }

  await prisma.timeSlot.delete({ where: { id } });
  return res.status(204).send();
};

export const bulkUpdateTimeSlots = async (req: Request, res: Response) => {
  const { tournamentId, yearGroupId, slots } = req.body;
  if (!tournamentId || !yearGroupId || !Array.isArray(slots)) {
    return res.status(400).json({ error: 'tournamentId, yearGroupId, und slots Array erforderlich' });
  }

  // Delete matches and standings to reset schedule – nur für dieses Turnier + Jahrgang
  await prisma.match.deleteMany({ where: { tournamentId, yearGroupId } });
  await prisma.standingsEntry.deleteMany({ where: { tournamentId, team: { yearGroupId } } });

  // Delete old time slots
  await prisma.timeSlot.deleteMany({ where: { tournamentId, yearGroupId } });

  // Create new time slots
  if (slots.length > 0) {
    const dataToInsert = slots.map((s: any, idx: number) => ({
      tournamentId,
      yearGroupId,
      date: new Date(s.date),
      startTime: s.startTime,
      endTime: s.endTime,
      label: s.label || 'Spielphase',
      order: idx
    }));

    await prisma.timeSlot.createMany({
      data: dataToInsert
    });
  }

  return res.status(200).json({ message: 'Zeitslots aktualisiert' });
};
