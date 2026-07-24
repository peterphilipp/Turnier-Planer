import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const workAreaSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  icon: z.string().optional(),
  minVolunteers: z.number().int().min(1).optional(),
  maxVolunteers: z.number().int().min(1).optional(),
  color: z.string().optional()
});

export const getWorkAreas = async (req: Request, res: Response) => {
  const areas = await prisma.workArea.findMany({ orderBy: { id: 'asc' } });
  return res.json(areas || []);
};

export const createWorkArea = async (req: Request, res: Response) => {
  const a = await prisma.workArea.create({ data: req.body });
  return res.status(201).json(a);
};

export const updateWorkArea = async (req: Request, res: Response) => {
  const a = await prisma.workArea.update({
    where: { id: parseInt(req.params.id as string) },
    data: req.body
  });
  return res.json(a);
};

export const deleteWorkArea = async (req: Request, res: Response) => {
  const usedShifts = await prisma.shift.findMany({
    where: { arbeitsbereichId: parseInt(req.params.id as string) },
    include: { tournament: true }
  });
  const activeShifts = usedShifts.filter(s => s.tournament && s.tournament.status === 'aktiv');
  
  if (activeShifts.length > 0) {
    return res.status(409).json({
      error: 'WorkArea wird noch in einem aktiven Turnier verwendet.',
      activeTournaments: activeShifts.map(s => ({ id: s.tournament.id, name: s.tournament.name }))
    });
  }
  
  if (usedShifts.length > 0) {
    return res.status(409).json({
      error: usedShifts.length + ' bestehende Schicht(en) verwenden diesen Bereich.'
    });
  }
  
  await prisma.workArea.delete({ where: { id: parseInt(req.params.id as string) } });
  return res.status(204).send();
};
