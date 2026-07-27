import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { logClubCreated } from '../utils/logger.js';
import { z } from 'zod';

// Hex-Farbe, da der Wert im Frontend direkt in style/background landet.
// Zusätzlich zu heller (nahezu weißer) Farben ablehnen: der Wert wird u.a. als
// Button-Hintergrund verwendet und würde sonst mit weißer/eigener Schrift
// unleserlich - Frontend prüft das schon vor dem Absenden, hier zusätzlich
// serverseitig, falls die API direkt (ohne UI) angesprochen wird.
const hexColor = z.string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Farbe muss ein Hex-Wert wie #aabbcc sein')
  .refine(hex => {
    const r = parseInt(hex.substring(1, 3), 16), g = parseInt(hex.substring(3, 5), 16), b = parseInt(hex.substring(5, 7), 16);
    return !(r > 235 && g > 235 && b > 235);
  }, { message: 'Farbe ist zu hell (nahezu weiß) und würde Buttons/Verläufe unleserlich machen.' });

export const clubSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(200),
  // '' wird vom Controller zu null normalisiert (city: city || null)
  city: z.string().max(200).optional().or(z.literal('')),
  // Base64-Logo; Deckelung deutlich unter dem express.json-Limit von 10mb
  logo: z.string().max(8_000_000).optional().or(z.literal('')),
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional()
});

export const getClubs = async (req: Request, res: Response) => {
  const clubs = await prisma.club.findMany();
  res.json(clubs);
};

export const createClub = async (req: Request, res: Response) => {
  const { name, city, logo, primaryColor, secondaryColor } = req.body;
  const club = await prisma.club.create({
    data: { name, city: city || null, logo, primaryColor, secondaryColor }
  });
  logClubCreated(club.id, club.name);
  res.json(club);
};

export const updateClub = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, city, logo, primaryColor, secondaryColor } = req.body;
  const club = await prisma.club.update({
    where: { id: parseInt(id as string) },
    data: { name, city: city || null, logo, primaryColor, secondaryColor }
  });
  res.json(club);
};

export const deleteClub = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.club.delete({ where: { id: parseInt(id as string) } });
  res.status(204).send();
};
