import { describe, it, expect } from 'vitest';
import { generateKnockoutTree, getRoundName } from '../src/utils/knockout.js';

/**
 * Helfer: erzeugt Teilnehmer-Liste mit echten Teams (teamId 1..n).
 */
const teams = (n: number) => Array.from({ length: n }, (_, i) => ({ teamId: i + 1 }));

/**
 * Standard-Aufruf mit sinnvollen Defaults; einzelne Parameter überschreibbar.
 */
function gen(
  participants: any[],
  opts: Partial<{
    playoutAllPlacements: boolean;
    thirdPlaceMatch: boolean;
    startStage: number;
    qualificationRule: string | null;
  }> = {}
) {
  const {
    playoutAllPlacements = false,
    thirdPlaceMatch = true,
    startStage = 0,
    qualificationRule = null
  } = opts;
  return generateKnockoutTree(
    1, // tournamentId
    1, // yearGroupId
    1, // bracketId
    participants,
    playoutAllPlacements,
    thirdPlaceMatch,
    startStage,
    qualificationRule
  );
}

describe('getRoundName', () => {
  it('benennt Standard-Rundengrößen', () => {
    expect(getRoundName(1)).toBe('Finale');
    expect(getRoundName(2)).toBe('Halbfinale');
    expect(getRoundName(4)).toBe('Viertelfinale');
    expect(getRoundName(8)).toBe('Achtelfinale');
    expect(getRoundName(16)).toBe('Sechzehntelfinale');
  });
});

describe('generateKnockoutTree – 2 Teams', () => {
  it('erzeugt genau ein Finale mit bounds [1,2]', () => {
    const m = gen(teams(2));
    expect(m).toHaveLength(1);
    expect(m[0].phase).toBe('Finale');
    expect(m[0].upperBound).toBe(1);
    expect(m[0].lowerBound).toBe(2);
    expect(m[0].stage).toBe(0);
    expect(m[0].teamAId).toBe(1);
    expect(m[0].teamBId).toBe(2);
  });
});

describe('generateKnockoutTree – 4 Teams', () => {
  it('mit Spiel um Platz 3: 2 Halbfinale + Finale + Platz-3-Spiel', () => {
    const m = gen(teams(4), { thirdPlaceMatch: true });
    expect(m).toHaveLength(4);

    const phases = m.map(x => x.phase).sort();
    expect(phases).toContain('Halbfinale 1');
    expect(phases).toContain('Halbfinale 2');
    expect(phases).toContain('Finale');
    expect(phases).toContain('Spiel um Platz 3');
  });

  it('Halbfinale liegen in stage 0, Finale/Platz-3 in stage 1', () => {
    const m = gen(teams(4), { thirdPlaceMatch: true });
    const hf = m.filter(x => x.phase.startsWith('Halbfinale'));
    const finale = m.find(x => x.phase === 'Finale')!;
    const platz3 = m.find(x => x.phase === 'Spiel um Platz 3')!;

    expect(hf.every(x => x.stage === 0)).toBe(true);
    expect(finale.stage).toBe(1);
    expect(platz3.stage).toBe(1);

    // bounds
    expect(hf.every(x => x.upperBound === 1 && x.lowerBound === 4)).toBe(true);
    expect(finale.upperBound).toBe(1);
    expect(finale.lowerBound).toBe(2);
    expect(platz3.upperBound).toBe(3);
    expect(platz3.lowerBound).toBe(4);
  });

  it('ohne Spiel um Platz 3: nur 2 Halbfinale + Finale', () => {
    const m = gen(teams(4), { thirdPlaceMatch: false, playoutAllPlacements: false });
    expect(m).toHaveLength(3);
    expect(m.some(x => x.phase === 'Spiel um Platz 3')).toBe(false);
    expect(m.filter(x => x.phase.startsWith('Halbfinale'))).toHaveLength(2);
    expect(m.some(x => x.phase === 'Finale')).toBe(true);
  });

  it('Finale referenziert die Halbfinal-Sieger als Platzhalter', () => {
    const m = gen(teams(4), { thirdPlaceMatch: true });
    const finale = m.find(x => x.phase === 'Finale')!;
    expect(finale.placeholderA).toBe('Sieger HF 1');
    expect(finale.placeholderB).toBe('Sieger HF 2');
    expect(finale.teamAId).toBeNull();
    expect(finale.teamBId).toBeNull();
  });
});

