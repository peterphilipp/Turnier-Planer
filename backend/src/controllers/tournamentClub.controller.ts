import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const getTournamentClubs = async (req: Request, res: Response) => {
  const tournamentId = parseInt(String(req.query.tournamentId));
  if (!tournamentId) return res.status(400).json({ error: 'tournamentId erforderlich' });
  
  const clubs = await prisma.tournamentClub.findMany({
    where: { tournamentId },
    include: { club: true },
    orderBy: { club: { name: 'asc' } }
  });
  return res.json(clubs.map(tc => tc.club));
};

export const addTournamentClub = async (req: Request, res: Response) => {
  const { tournamentId, clubId } = req.body;
  
  if (!tournamentId || !clubId) {
    return res.status(400).json({ error: 'tournamentId und clubId erforderlich' });
  }

  try {
    const tc = await prisma.tournamentClub.create({
      data: { tournamentId, clubId },
      include: { club: true }
    });
    res.status(201).json(tc.club);
  } catch (error: any) {
    if (error.code === 'P2002') {
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
    where: { tournamentId: parseInt(String(tournamentId)), clubId: parseInt(String(clubId)) }
  });
  return res.status(204).send();
};
