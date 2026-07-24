import { describe, it, expect } from 'vitest';
import { aggregateStandings, sortRows } from '../src/controllers/standings.controller.js';

const m = (teamAId: number | null, teamBId: number | null, scoreA: number | null, scoreB: number | null) =>
  ({ teamAId, teamBId, scoreA, scoreB });

describe('aggregateStandings', () => {
  it('zählt Siege/Unentschieden/Niederlagen, Tore und Punkte korrekt', () => {
    const rows = aggregateStandings([
      m(1, 2, 3, 1), // 1 gewinnt
      m(1, 3, 2, 2), // remis
      m(2, 3, 0, 1)  // 3 gewinnt
    ]);
    const byId = Object.fromEntries(rows.map(r => [r.teamId, r]));

    expect(byId[1]).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, goalsFor: 5, goalsAgainst: 3, points: 4 });
    expect(byId[2]).toMatchObject({ played: 2, won: 0, drawn: 0, lost: 2, goalsFor: 1, goalsAgainst: 4, points: 0 });
    expect(byId[3]).toMatchObject({ played: 2, won: 1, drawn: 1, lost: 0, goalsFor: 3, goalsAgainst: 2, points: 4 });
  });

  it('ignoriert Spiele ohne beide Teams oder ohne Ergebnis', () => {
    const rows = aggregateStandings([
      m(1, null, 3, 0),
      m(1, 2, null, null),
      m(1, 2, 2, 0)
    ]);
    expect(rows.find(r => r.teamId === 1)).toMatchObject({ played: 1, won: 1, points: 3 });
    expect(rows.find(r => r.teamId === 2)).toMatchObject({ played: 1, lost: 1, points: 0 });
  });
});

describe('sortRows', () => {
  it('sortiert nach Punkten, dann Tordifferenz, dann geschossenen Toren', () => {
    const rows = aggregateStandings([
      m(1, 2, 3, 1), // 1: +2 diff
      m(1, 3, 2, 2),
      m(2, 3, 0, 1)  // 3: +1 diff, gleiche Punkte wie 1
    ]);
    const sorted = sortRows(rows).map(r => r.teamId);
    // Team 1 (4 Pkt, +2) vor Team 3 (4 Pkt, +1) vor Team 2 (0 Pkt)
    expect(sorted).toEqual([1, 3, 2]);
  });

  it('bei gleicher Differenz entscheiden mehr geschossene Tore', () => {
    const a = { teamId: 10, points: 3, goalsFor: 5, goalsAgainst: 3, played: 1, won: 1, drawn: 0, lost: 0 };
    const b = { teamId: 20, points: 3, goalsFor: 2, goalsAgainst: 0, played: 1, won: 1, drawn: 0, lost: 0 };
    // gleiche Punkte (3), gleiche Differenz (+2) -> mehr Tore (5) gewinnt
    expect(sortRows([b, a]).map(r => r.teamId)).toEqual([10, 20]);
  });
});
