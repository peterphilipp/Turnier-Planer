import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const shiftSchema = z.object({
  tournamentId: z.union([z.number(), z.string()]).transform(Number),
  date: z.string().datetime().or(z.date()),
  zeitslotId: z.union([z.number(), z.string()]).transform(Number).optional().nullable(),
  arbeitsbereichId: z.union([z.number(), z.string()]).transform(Number).optional().nullable(),
  maxVolunteers: z.number().int().min(1).optional(),
  description: z.string().optional().nullable()
});

export const getShifts = async (req: Request, res: Response) => {
  const { tournamentId } = req.query;
  if (tournamentId) {
    const shifts = await prisma.shift.findMany({
      where: { tournamentId: parseInt(tournamentId as string) },
      include: { globalTimeSlot: true, workArea: true },
      orderBy: { date: 'asc' }
    });
    // Alias globalTimeSlot -> zeitslot und workArea -> arbeitsbereich für Frontend-Kompatibilität
    const mapped = shifts.map(s => ({ 
      ...s, 
      zeitslot: s.globalTimeSlot,
      arbeitsbereich: s.workArea,
      slot: s.globalTimeSlot ? `${s.globalTimeSlot.name} (${s.globalTimeSlot.startTime} - ${s.globalTimeSlot.endTime})` : ''
    }));
    return res.json(mapped);
  }
  return res.json([]);
};

export const createShift = async (req: Request, res: Response) => {
  const { tournamentId, date, zeitslotId, arbeitsbereichId, maxVolunteers, description } = req.body;
  const s = await prisma.shift.create({
    data: {
      tournamentId: parseInt(tournamentId as string),
      date: new Date(date).toISOString(),
      zeitslotId: zeitslotId ? parseInt(zeitslotId as string) : null,
      arbeitsbereichId: arbeitsbereichId ? parseInt(arbeitsbereichId as string) : null,
      maxVolunteers: maxVolunteers || 8,
      description: description || null,
    }
  });
  return res.status(201).json(s);
};

export const updateShift = async (req: Request, res: Response) => {
  const body = req.body;
  const validDate = body.date ? new Date(body.date) : undefined;
  const updated = await prisma.shift.update({
    where: { id: parseInt(req.params.id as string) },
    data: {
      date: validDate ? validDate.toISOString() : undefined,
      zeitslotId: body.zeitslotId ? parseInt(body.zeitslotId as string) : null,
      arbeitsbereichId: body.arbeitsbereichId ? parseInt(body.arbeitsbereichId as string) : null,
      maxVolunteers: body.maxVolunteers || 8,
      description: body.description || null,
    }
  });
  return res.json(updated);
};

export const deleteShift = async (req: Request, res: Response) => {
  await prisma.shift.delete({ where: { id: parseInt(req.params.id as string) } });
  return res.status(204).send();
};
