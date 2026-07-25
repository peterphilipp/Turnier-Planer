import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';
import { sendPushToUser } from '../utils/push.js';

export const volunteerShiftSchema = z.object({
  userId: z.union([z.number(), z.string()]).transform(Number),
  tournamentId: z.union([z.number(), z.string()]).transform(Number).optional().nullable(),
  shiftId: z.union([z.number(), z.string()]).transform(Number).optional().nullable(),
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
  const { userId, tournamentId, shiftId, date, slot, role, areaId } = req.body;
  const s = await prisma.volunteerShift.create({
    data: {
      userId: parseInt(userId as string),
      tournamentId: tournamentId ? parseInt(tournamentId as string) : null,
      shiftId: shiftId ? parseInt(shiftId as string) : null,
      date: new Date(date).toISOString(),
      slot, role, areaId: areaId || null,
    },
    include: { user: true }
  });

  if (s.userId) {
    sendPushToUser(
      s.userId,
      'Schicht zugeteilt 📋',
      `Der Organisator hat dich als ${s.role} (${s.slot}) eingeplant.`,
      '/?view=selfservice'
    ).catch(() => {});
  }

  return res.status(201).json(s);
};

export const updateVolunteerShift = async (req: Request, res: Response) => {
  const body = req.body;
  const { slot, role, userId, areaId, date, shiftId } = body;
  const validDate = date ? new Date(date) : undefined;
  
  const updated = await prisma.volunteerShift.update({
    where: { id: parseInt(req.params.id as string) },
    data: {
      slot: slot || body.slot,
      role: role || body.role,
      userId: userId ? parseInt(userId as string) : body.userId,
      shiftId: shiftId !== undefined ? (shiftId ? parseInt(shiftId as string) : null) : undefined,
      areaId: areaId || body.areaId,
      date: validDate ? validDate.toISOString() : undefined,
    },
    include: { user: true }
  });
  return res.json(updated);
};

export const deleteVolunteerShift = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const existing = await prisma.volunteerShift.findUnique({ where: { id } });
  await prisma.volunteerShift.delete({ where: { id } });
  
  if (existing && existing.userId) {
    sendPushToUser(
      existing.userId,
      'Schicht geändert ℹ️',
      `Du wurdest aus der Schicht ${existing.role} (${existing.slot}) ausgeplant.`,
      '/?view=selfservice'
    ).catch(() => {});
  }
  
  return res.status(204).send();
};
