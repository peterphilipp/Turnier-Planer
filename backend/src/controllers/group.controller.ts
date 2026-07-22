import prisma from '../config/prisma.js';
import { z } from 'zod';

export const groupSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  tournamentId: z.number().int().positive()
});

export const getGroupsByTournament = async (req, res) => {
  const gs = await prisma.group.findMany({
    where: { tournamentId: parseInt(req.params.tournamentId) },
    include: { teams: true }
  });
  return res.json(gs || []);
};

export const createGroup = async (req, res) => {
  const g = await prisma.group.create({ data: req.body });
  res.status(201).json(g);
};

export const deleteGroup = async (req, res) => {
  await prisma.group.delete({ where: { id: parseInt(req.params.id) } });
  return res.status(204).send();
};
