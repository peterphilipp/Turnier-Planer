import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const matchSchema = z.object({
  tournamentId: z.number().int().positive(),
  yearGroupId: z.number().int().positive().nullable().optional(),
  timeSlotId: z.number().int().positive().nullable().optional(),
  fieldId: z.number().int().positive().nullable().optional(),
  teamAId: z.number().int().positive(),
  teamBId: z.number().int().positive(),
  scoreA: z.number().int().min(0).nullable().optional(),
  scoreB: z.number().int().min(0).nullable().optional(),
  phase: z.string().optional(),
  runde: z.string().nullable().optional(),
  bracketTyp: z.enum(['sieger', 'verlierer']).nullable().optional(),
  siegerId: z.number().int().positive().nullable().optional(),
  verliererId: z.number().int().positive().nullable().optional(),
  status: z.enum(['geplant', 'gespielt', 'abgesagt']).optional(),
  time: z.string().datetime().or(z.date())
});

export const getMatchesByTournament = async (req: Request, res: Response) => {
  if (!req.params.tournamentId) return res.json([]);
  const ms = await prisma.match.findMany({
    where: { tournamentId: parseInt(String(req.params.tournamentId)) },
    include: { teamA: true, teamB: true, timeSlot: true, field: true, bracket: true },
    orderBy: [{ time: 'asc' }]
  });
  return res.json(ms || []);
};

export const createMatch = async (req: Request, res: Response) => {
  const body = req.body;
  if (body.time) body.time = new Date(body.time);
  
  if (body.teamAId === body.teamBId) {
    return res.status(400).json({ error: 'Team A und Team B dürfen nicht identisch sein' });
  }

  const m = await prisma.match.create({ data: body, include: { teamA: true, teamB: true, timeSlot: true, field: true } });
  res.status(201).json(m);
};

/**
 * K.O.-Weitergabe: Wenn ein Match gespielt ist, nächstes Match automatisch aktualisieren.
 */
export const advanceKO = async (req: Request, res: Response) => {
  const matchId = parseInt(String(req.params.id));
  const { siegerId, verliererId } = req.body;

  if (!siegerId || !verliererId) {
    return res.status(400).json({ error: 'siegerId und verliererId erforderlich' });
  }

  // Match aktualisieren
  const match = await prisma.match.update({
    where: { id: matchId },
    data: { status: 'gespielt', siegerId, verliererId },
    include: { teamA: true, teamB: true }
  });

  // Nächstes Match in der gleichen Bracket-Runde finden
  if (match.bracketId) {
    const bracket = await prisma.knockoutBracket.findUnique({ where: { id: match.bracketId } });
    if (bracket) {
      const nextRundeOrder = bracket.order + 1;
      const nextBracket = await prisma.knockoutBracket.findFirst({
        where: { tournamentId: bracket.tournamentId, order: nextRundeOrder }
      });

      if (nextBracket) {
        // Freies Slot in nächster Runde finden
        const existingMatches = await prisma.match.findMany({
          where: { bracketId: nextBracket.id },
          orderBy: { id: 'asc' }
        });

        // Prüfen ob ein freies Slot existiert (noch kein TeamA)
        let freeMatch = existingMatches.find(m => !m.teamAId);
        if (!freeMatch) {
          // Neues Match erstellen
          const matchCount = Math.ceil(existingMatches.length / 2);
          freeMatch = await prisma.match.create({
            data: {
              tournamentId: bracket.tournamentId,
              bracketId: nextBracket.id,
              teamAId: 0,
              teamBId: 0,
              time: new Date()
            }
          });
        }

        // Sieger in TeamA oder TeamB setzen (je nach Position)
        const slotInRunde = existingMatches.findIndex(m => m.id === freeMatch?.id);
        if (slotInRunde % 2 === 0) {
          await prisma.match.update({ where: { id: freeMatch!.id }, data: { teamAId: siegerId } });
        } else {
          await prisma.match.update({ where: { id: freeMatch!.id }, data: { teamBId: siegerId } });
        }
      }
    }
  }

  return res.json(match);
};

export const updateMatch = async (req: Request, res: Response) => {
  const body = req.body;
  if (body.time) body.time = new Date(body.time);
  
  const existing = await prisma.match.findUnique({ where: { id: parseInt(String(req.params.id)) } });
  if (existing && body.teamAId === body.teamBId && body.teamAId !== undefined) {
    return res.status(400).json({ error: 'Team A und Team B dürfen nicht identisch sein' });
  }

  const m = await prisma.match.update({
    where: { id: parseInt(String(req.params.id)) },
    data: body,
    include: { teamA: true, teamB: true, timeSlot: true, field: true }
  });
  
  // Standings werden jetzt client-seitig neu geladen (React Query)
  // Hier nur das Match zurückgeben
  
  return res.json(m);
};

export const deleteMatch = async (req: Request, res: Response) => {
  await prisma.match.delete({ where: { id: parseInt(String(req.params.id)) } });
  return res.status(204).send();
};

async function recalculateStandingsForTournament(tournamentId: number) {
  const matches = await prisma.match.findMany({
    where: { tournamentId, status: 'gespielt', scoreA: { not: null }, scoreB: { not: null } },
    include: { teamA: true, teamB: true }
  });

  const teamStats = new Map<number, { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number }>();

  for (const m of matches) {
    const scoreA = m.scoreA ?? 0;
    const scoreB = m.scoreB ?? 0;
    
    let a = teamStats.get(m.teamAId);
    if (!a) { a = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }; teamStats.set(m.teamAId, a); }
    a.played++;
    a.goalsFor += scoreA;
    a.goalsAgainst += scoreB;
    if (scoreA > scoreB) a.won++;
    else if (scoreA === scoreB) a.drawn++;
    else a.lost++;

    let b = teamStats.get(m.teamBId);
    if (!b) { b = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }; teamStats.set(m.teamBId, b); }
    b.played++;
    b.goalsFor += scoreB;
    b.goalsAgainst += scoreA;
    if (scoreB > scoreA) b.won++;
    else if (scoreB === scoreA) b.drawn++;
    else b.lost++;
  }

  const entries = await Promise.all(
    Array.from(teamStats.entries()).map(async ([teamId, stats]) => {
      const points = (stats.won * 3) + stats.drawn;
      return prisma.standingsEntry.upsert({
        where: { teamId_tournamentId: { teamId, tournamentId } },
        update: { ...stats, points },
        create: { teamId, tournamentId, ...stats, points }
      });
    })
  );

  const sorted = entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    return b.goalsFor - a.goalsFor;
  });

  for (let i = 0; i < sorted.length; i++) {
    await prisma.standingsEntry.update({
      where: { id: sorted[i].id },
      data: { position: i + 1 }
    });
  }
}
