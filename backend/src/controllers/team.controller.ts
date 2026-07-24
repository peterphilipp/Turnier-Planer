import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const getTeamsByGroup = async (req: Request, res: Response) => {
  const groupId = parseInt(String(req.query.groupId as string));
  if (!groupId) return res.json([]);
  
  const teams = await prisma.team.findMany({
    where: { groupId },
    orderBy: { name: 'asc' }
  });
  return res.json(teams || []);
};

export const getTeamsByTournament = async (req: Request, res: Response) => {
  const tournamentId = parseInt(String(req.query.tournamentId as string));
  if (!tournamentId) return res.json([]);
  
  const yearGroupId = req.query.yearGroupId ? parseInt(String(req.query.yearGroupId as string)) : null;
  
  const where: any = { tournamentId };
  if (yearGroupId) where.yearGroupId = yearGroupId;
  
  const teams = await prisma.team.findMany({
    where,
    include: { club: true, yearGroup: true },
    orderBy: { name: 'asc' }
  });
  return res.json(teams || []);
};

export const teamSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  groupId: z.number().int().positive().nullable().optional(),
  tournamentId: z.number().int().positive().optional(),
  yearGroupId: z.number().int().positive().nullable().optional(),
  clubId: z.number().int().positive().nullable().optional(),
  goalsFor: z.number().int().min(0).optional(),
  goalsAgainst: z.number().int().min(0).optional()
});

export const createTeam = async (req: Request, res: Response) => {
  const t = await prisma.team.create({ data: req.body });

  // Das Ändern des Teilnehmerfelds invalidiert den generierten Spielplan – aber
  // NUR für dieses Turnier + diesen Jahrgang. yearGroupId allein ist turnier-
  // übergreifend geteilt und würde sonst fremde Turniere mit-löschen.
  if (t.yearGroupId && t.tournamentId) {
    await prisma.match.deleteMany({ where: { tournamentId: t.tournamentId, yearGroupId: t.yearGroupId } });
    await prisma.standingsEntry.deleteMany({ where: { tournamentId: t.tournamentId, team: { yearGroupId: t.yearGroupId } } });
  }

  res.status(201).json(t);
};

export const updateTeam = async (req: Request, res: Response) => {
  const t = await prisma.team.update({
    where: { id: parseInt(String(req.params.id as string)) },
    data: req.body
  });
  return res.json(t);
};

export const deleteTeam = async (req: Request, res: Response) => {
  const teamId = parseInt(String(req.params.id as string));
  const team = await prisma.team.findUnique({ where: { id: teamId } });

  // Nur den Spielplan dieses Turniers + Jahrgangs invalidieren (siehe createTeam).
  if (team?.yearGroupId && team.tournamentId) {
    await prisma.match.deleteMany({ where: { tournamentId: team.tournamentId, yearGroupId: team.yearGroupId } });
    await prisma.standingsEntry.deleteMany({ where: { tournamentId: team.tournamentId, team: { yearGroupId: team.yearGroupId } } });
  }

  await prisma.team.delete({ where: { id: teamId } });
  return res.status(204).send();
};
