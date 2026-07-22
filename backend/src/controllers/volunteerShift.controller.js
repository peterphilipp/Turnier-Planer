import prisma from '../config/prisma.js';
import { z } from 'zod';

export const volunteerShiftSchema = z.object({
  volunteerId: z.union([z.number(), z.string()]).transform(Number),
  tournamentId: z.union([z.number(), z.string()]).transform(Number).optional().nullable(),
  date: z.string().datetime().or(z.date()),
  slot: z.string().min(1),
  role: z.string().min(1),
  areaId: z.string().optional().nullable()
});

export const getVolunteerShifts = async (req, res) => {
  const { tournamentId } = req.query;
  const where = tournamentId ? { tournamentId: parseInt(tournamentId) } : {};
  const shifts = await prisma.volunteerShift.findMany({
    where,
    orderBy: { date: 'asc' },
  });
  return res.json(shifts || []);
};

export const createVolunteerShift = async (req, res) => {
  const { volunteerId, tournamentId, date, slot, role, areaId } = req.body;
  const s = await prisma.volunteerShift.create({
    data: {
      volunteerId: parseInt(volunteerId),
      tournamentId: tournamentId ? parseInt(tournamentId) : null,
      date: new Date(date).toISOString(),
      slot, role, areaId: areaId || null,
    },
    include: { volunteer: true }
  });
  return res.status(201).json(s);
};

export const updateVolunteerShift = async (req, res) => {
  const body = req.body;
  const { slot, role, volunteerId, areaId, date } = body;
  const validDate = date ? new Date(date) : undefined;
  
  const updated = await prisma.volunteerShift.update({
    where: { id: parseInt(req.params.id) },
    data: {
      slot: slot || body.slot,
      role: role || body.role,
      volunteerId: volunteerId ? parseInt(volunteerId) : body.volunteerId,
      areaId: areaId || body.areaId,
      date: validDate ? validDate.toISOString() : undefined,
    },
    include: { volunteer: true }
  });
  return res.json(updated);
};

export const deleteVolunteerShift = async (req, res) => {
  await prisma.volunteerShift.delete({ where: { id: parseInt(req.params.id) } });
  return res.status(204).send();
};
