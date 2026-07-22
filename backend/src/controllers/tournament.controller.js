import prisma from '../config/prisma.js';
import { z } from 'zod';

export const tournamentSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  description: z.string().optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  endDate: z.string().datetime().or(z.date()).optional(),
  status: z.string().optional()
});

export const getTournaments = async (req, res) => {
  const ts = await prisma.tournament.findMany({ orderBy: { startDate: 'desc' } });
  return res.json(ts || []);
};

export const getTournamentById = async (req, res) => {
  const t = await prisma.tournament.findUnique({
    where: { id: parseInt(req.params.id) },
    include: { groups: { include: { teams: true } }, matches: true, shifts: true, volunteerShifts: true }
  });
  if (!t) return res.status(404).json({ error: 'Turnier nicht gefunden' });
  return res.json(t);
};

export const createTournament = async (req, res) => {
  const body = req.body;
  if (body.startDate) body.startDate = new Date(body.startDate);
  if (body.endDate) body.endDate = new Date(body.endDate);
  
  const t = await prisma.tournament.create({ data: body });
  res.status(201).json(t);
};

export const updateTournament = async (req, res) => {
  const body = req.body;
  if (body.startDate) body.startDate = new Date(body.startDate);
  if (body.endDate) body.endDate = new Date(body.endDate);
  
  const t = await prisma.tournament.update({
    where: { id: parseInt(req.params.id) },
    data: body
  });
  return res.json(t);
};

export const updateTournamentStatus = async (req, res) => {
  const t = await prisma.tournament.update({
    where: { id: parseInt(req.params.id) },
    data: { status: req.body.status }
  });
  return res.json(t);
};

export const deleteTournament = async (req, res) => {
  await prisma.tournament.delete({ where: { id: parseInt(req.params.id) } });
  return res.status(204).send();
};
