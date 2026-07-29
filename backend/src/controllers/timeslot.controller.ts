import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';

// HH:MM, wie vom <input type="time"> im Frontend erzeugt
const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const isValidDateString = (v: string) => !isNaN(Date.parse(v));

export const timeSlotSchema = z.object({
  tournamentId: z.number().int().positive(),
  yearGroupId: z.number().int().positive().nullable().optional(),
  date: z.string().min(1).refine(isValidDateString, { message: 'Ungültiges Datum' }),
  startTime: z.string().regex(timeRegex, 'Zeit muss im Format HH:MM sein'),
  endTime: z.string().regex(timeRegex, 'Zeit muss im Format HH:MM sein'),
  label: z.string().max(100).nullable().optional(),
  order: z.number().int().min(0).optional()
});

// Für POST: zusätzlich Cross-Field-Check (nur hier alle Felder garantiert vorhanden)
export const createTimeSlotSchema = timeSlotSchema.refine(
  d => d.endTime > d.startTime,
  { message: 'Endzeit muss nach der Startzeit liegen.', path: ['endTime'] }
);

const bulkSlotSchema = z.object({
  date: z.string().min(1).refine(isValidDateString, { message: 'Ungültiges Datum' }),
  startTime: z.string().regex(timeRegex, 'Zeit muss im Format HH:MM sein'),
  endTime: z.string().regex(timeRegex, 'Zeit muss im Format HH:MM sein'),
  label: z.string().max(100).optional()
}).refine(
  d => d.endTime > d.startTime,
  { message: 'Endzeit muss nach der Startzeit liegen.', path: ['endTime'] }
);

export const bulkUpdateTimeSlotsSchema = z.object({
  tournamentId: z.number().int().positive(),
  yearGroupId: z.number().int().positive(),
  slots: z.array(bulkSlotSchema).max(200)
});

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
  // req.body bereits durch validate(createTimeSlotSchema) geparst/geprüft
  const { tournamentId, date, startTime, endTime, label, order, yearGroupId } = req.body;

  const slot = await prisma.timeSlot.create({
    data: {
      tournamentId,
      yearGroupId: yearGroupId ?? null,
      date: new Date(date),
      startTime,
      endTime,
      label,
      order: order ?? 0
    },
    include: { matches: true }
  });
  res.status(201).json(slot);
};

export const updateTimeSlot = async (req: Request, res: Response) => {
  // Nur erlaubte Felder übernehmen (kein Mass-Assignment über rohen req.body)
  const { date, startTime, endTime, label, order, yearGroupId } = req.body;
  const data: Record<string, unknown> = {};
  if (date !== undefined) data.date = new Date(date);
  if (startTime !== undefined) data.startTime = startTime;
  if (endTime !== undefined) data.endTime = endTime;
  if (label !== undefined) data.label = label;
  if (order !== undefined) data.order = order;
  if (yearGroupId !== undefined) data.yearGroupId = yearGroupId;

  const slot = await prisma.timeSlot.update({
    where: { id: parseInt(String(req.params.id as string)) },
    data,
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
  // req.body bereits durch validate(bulkUpdateTimeSlotsSchema) geparst/geprüft
  const { tournamentId, yearGroupId, slots } = req.body as {
    tournamentId: number;
    yearGroupId: number;
    slots: { date: string; startTime: string; endTime: string; label?: string }[];
  };

  // Delete matches and standings to reset schedule – nur für dieses Turnier + Jahrgang
  await prisma.match.deleteMany({ where: { tournamentId, yearGroupId } });
  await prisma.standingsEntry.deleteMany({ where: { tournamentId, team: { yearGroupId } } });

  // Delete old time slots
  await prisma.timeSlot.deleteMany({ where: { tournamentId, yearGroupId } });

  // Create new time slots
  if (slots.length > 0) {
    const dataToInsert = slots.map((s, idx) => ({
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
