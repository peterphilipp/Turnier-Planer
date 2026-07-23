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
  
  // Clean up internal properties before returning
  return matches.map(({ upperBound, lowerBound, ...rest }) => rest);
}
