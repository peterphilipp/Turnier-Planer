import { describe, it, expect } from 'vitest';
import { generateKnockoutTree, computeKoPropagation, type KoMatchNode } from '../src/utils/knockout.js';

const teams = (n: number) => Array.from({ length: n }, (_, i) => ({ teamId: i + 1 }));

/**
 * Baut ein Bracket und vergibt ids in Array-Reihenfolge (entspricht der
 * Erzeugungs-/Speicherreihenfolge im Backend).
 */
function buildBracket(n: number, opts: Partial<{ thirdPlaceMatch: boolean; playoutAllPlacements: boolean }> = {}) {
  const { thirdPlaceMatch = true, playoutAllPlacements = false } = opts;
  const gen = generateKnockoutTree(1, 1, 1, teams(n), playoutAllPlacements, thirdPlaceMatch, 0, null);
  return gen.map((m: any, i: number) => ({ ...m, id: i + 1 }));
}

const nodesOf = (bracket: any[]): KoMatchNode[] =>
  bracket.map(m => ({ id: m.id, bracketId: m.bracketId, stage: m.stage, upperBound: m.upperBound, lowerBound: m.lowerBound }));

const byPhase = (bracket: any[], phase: string) => bracket.find(m => m.phase === phase)!;

/** Spielt ein Match mit gegebenem Ergebnis (setzt scores auf dem Knoten). */
const play = (m: any, scoreA: number, scoreB: number) => ({ ...m, scoreA, scoreB });

describe('computeKoPropagation – 4 Teams (mit Spiel um Platz 3)', () => {
  const bracket = buildBracket(4, { thirdPlaceMatch: true });
  const nodes = nodesOf(bracket);
  const hf1 = byPhase(bracket, 'Halbfinale 1'); // id1, teamA=1, teamB=2
  const hf2 = byPhase(bracket, 'Halbfinale 2'); // id2, teamA=3, teamB=4
  const finale = byPhase(bracket, 'Finale');
  const platz3 = byPhase(bracket, 'Spiel um Platz 3');

  it('HF1: Sieger -> Finale.teamA, Verlierer -> Platz3.teamA', () => {
    const res = computeKoPropagation(play(hf1, 3, 1), nodes); // Sieger = teamA (1)
    expect(res).toContainEqual({ targetMatchId: finale.id, slot: 'teamA', teamId: 1 });
    expect(res).toContainEqual({ targetMatchId: platz3.id, slot: 'teamA', teamId: 2 });
    expect(res).toHaveLength(2);
  });

  it('HF2: Sieger -> Finale.teamB, Verlierer -> Platz3.teamB', () => {
    const res = computeKoPropagation(play(hf2, 0, 2), nodes); // Sieger = teamB (4)
    expect(res).toContainEqual({ targetMatchId: finale.id, slot: 'teamB', teamId: 4 });
    expect(res).toContainEqual({ targetMatchId: platz3.id, slot: 'teamB', teamId: 3 });
  });

  it('Finale ist terminal -> keine Weitergabe', () => {
    const playedFinale = play({ ...finale, teamAId: 1, teamBId: 4 }, 2, 0);
    expect(computeKoPropagation(playedFinale, nodes)).toEqual([]);
  });

  it('Unentschieden -> keine Weitergabe (kein Sieger)', () => {
    expect(computeKoPropagation(play(hf1, 1, 1), nodes)).toEqual([]);
  });
});

describe('computeKoPropagation – 4 Teams (ohne Spiel um Platz 3)', () => {
  const bracket = buildBracket(4, { thirdPlaceMatch: false });
  const nodes = nodesOf(bracket);
  const hf1 = byPhase(bracket, 'Halbfinale 1');
  const finale = byPhase(bracket, 'Finale');

  it('HF1: nur Sieger -> Finale.teamA, kein Verlierer-Ziel', () => {
    const res = computeKoPropagation(play(hf1, 3, 1), nodes);
    expect(res).toEqual([{ targetMatchId: finale.id, slot: 'teamA', teamId: 1 }]);
  });
});

describe('computeKoPropagation – 8 Teams', () => {
  const bracket = buildBracket(8, { thirdPlaceMatch: true });
  const nodes = nodesOf(bracket);
  const vf1 = byPhase(bracket, 'Viertelfinale 1'); // teamA=1,teamB=2
  const vf3 = byPhase(bracket, 'Viertelfinale 3'); // teamA=5,teamB=6
  const hf1 = byPhase(bracket, 'Halbfinale 1');
  const hf2 = byPhase(bracket, 'Halbfinale 2');
  const finale = byPhase(bracket, 'Finale');
  const platz3 = byPhase(bracket, 'Spiel um Platz 3');

  it('VF1-Sieger -> HF1.teamA', () => {
    const res = computeKoPropagation(play(vf1, 2, 1), nodes);
    expect(res).toEqual([{ targetMatchId: hf1.id, slot: 'teamA', teamId: 1 }]);
  });

  it('VF3-Sieger -> HF2.teamA (pairIndex 1)', () => {
    const res = computeKoPropagation(play(vf3, 4, 0), nodes);
    expect(res).toEqual([{ targetMatchId: hf2.id, slot: 'teamA', teamId: 5 }]);
  });

  it('HF1: Sieger -> Finale.teamA, Verlierer -> Platz3.teamA', () => {
    const playedHf1 = play({ ...hf1, teamAId: 1, teamBId: 5 }, 3, 2);
    const res = computeKoPropagation(playedHf1, nodes);
    expect(res).toContainEqual({ targetMatchId: finale.id, slot: 'teamA', teamId: 1 });
    expect(res).toContainEqual({ targetMatchId: platz3.id, slot: 'teamA', teamId: 5 });
  });

  it('HF2: Sieger -> Finale.teamB, Verlierer -> Platz3.teamB', () => {
    const playedHf2 = play({ ...hf2, teamAId: 3, teamBId: 7 }, 1, 4);
    const res = computeKoPropagation(playedHf2, nodes);
    expect(res).toContainEqual({ targetMatchId: finale.id, slot: 'teamB', teamId: 7 });
    expect(res).toContainEqual({ targetMatchId: platz3.id, slot: 'teamB', teamId: 3 });
  });
});

describe('computeKoPropagation – Robustheit', () => {
  it('fehlende bounds -> keine Weitergabe', () => {
    const res = computeKoPropagation(
      { id: 1, bracketId: 1, stage: 0, upperBound: null, lowerBound: null, teamAId: 1, teamBId: 2, scoreA: 3, scoreB: 0 },
      [{ id: 1, bracketId: 1, stage: 0, upperBound: null, lowerBound: null }]
    );
    expect(res).toEqual([]);
  });

  it('Match nicht in der Knotenliste -> keine Weitergabe', () => {
    const res = computeKoPropagation(
      { id: 999, bracketId: 1, stage: 0, upperBound: 1, lowerBound: 4, teamAId: 1, teamBId: 2, scoreA: 3, scoreB: 0 },
      [{ id: 1, bracketId: 1, stage: 0, upperBound: 1, lowerBound: 4 }]
    );
    expect(res).toEqual([]);
  });
});
