export function getRoundName(matchCount: number) {
  if (matchCount === 1) return 'Finale';
  if (matchCount === 2) return 'Halbfinale';
  if (matchCount === 4) return 'Viertelfinale';
  if (matchCount === 8) return 'Achtelfinale';
  if (matchCount === 16) return 'Sechzehntelfinale';
  return `Letzte ${matchCount * 2}`;
}

export function generateKnockoutTree(
  tournamentId: number,
  yearGroupId: number,
  bracketId: number,
  participants: any[], // { teamId?: number, placeholder?: string }
  playoutAllPlacements: boolean,
  thirdPlaceMatch: boolean,
  startStage: number,
  qualificationRule: string | null = null
) {
  let matches: any[] = [];
  
  // 1. Pad to power of 2
  let powerOf2 = 2;
  while (powerOf2 < participants.length) powerOf2 *= 2;
  
  const originalLength = participants.length;
  for (let i = originalLength; i < powerOf2; i++) {
    const fillType = qualificationRule === 'BEST_THIRDS' ? `Bester ${i - originalLength + 1}. Platz` : `Nachrücker ${i - originalLength + 1}`;
    participants.push({ placeholder: fillType });
  }

  // 2. Initial round
  let currentRoundNodes: any[] = [];
  const initialMatchCount = powerOf2 / 2;
  const initialRoundName = getRoundName(initialMatchCount);

  for (let i = 0; i < initialMatchCount; i++) {
    const p1 = participants[i * 2];
    const p2 = participants[i * 2 + 1];
    const phaseName = initialMatchCount === 1 ? 'Finale' : `${initialRoundName} ${i + 1}`;
    
    const match = {
      tournamentId,
      yearGroupId,
      bracketId,
      status: 'geplant',
      stage: startStage,
      phase: phaseName,
      teamAId: p1.teamId ?? null,
      placeholderA: p1.placeholder ?? null,
      teamBId: p2.teamId ?? null,
      placeholderB: p2.placeholder ?? null,
      upperBound: 1, 
      lowerBound: powerOf2
    };
    matches.push(match);
    currentRoundNodes.push(match);
  }

  // 3. Build subsequent rounds
  let previousRoundNodes = currentRoundNodes;
  let stageCounter = startStage + 1;
  
  while (previousRoundNodes.length > 0) {
    let nextRoundNodes: any[] = [];
    
    // Group previous nodes by bounds
    const groups: { [key: string]: any[] } = {};
    for (const node of previousRoundNodes) {
      const key = `${node.upperBound}-${node.lowerBound}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(node);
    }
    
    for (const key in groups) {
      const nodes = groups[key];
      // Only process if we have pairs
      for (let i = 0; i < nodes.length; i += 2) {
        if (i + 1 >= nodes.length) break; 
        
        const m1 = nodes[i];
        const m2 = nodes[i + 1];
        const upperBound = m1.upperBound;
        const lowerBound = m1.lowerBound;
        
        if (upperBound === lowerBound) continue;
        
        const midPoint = Math.floor((upperBound + lowerBound) / 2);
        
        // Winner plays for upperBound to midPoint
        const winnerMatchCount = (midPoint - upperBound + 1) / 2;
        let winnerPhaseName = '';
        if (winnerMatchCount === 1) { 
            winnerPhaseName = upperBound === 1 ? 'Finale' : `Spiel um Platz ${upperBound}`;
        } else {
            winnerPhaseName = upperBound === 1 ? `${getRoundName(winnerMatchCount)} ${(i/2) + 1}` : `${getRoundName(winnerMatchCount)} Platz ${upperBound}-${midPoint} (${(i/2) + 1})`;
        }

        const winnerMatch = {
          tournamentId,
          yearGroupId,
          bracketId,
          status: 'geplant',
          stage: stageCounter,
          phase: winnerPhaseName,
          teamAId: null as number | null,
          teamBId: null as number | null,
          placeholderA: `Sieger ${m1.phase.replace('Halbfinale', 'HF').replace('Viertelfinale', 'VF')}`,
          placeholderB: `Sieger ${m2.phase.replace('Halbfinale', 'HF').replace('Viertelfinale', 'VF')}`,
          upperBound: upperBound,
          lowerBound: midPoint
        };
        matches.push(winnerMatch);
        if (midPoint > upperBound) nextRoundNodes.push(winnerMatch);

        // Loser plays for midPoint+1 to lowerBound
        const isThirdPlaceMatch = (upperBound === 1 && midPoint === 2);
        if (playoutAllPlacements || (isThirdPlaceMatch && thirdPlaceMatch)) {
          const loserMatchCount = (lowerBound - midPoint) / 2;
          let loserPhaseName = '';
          if (loserMatchCount === 1) {
              loserPhaseName = `Spiel um Platz ${midPoint + 1}`;
          } else {
              loserPhaseName = `${getRoundName(loserMatchCount)} Platz ${midPoint + 1}-${lowerBound} (${(i/2) + 1})`;
          }
          
          const loserMatch = {
            tournamentId,
            yearGroupId,
            bracketId,
            status: 'geplant',
            stage: stageCounter, 
            phase: loserPhaseName,
            teamAId: null as number | null,
            teamBId: null as number | null,
            placeholderA: `Verlierer ${m1.phase.replace('Halbfinale', 'HF')}`,
            placeholderB: `Verlierer ${m2.phase.replace('Halbfinale', 'HF')}`,
            upperBound: midPoint + 1,
            lowerBound: lowerBound
          };
          matches.push(loserMatch);
          if (lowerBound > midPoint + 1) nextRoundNodes.push(loserMatch);
        }
      }
    }
    
    stageCounter++;
    previousRoundNodes = nextRoundNodes;
  }
  
  // Keep upperBound/lowerBound for KO propagation in updateMatch
  return matches;
}

// ==================== KO-Propagation (rein, ohne DB) ====================

export interface KoMatchNode {
  id: number;
  bracketId: number | null;
  stage: number | null;
  upperBound: number | null;
  lowerBound: number | null;
}

export interface KoAssignment {
  targetMatchId: number;
  slot: 'teamA' | 'teamB';
  teamId: number;
}

/**
 * Berechnet – ohne Datenbankzugriff – wohin Sieger und Verlierer eines gerade
 * gespielten K.O.-Spiels weitergegeben werden.
 *
 * Die Regeln spiegeln exakt `generateKnockoutTree`:
 * - Innerhalb einer Runde (gleiche bracketId + stage + bounds) bilden je zwei
 *   nach id sortierte Matches ein Paar. Das erste (idx gerade) besetzt teamA des
 *   Ziel-Matches, das zweite (idx ungerade) teamB.
 * - Sieger → nächste stage, bounds [upper, mid]; Verlierer → bounds [mid+1, lower]
 *   (nur falls dieses Platzierungs-Match existiert), mit mid = floor((upper+lower)/2).
 * - Terminal (kein Weiterreichen), wenn der Bereich nur noch 1–2 Plätze umfasst
 *   (upper+1 >= lower), also z.B. Finale [1,2] oder Spiel um Platz 3 [3,4].
 *
 * Gibt ein leeres Array zurück, wenn nicht propagiert werden kann (fehlende
 * bounds/Teams, Unentschieden, terminales Match, Match nicht auffindbar).
 */
export function computeKoPropagation(
  played: {
    id: number;
    bracketId: number | null;
    stage: number | null;
    upperBound: number | null;
    lowerBound: number | null;
    teamAId: number | null;
    teamBId: number | null;
    scoreA: number | null;
    scoreB: number | null;
  },
  allKoMatches: KoMatchNode[]
): KoAssignment[] {
  const { id, bracketId, stage, upperBound: upper, lowerBound: lower, teamAId, teamBId, scoreA, scoreB } = played;

  if (bracketId == null || stage == null || upper == null || lower == null) return [];
  if (scoreA == null || scoreB == null || scoreA === scoreB) return []; // kein Sieger
  if (teamAId == null || teamBId == null) return [];
  if (!(upper + 1 < lower)) return []; // terminal (Finale/Platzierungsspiel)

  const winner = scoreA > scoreB ? teamAId : teamBId;
  const loser = scoreA > scoreB ? teamBId : teamAId;
  const mid = Math.floor((upper + lower) / 2);

  // Position dieses Matches innerhalb seiner Bounds-Gruppe (nach id stabil sortiert)
  const sameGroup = allKoMatches
    .filter(k => k.bracketId === bracketId && k.stage === stage && k.upperBound === upper && k.lowerBound === lower)
    .sort((a, b) => a.id - b.id);
  const idx = sameGroup.findIndex(k => k.id === id);
  if (idx === -1) return [];
  const pairIndex = Math.floor(idx / 2);
  const slot: 'teamA' | 'teamB' = idx % 2 === 0 ? 'teamA' : 'teamB';

  const inNextStage = (u: number, l: number) =>
    allKoMatches
      .filter(k => k.bracketId === bracketId && k.stage === stage + 1 && k.upperBound === u && k.lowerBound === l)
      .sort((a, b) => a.id - b.id);

  const assignments: KoAssignment[] = [];

  const winnerTarget = inNextStage(upper, mid)[pairIndex];
  if (winnerTarget) assignments.push({ targetMatchId: winnerTarget.id, slot, teamId: winner });

  const loserTarget = inNextStage(mid + 1, lower)[pairIndex];
  if (loserTarget) assignments.push({ targetMatchId: loserTarget.id, slot, teamId: loser });

  return assignments;
}
