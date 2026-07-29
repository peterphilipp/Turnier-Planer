import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const addTournamentClubSchema = z.object({
  tournamentId: z.number().int().positive(),
  clubId: z.number().int().positive()
});

export const getTournamentClubs = async (req: Request, res: Response) => {
  const tournamentId = parseInt(String(req.query.tournamentId as string));
  if (!tournamentId) return res.status(400).json({ error: 'tournamentId erforderlich' });
  
  const clubs = await prisma.tournamentClub.findMany({
    where: { tournamentId },
    include: { club: true },
    orderBy: { club: { name: 'asc' } }
  });
  return res.json(clubs.map(tc => tc.club));
};

export const addTournamentClub = async (req: Request, res: Response) => {
  // bereits von validate(addTournamentClubSchema) geparst/bereinigt
  const { tournamentId, clubId } = req.body;

  try {
    const tc = await prisma.tournamentClub.create({
      data: { tournamentId, clubId },
      include: { club: true }
    });
    res.status(201).json(tc.club);
  } catch (error: unknown) {
    if ((error as any).code === 'P2002') {
      return res.status(409).json({ error: 'Verein ist bereits hinzugefügt' });
    }
    throw error;
  }
};

export const removeTournamentClub = async (req: Request, res: Response) => {
  const { tournamentId, clubId } = req.query;
  
  if (!tournamentId || !clubId) {
    return res.status(400).json({ error: 'tournamentId und clubId erforderlich' });
  }

  await prisma.tournamentClub.deleteMany({
    where: { tournamentId: parseInt(String(tournamentId as string)), clubId: parseInt(String(clubId as string)) }
  });
  return res.status(204).send();
};