describe('generateKnockoutTree – 8 Teams', () => {
  it('mit Spiel um Platz 3: 4 VF + 2 HF + Finale + Platz-3 = 8 Matches', () => {
    const m = gen(teams(8), { thirdPlaceMatch: true });
    expect(m).toHaveLength(8);

    const vf = m.filter(x => x.phase.startsWith('Viertelfinale'));
    const hf = m.filter(x => x.phase.startsWith('Halbfinale'));
    const finale = m.filter(x => x.phase === 'Finale');
    const platz3 = m.filter(x => x.phase === 'Spiel um Platz 3');

    expect(vf).toHaveLength(4);
    expect(hf).toHaveLength(2);
    expect(finale).toHaveLength(1);
    expect(platz3).toHaveLength(1);
  });

  it('Stages laufen von 0 (VF) bis 2 (Finale)', () => {
    const m = gen(teams(8), { thirdPlaceMatch: true });
    const stages = new Set(m.map(x => x.stage));
    expect(Math.min(...stages)).toBe(0);
    expect(Math.max(...stages)).toBe(2);
    expect(m.filter(x => x.phase.startsWith('Viertelfinale')).every(x => x.stage === 0)).toBe(true);
    expect(m.find(x => x.phase === 'Finale')!.stage).toBe(2);
  });

  it('alle Viertelfinale haben bounds [1,8]', () => {
    const m = gen(teams(8), { thirdPlaceMatch: true });
    const vf = m.filter(x => x.phase.startsWith('Viertelfinale'));
    expect(vf.every(x => x.upperBound === 1 && x.lowerBound === 8)).toBe(true);
  });
});

describe('generateKnockoutTree – Padding auf Zweierpotenz', () => {
  it('3 Teams werden auf 4 aufgefüllt (1 Nachrücker-Platzhalter)', () => {
    const m = gen(teams(3), { thirdPlaceMatch: true });
    // 4er-Bracket → 4 Matches
    expect(m).toHaveLength(4);
    // In der ersten Runde muss genau ein Platzhalter-Slot als Nachrücker existieren
    const round0 = m.filter(x => x.stage === 0);
    const placeholders = round0.flatMap(x => [x.placeholderA, x.placeholderB]).filter(Boolean);
    expect(placeholders).toContain('Nachrücker 1');
  });

  it('5 Teams werden auf 8 aufgefüllt (3 Nachrücker)', () => {
    const m = gen(teams(5), { thirdPlaceMatch: true });
    expect(m).toHaveLength(8);
    const round0 = m.filter(x => x.stage === 0);
    const placeholders = round0.flatMap(x => [x.placeholderA, x.placeholderB]).filter(Boolean);
    expect(placeholders.filter(p => String(p).startsWith('Nachrücker'))).toHaveLength(3);
  });

  it('BEST_THIRDS benennt die Auffüll-Platzhalter als "Bester N. Platz"', () => {
    const m = gen(teams(3), { qualificationRule: 'BEST_THIRDS' });
    const round0 = m.filter(x => x.stage === 0);
    const placeholders = round0.flatMap(x => [x.placeholderA, x.placeholderB]).filter(Boolean);
    expect(placeholders.some(p => String(p).startsWith('Bester'))).toBe(true);
  });
});

describe('generateKnockoutTree – startStage-Offset', () => {
  it('verschiebt alle Stages um startStage', () => {
    const m = gen(teams(4), { startStage: 5, thirdPlaceMatch: true });
    const stages = m.map(x => x.stage).sort((a, b) => a - b);
    expect(Math.min(...stages)).toBe(5);
    expect(Math.max(...stages)).toBe(6);
  });
});
