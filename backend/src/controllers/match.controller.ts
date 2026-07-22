import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const matchSchema = z.object({
  tournamentId: z.number().int().positive(),
  teamAId: z.number().int().positive(),
  teamBId: z.number().int().positive(),
  scoreA: z.number().int().min(0).nullable().optional(),
  scoreB: z.number().int().min(0).nullable().optional(),
  field: z.string().optional(),
  time: z.string().datetime().or(z.date())
});

export const getMatchesByTournament = async (req: Request, res: Response) => {
  if (!req.params.tournamentId) return res.json([]);
  const ms = await prisma.match.findMany({
    where: { tournamentId: parseInt(req.params.tournamentId) },
    include: { teamA: true, teamB: true }
  });
  return res.json(ms || []);
};

export const createMatch = async (req: Request, res: Response) => {
  const m = await prisma.match.create({ data: req.body });
  res.status(201).json(m);
};

export const updateMatch = async (req: Request, res: Response) => {
  const m = await prisma.match.update({
    where: { id: parseInt(req.params.id) },
    data: req.body
  });
  return res.json(m);
};
