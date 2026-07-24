import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const volunteerShiftSchema = z.object({
  userId: z.union([z.number(), z.string()]).transform(Number),
  tournamentId: z.union([z.number(), z.string()]).transform(Number).optional().nullable(),
  date: z.string().datetime().or(z.date()),
  slot: z.string().min(1),
  role: z.string().min(1),
  areaId: z.string().optional().nullable()
});

export const getVolunteerShifts = async (req: Request, res: Response) => {
  const { tournamentId } = req.query;
  const where = tournamentId ? { tournamentId: parseInt(tournamentId as string) } : {};
  const shifts = await prisma.volunteerShift.findMany({
    where,
    orderBy: { date: 'asc' },
    include: { user: true },
  });
  return res.json(shifts || []);
};

export const createVolunteerShift = async (req: Request, res: Response) => {
  const { userId, tournamentId, date, slot, role, areaId } = req.body;
  const s = await prisma.volunteerShift.create({
    data: {
      userId: parseInt(userId as string),
      tournamentId: tournamentId ? parseInt(tournamentId as string) : null,
      date: new Date(date).toISOString(),
      slot, role, areaId: areaId || null,
    },
    include: { user: true }
  });
  return res.status(201).json(s);
};

export const updateVolunteerShift = async (req: Request, res: Response) => {
  const body = req.body;
  const { slot, role, userId, areaId, date } = body;
  const validDate = date ? new Date(date) : undefined;
  
  const updated = await prisma.volunteerShift.update({
    where: { id: parseInt(req.params.id as string) },
    data: {
      slot: slot || body.slot,
      role: role || body.role,
      userId: userId ? parseInt(userId as string) : body.userId,
      areaId: areaId || body.areaId,
      date: validDate ? validDate.toISOString() : undefined,
    },
    include: { user: true }
  });
  return res.json(updated);
};

export const deleteVolunteerShift = async (req: Request, res: Response) => {
  await prisma.volunteerShift.delete({ where: { id: parseInt(req.params.id as string) } });
  return res.status(204).send();
};
