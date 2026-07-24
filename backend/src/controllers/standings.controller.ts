import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';

interface StandingsRow {
  teamId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

/**
 * Nur gespielte GRUPPEN-/Liga-Spiele (bracketId: null) fließen in die Tabelle
 * ein – K.O.-Spiele dürfen sie nicht verfälschen.
 */
const matchWhere = (tournamentId: number, yearGroupId: number | null): Prisma.MatchWhereInput => ({
  tournamentId,
  bracketId: null,
  status: 'gespielt',
  scoreA: { not: null },
  scoreB: { not: null },
  ...(yearGroupId ? { yearGroupId } : {})
});

/** Reine Aggregation pro Team (ohne DB-Zugriff). */
export function aggregateStandings(
  matches: { teamAId: number | null; teamBId: number | null; scoreA: number | null; scoreB: number | null }[]
): StandingsRow[] {
  const stats = new Map<number, StandingsRow>();
  const ensure = (teamId: number) => {
    let s = stats.get(teamId);
    if (!s) {
      s = { teamId, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      stats.set(teamId, s);
    }
    return s;
  };

  for (const m of matches) {
    if (!m.teamAId || !m.teamBId || m.scoreA === null || m.scoreB === null) continue;
    const a = ensure(m.teamAId);
    const b = ensure(m.teamBId);
    a.played++; b.played++;
    a.goalsFor += m.scoreA; a.goalsAgainst += m.scoreB;
    b.goalsFor += m.scoreB; b.goalsAgainst += m.scoreA;
    if (m.scoreA > m.scoreB) { a.won++; b.lost++; }
    else if (m.scoreA === m.scoreB) { a.drawn++; b.drawn++; }
    else { a.lost++; b.won++; }
  }

  for (const s of stats.values()) s.points = s.won * 3 + s.drawn;
  return Array.from(stats.values());
}

/** Sortierung: Punkte DESC, dann Tordifferenz DESC, dann geschossene Tore DESC. */
export const sortRows = <T extends { points: number; goalsFor: number; goalsAgainst: number }>(rows: T[]): T[] =>
  [...rows].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diff = (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst);
    if (diff !== 0) return diff;
    return b.goalsFor - a.goalsFor;
  });

/**
 * Berechnet die Tabelle und PERSISTIERT sie (StandingsEntry-Upserts + Positionen).
 * Wird vom Recalc-Endpoint genutzt. Das Lesen (getStandings) benötigt das nicht.
 */
async function computeStandings(tournamentId: number, yearGroupId: number | null) {
  const matches = await prisma.match.findMany({ where: matchWhere(tournamentId, yearGroupId) });
  const rows = aggregateStandings(matches);

  const entries = await Promise.all(
    rows.map(r =>
      prisma.standingsEntry.upsert({
        where: { teamId_tournamentId: { teamId: r.teamId, tournamentId } },
        update: { played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, goalsFor: r.goalsFor, goalsAgainst: r.goalsAgainst, points: r.points },
        create: { teamId: r.teamId, tournamentId, played: r.played, won: r.won, drawn: r.drawn, lost: r.lost, goalsFor: r.goalsFor, goalsAgainst: r.goalsAgainst, points: r.points }
      })
    )
  );

  const sorted = sortRows(entries);
  for (let i = 0; i < sorted.length; i++) {
    await prisma.standingsEntry.update({ where: { id: sorted[i].id }, data: { position: i + 1 } });
  }
  return sorted;
}

/**
 * Berechnet die Tabelle für ein Turnier neu, persistiert sie und gibt sie zurück.
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

/**
 * Liefert die aktuelle Tabelle – IMMER frisch aus den Spielen berechnet, ohne
 * Schreibzugriff. Dadurch spiegelt sie jede Ergebnisänderung sofort wider und
 * der öffentliche Endpunkt löst keine DB-Schreibvorgänge (Write-on-Read) aus.
 */
export const getStandings = async (req: Request, res: Response) => {
  const tournamentId = parseInt(req.params.tournamentId as string);
  const yearGroupId = req.query.yearGroupId ? parseInt(String(req.query.yearGroupId as string)) : null;

  if (!tournamentId) {
    return res.status(400).json({ error: 'tournamentId erforderlich' });
  }

  const matches = await prisma.match.findMany({ where: matchWhere(tournamentId, yearGroupId) });
  const sorted = sortRows(aggregateStandings(matches)).map((r, i) => ({
    ...r,
    id: r.teamId,          // stabiler Key für das Frontend (kein DB-Eintrag nötig)
    tournamentId,
    position: i + 1
  }));

  return res.json(sorted);
};
