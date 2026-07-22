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

export const getShifts = async (req, res) => {
  const { tournamentId } = req.query;
  if (tournamentId) {
    const shifts = await prisma.shift.findMany({
      where: { tournamentId: parseInt(tournamentId) },
      include: { zeitslot: true, arbeitsbereich: true },
      orderBy: { date: 'asc' }
    });
    return res.json(shifts || []);
  }
  return res.json([]);
};

export const createShift = async (req, res) => {
  const { tournamentId, date, zeitslotId, arbeitsbereichId, maxVolunteers, description } = req.body;
  const s = await prisma.shift.create({
    data: {
      tournamentId: parseInt(tournamentId),
      date: new Date(date).toISOString(),
      zeitslotId: zeitslotId ? parseInt(zeitslotId) : null,
      arbeitsbereichId: arbeitsbereichId ? parseInt(arbeitsbereichId) : null,
      maxVolunteers: maxVolunteers || 8,
      description: description || null,
    }
  });
  return res.status(201).json(s);
};

export const updateShift = async (req, res) => {
  const body = req.body;
  const validDate = body.date ? new Date(body.date) : undefined;
  const updated = await prisma.shift.update({
    where: { id: parseInt(req.params.id) },
    data: {
      date: validDate ? validDate.toISOString() : undefined,
      zeitslotId: body.zeitslotId ? parseInt(body.zeitslotId) : null,
      arbeitsbereichId: body.arbeitsbereichId ? parseInt(body.arbeitsbereichId) : null,
      maxVolunteers: body.maxVolunteers || 8,
      description: body.description || null,
    }
  });
  return res.json(updated);
};

export const deleteShift = async (req, res) => {
  await prisma.shift.delete({ where: { id: parseInt(req.params.id) } });
  return res.status(204).send();
};
