import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

/**
 * Reine Berechnungs-/Persistenz-Funktion (ohne Response-Objekt).
 * Liest alle gespielten Matches, aggregiert pro Team, persistiert die
 * StandingsEntries und gibt die sortierten Einträge zurück.
 *
 * Wird sowohl vom Route-Handler `recalculateStandings` als auch von
 * `getStandings` genutzt – so wird die Antwort garantiert nur EINMAL gesendet.
 */
async function computeStandings(tournamentId: number, yearGroupId: number | null) {
  // Alle gespielten GRUPPEN-/Liga-Spiele des Turniers (oder nur eines Jahrgangs).
  // bracketId: null schließt K.O.-Spiele aus – diese dürfen die Gruppentabelle
  // nicht verfälschen.
  const matches = await prisma.match.findMany({
    where: yearGroupId
      ? { tournamentId, yearGroupId, bracketId: null, status: 'gespielt', scoreA: { not: null }, scoreB: { not: null } }
      : { tournamentId, bracketId: null, status: 'gespielt', scoreA: { not: null }, scoreB: { not: null } },
    include: { teamA: true, teamB: true }
  });

  // Aggregation pro Team
  const teamStats = new Map<number, { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number }>();

  for (const m of matches) {
    if (!m.teamAId || !m.teamBId) continue;
    // Team A stats
    let a = teamStats.get(m.teamAId);
    if (!a) { a = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }; teamStats.set(m.teamAId, a); }
    a.played++;
    const scoreA = m.scoreA ?? 0;
    const scoreB = m.scoreB ?? 0;
    a.goalsFor += scoreA;
    a.goalsAgainst += scoreB;
    if (scoreA > scoreB) a.won++;
    else if (scoreA === scoreB) a.drawn++;
    else a.lost++;

    // Team B stats
    let b = teamStats.get(m.teamBId);
    if (!b) { b = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }; teamStats.set(m.teamBId, b); }
    b.played++;
    b.goalsFor += scoreB;
    b.goalsAgainst += scoreA;
    if (scoreB > scoreA) b.won++;
    else if (scoreB === scoreA) b.drawn++;
    else b.lost++;
  }

  // Upsert für jedes Team
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

  // Positionen berechnen (nach Punkten DESC, dann Torverhältnis DESC)
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

  return sorted;
}

/**
 * Berechnet die Tabelle für ein Turnier neu und gibt sie zurück (Route-Handler).
 */
export const recalculateStandings = async (req: Request, res: Response) => {
  const tournamentId = parseInt(req.params.tournamentId as string);
  const yearGroupId = req.query.yearGroupId ? parseInt(String(req.query.yearGroupId as string)) : null;

  if (!tournamentId) {
    return res.status(400).json({ error: 'tournamentId erforderlich' });
  }

  const sorted = await computeStandings(tournamentId, yearGroupId);
  return res.json(sorted);
};

export const getStandings = async (req: Request, res: Response) => {
  const tournamentId = parseInt(req.params.tournamentId as string);
  const yearGroupId = req.query.yearGroupId ? parseInt(String(req.query.yearGroupId as string)) : null;

  if (!tournamentId) {
    return res.status(400).json({ error: 'tournamentId erforderlich' });
  }

  // Falls keine Einträge existieren, triggere Neuberechnung (nur EIN res.json unten)
  const existing = await prisma.standingsEntry.findMany({ where: { tournamentId } });
  if (existing.length === 0) {
    const sorted = await computeStandings(tournamentId, yearGroupId);
    return res.json(sorted);
  }

  // Positionen aktualisieren
  let sorted = [...existing].sort((a, b) => {
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

  // Falls yearGroupId angegeben → nur Teams dieses Jahrgangs filtern
  if (yearGroupId) {
    const teamsInYearGroup = await prisma.team.findMany({
      where: { tournamentId, yearGroupId },
      select: { id: true }
    });
    const teamIds = new Set(teamsInYearGroup.map(t => t.id));
    sorted = sorted.filter(e => teamIds.has(e.teamId));
  }

  return res.json(sorted);
};
