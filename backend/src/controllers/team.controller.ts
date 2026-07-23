import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const getTeamsByGroup = async (req: Request, res: Response) => {
  const groupId = parseInt(String(req.query.groupId));
  if (!groupId) return res.json([]);
  
  const teams = await prisma.team.findMany({
    where: { groupId },
    orderBy: { name: 'asc' }
  });
  return res.json(teams || []);
};

export const getTeamsByTournament = async (req: Request, res: Response) => {
  const tournamentId = parseInt(String(req.query.tournamentId));
  if (!tournamentId) return res.json([]);
  
  const teams = await prisma.team.findMany({
    where: { tournamentId },
    include: { club: true },
    orderBy: { name: 'asc' }
  });
  return res.json(teams || []);
};

export const teamSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  groupId: z.number().int().positive().nullable().optional(),
  tournamentId: z.number().int().positive().optional(),
  clubId: z.number().int().positive().nullable().optional(),
  goalsFor: z.number().int().min(0).optional(),
  goalsAgainst: z.number().int().min(0).optional()
});

export const createTeam = async (req: Request, res: Response) => {
  const t = await prisma.team.create({ data: req.body });
  res.status(201).json(t);
};

export const updateTeam = async (req: Request, res: Response) => {
  const t = await prisma.team.update({
    where: { id: parseInt(String(req.params.id)) },
    data: req.body
  });
  return res.json(t);
};

export const deleteTeam = async (req: Request, res: Response) => {
  await prisma.team.delete({ where: { id: parseInt(String(req.params.id)) } });
  return res.status(204).send();
};
