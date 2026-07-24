import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const getBracketsByTournament = async (req: Request, res: Response) => {
  const tournamentId = parseInt(String(req.query.tournamentId as string));
  if (!tournamentId) return res.status(400).json({ error: 'tournamentId erforderlich' });
  
  const brackets = await prisma.knockoutBracket.findMany({
    where: { tournamentId },
    include: { matches: { include: { teamA: true, teamB: true } } },
    orderBy: { order: 'asc' }
  });
  return res.json(brackets);
};

export const createBracket = async (req: Request, res: Response) => {
  const { tournamentId, name, runde, order } = req.body;
  
  if (!tournamentId || !name || !runde) {
    return res.status(400).json({ error: 'tournamentId, name und runde erforderlich' });
  }

  const bracket = await prisma.knockoutBracket.create({
    data: { tournamentId, name, runde, order: order || 0 },
    include: { matches: true }
  });
  res.status(201).json(bracket);
};

export const updateBracket = async (req: Request, res: Response) => {
  const bracket = await prisma.knockoutBracket.update({
    where: { id: parseInt(String(req.params.id as string)) },
    data: req.body,
    include: { matches: true }
  });
  return res.json(bracket);
};

export const deleteBracket = async (req: Request, res: Response) => {
  await prisma.knockoutBracket.delete({ where: { id: parseInt(String(req.params.id as string)) } });
  return res.status(204).send();
};
