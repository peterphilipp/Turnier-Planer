import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { logClubCreated } from '../utils/logger.js';

export const getClubs = async (req: Request, res: Response) => {
  const clubs = await prisma.club.findMany();
  res.json(clubs);
};

export const createClub = async (req: Request, res: Response) => {
  const { name, city, logo, primaryColor, secondaryColor, accentColor } = req.body;
  const club = await prisma.club.create({
    data: { name, city: city || null, logo, primaryColor, secondaryColor, accentColor }
  });
  logClubCreated(club.id, club.name);
  res.json(club);
};

export const updateClub = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, city, logo, primaryColor, secondaryColor, accentColor } = req.body;
  const club = await prisma.club.update({
    where: { id: parseInt(id as string) },
    data: { name, city: city || null, logo, primaryColor, secondaryColor, accentColor }
  });
  res.json(club);
};

export const deleteClub = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.club.delete({ where: { id: parseInt(id as string) } });
  res.status(204).send();
};
