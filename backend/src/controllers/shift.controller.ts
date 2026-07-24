import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

// Hinweis: Das Erzeugen von Shifts erfolgt künftig über die Tag-/Template-basierte
// Generierung (Etappe 2), nicht mehr über manuelles Anlegen einzelner Slots.

export const getShifts = async (req: Request, res: Response) => {
  const { tournamentId } = req.query;
  if (!tournamentId) return res.json([]);
  const shifts = await prisma.shift.findMany({
    where: { tournamentId: parseInt(tournamentId as string) },
    include: { day: true, daySlot: true, workArea: true },
    orderBy: [{ tournamentDayId: 'asc' }, { daySlotId: 'asc' }]
  });
  return res.json(shifts);
};

export const deleteShift = async (req: Request, res: Response) => {
  await prisma.shift.delete({ where: { id: parseInt(req.params.id as string) } });
  return res.status(204).send();
};
