import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const groupSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  order: z.number().int().optional(),
  tournamentId: z.number().int().positive(),
  yearGroupId: z.number().int().positive().nullable().optional()
});

export const getGroupsByTournament = async (req: Request, res: Response) => {
  const tournamentId = parseInt(String(req.params.tournamentId as string));
  const yearGroupId = req.query.yearGroupId ? parseInt(String(req.query.yearGroupId as string)) : null;
  
  const where: any = { tournamentId };
  if (yearGroupId) where.yearGroupId = yearGroupId;
  
  const gs = await prisma.group.findMany({
    where,
    include: { teams: true, yearGroup: true }
  });
  return res.json(gs || []);
};

export const createGroup = async (req: Request, res: Response) => {
  const g = await prisma.group.create({ data: req.body });
  res.status(201).json(g);
};

export const updateGroup = async (req: Request, res: Response) => {
  const g = await prisma.group.update({
    where: { id: parseInt(String(req.params.id as string)) },
    data: req.body,
    include: { teams: true }
  });
  return res.json(g);
};

export const deleteGroup = async (req: Request, res: Response) => {
  await prisma.group.delete({ where: { id: parseInt(String(req.params.id as string)) } });
  return res.status(204).send();
};
