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

describe('computeKoPropagation – 16 Teams (tiefstes Bracket)', () => {
  const bracket = buildBracket(16, { thirdPlaceMatch: true });
  const nodes = nodesOf(bracket);
  const P = (name: string) => byPhase(bracket, name);

  it('AF-Paare laufen korrekt in die Viertelfinale zusammen', () => {
    // Paar 1 (AF1+AF2) -> VF1 ; Paar 2 (AF3+AF4) -> VF2 ; Paar 4 (AF7+AF8) -> VF4
    expect(computeKoPropagation(play(P('Achtelfinale 1'), 2, 0), nodes))
      .toEqual([{ targetMatchId: P('Viertelfinale 1').id, slot: 'teamA', teamId: 1 }]);
    expect(computeKoPropagation(play(P('Achtelfinale 2'), 2, 0), nodes))
      .toEqual([{ targetMatchId: P('Viertelfinale 1').id, slot: 'teamB', teamId: 3 }]);
    expect(computeKoPropagation(play(P('Achtelfinale 3'), 2, 0), nodes))
      .toEqual([{ targetMatchId: P('Viertelfinale 2').id, slot: 'teamA', teamId: 5 }]);
    expect(computeKoPropagation(play(P('Achtelfinale 8'), 0, 2), nodes))
      .toEqual([{ targetMatchId: P('Viertelfinale 4').id, slot: 'teamB', teamId: 16 }]);
  });

  it('keine Verlierer-Weitergabe in Runde 1 (kein Platzierungs-Bracket [9,16])', () => {
    const res = computeKoPropagation(play(P('Achtelfinale 1'), 2, 0), nodes);
    expect(res).toHaveLength(1); // nur der Sieger
  });

  it('VF-Sieger laufen in die Halbfinale', () => {
    const vf1 = play({ ...P('Viertelfinale 1'), teamAId: 1, teamBId: 3 }, 3, 1);
    expect(computeKoPropagation(vf1, nodes))
      .toEqual([{ targetMatchId: P('Halbfinale 1').id, slot: 'teamA', teamId: 1 }]);
    const vf4 = play({ ...P('Viertelfinale 4'), teamAId: 13, teamBId: 16 }, 0, 2);
    expect(computeKoPropagation(vf4, nodes))
      .toEqual([{ targetMatchId: P('Halbfinale 2').id, slot: 'teamB', teamId: 16 }]);
  });

  it('HF: Sieger -> Finale, Verlierer -> Spiel um Platz 3', () => {
    const hf1 = play({ ...P('Halbfinale 1'), teamAId: 1, teamBId: 5 }, 2, 1);
    const res = computeKoPropagation(hf1, nodes);
    expect(res).toContainEqual({ targetMatchId: P('Finale').id, slot: 'teamA', teamId: 1 });
    expect(res).toContainEqual({ targetMatchId: P('Spiel um Platz 3').id, slot: 'teamA', teamId: 5 });
  });

  it('Finale ist terminal', () => {
    const finale = play({ ...P('Finale'), teamAId: 1, teamBId: 16 }, 3, 2);
    expect(computeKoPropagation(finale, nodes)).toEqual([]);
  });

  it('vollständiger Durchlauf: 16 Teams -> genau ein Sieger im Finale', () => {
    // Simuliert das ganze Turnier: in jeder Runde gewinnt immer teamA.
    const state = new Map<number, { teamAId: number | null; teamBId: number | null }>();
    for (const m of bracket) state.set(m.id, { teamAId: m.teamAId, teamBId: m.teamBId });

    for (const stage of [0, 1, 2]) {
      for (const m of bracket.filter(x => x.stage === stage)) {
        const cur = state.get(m.id)!;
        if (cur.teamAId == null || cur.teamBId == null) continue;
        const played = { ...m, teamAId: cur.teamAId, teamBId: cur.teamBId, scoreA: 1, scoreB: 0 };
        for (const a of computeKoPropagation(played, nodes)) {
          const t = state.get(a.targetMatchId)!;
          if (a.slot === 'teamA') t.teamAId = a.teamId; else t.teamBId = a.teamId;
        }
      }
    }

    const finale = state.get(P('Finale').id)!;
    expect(finale.teamAId).not.toBeNull();
    expect(finale.teamBId).not.toBeNull();
    expect(finale.teamAId).not.toBe(finale.teamBId);
    // teamA gewinnt immer -> Team 1 (aus AF1) und Team 9 (aus AF5) stehen im Finale
    expect([finale.teamAId, finale.teamBId].sort((a, b) => a! - b!)).toEqual([1, 9]);

    const platz3 = state.get(P('Spiel um Platz 3').id)!;
    expect(platz3.teamAId).not.toBeNull();
    expect(platz3.teamBId).not.toBeNull();
  });
});
