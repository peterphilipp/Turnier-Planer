import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const globalTimeSlotSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  color: z.string().optional(),
  order: z.number().int().optional()
});

export const getGlobalTimeSlots = async (req: Request, res: Response) => {
  const slots = await prisma.globalTimeSlot.findMany({ orderBy: { order: 'asc' } });
  return res.json(slots || []);
};

export const createGlobalTimeSlot = async (req: Request, res: Response) => {
  const s = await prisma.globalTimeSlot.create({ data: req.body });
  return res.status(201).json(s);
};

export const updateGlobalTimeSlot = async (req: Request, res: Response) => {
  const usedShifts = await prisma.shift.findMany({
    where: { zeitslotId: parseInt(req.params.id as string) }
  });
  
  if (usedShifts.length > 0) {
    return res.status(409).json({
      error: usedShifts.length + ' bestehende Schicht(en) verwenden diesen Zeitslot und können nicht geändert werden.'
    });
  }
  
  const s = await prisma.globalTimeSlot.update({
    where: { id: parseInt(req.params.id as string) },
    data: req.body
  });
  return res.json(s);
};

export const deleteGlobalTimeSlot = async (req: Request, res: Response) => {
  const usedShifts = await prisma.shift.findMany({
    where: { zeitslotId: parseInt(req.params.id as string) },
    include: { tournament: true }
  });
  const activeShifts = usedShifts.filter(s => s.tournament && s.tournament.status === 'aktiv');
  
  if (activeShifts.length > 0) {
    return res.status(409).json({
      error: 'Zeitslot wird noch in einem aktiven Turnier verwendet und kann nicht gelöscht werden.',
      activeTournaments: activeShifts.map(s => ({ id: s.tournament.id, name: s.tournament.name }))
    });
  }
  
  if (usedShifts.length > 0) {
    return res.status(409).json({
      error: usedShifts.length + ' bestehende Schicht(en) verwenden diesen Zeitslot.'
    });
  }
  
  await prisma.globalTimeSlot.delete({ where: { id: parseInt(req.params.id as string) } });
  return res.status(204).send();
};
