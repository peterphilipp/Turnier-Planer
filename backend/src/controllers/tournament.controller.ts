import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';
import { generateKnockoutTree } from '../utils/knockout.js';

export const tournamentSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime().or(z.date()),
  endDate: z.string().datetime().or(z.date()),
  status: z.enum(['aktiv', 'beendet', 'archiviert']).default('aktiv'),
  turnierModus: z.enum(['GRUPPEN_KO', 'KO', 'LIGA', 'DOPPEL_KO']).default('GRUPPEN_KO'),
  clubId: z.number().int().positive().nullable().optional(),
  yearGroupIds: z.array(z.number().int().positive()).optional()
});

export const getTournaments = async (req: Request, res: Response) => {
  const tournaments = await prisma.tournament.findMany({
    include: { club: true, yearGroups: true },
    orderBy: { startDate: 'desc' }
  });
  return res.json(tournaments);
};

export const getTournamentById = async (req: Request, res: Response) => {
  const tournament = await prisma.tournament.findUnique({
    where: { id: parseInt(String(req.params.id)) },
    include: { club: true, yearGroups: true }
  });
  if (!tournament) return res.status(404).json({ error: 'Turnier nicht gefunden' });
  return res.json(tournament);
};

export const createTournament = async (req: Request, res: Response) => {
  const { yearGroupIds, ...tournamentData } = req.body;
  if (tournamentData.startDate) tournamentData.startDate = new Date(tournamentData.startDate);
  if (tournamentData.endDate) tournamentData.endDate = new Date(tournamentData.endDate);
  
  const tournament = await prisma.tournament.create({
    data: {
      ...tournamentData,
      yearGroups: yearGroupIds ? { connect: yearGroupIds.map(id => ({ id })) } : undefined
    }
  });
  res.status(201).json(tournament);
};

export const updateTournament = async (req: Request, res: Response) => {
  try {
    const { yearGroupIds, ...tournamentData } = req.body;
    if (tournamentData.startDate) tournamentData.startDate = new Date(tournamentData.startDate);
    if (tournamentData.endDate) tournamentData.endDate = new Date(tournamentData.endDate);
    
    // clubId als null wenn leer/0
    if (tournamentData.clubId === '' || tournamentData.clubId === 0) tournamentData.clubId = null;
    
    const updateData: any = { ...tournamentData };
    
    // yearGroupIds aktualisieren (viele-zu-viele)
    if (yearGroupIds !== undefined) {
      updateData.yearGroups = { set: yearGroupIds.map(id => ({ id })) };
    }
    
    const tournament = await prisma.tournament.update({
      where: { id: parseInt(String(req.params.id)) },
      data: updateData,
      include: { club: true, yearGroups: true }
    });
    return res.json(tournament);
  } catch (err: any) {
    console.error('updateTournament error:', err.message);
    return res.status(400).json({ error: err.message });
  }
};

export const updateTournamentStatus = async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['aktiv', 'beendet', 'archiviert'].includes(status)) {
    return res.status(400).json({ error: 'Ungültiger Status' });
  }
  const tournament = await prisma.tournament.update({
    where: { id: parseInt(String(req.params.id)) },
    data: { status }
  });
  return res.json(tournament);
};

export const deleteTournament = async (req: Request, res: Response) => {
  await prisma.tournament.delete({ where: { id: parseInt(String(req.params.id)) } });
  return res.status(204).send();
};

/**
 * Turnier-Modus ändern und automatisch Paarungen generieren.
 */
export const updateTournamentMode = async (req: Request, res: Response) => {
  const { turnierModus, teamsAdvancingPerGroup, playoutAllPlacements, thirdPlaceMatch, qualificationRule } = req.body;
  
  if (!['GRUPPEN_KO', 'KO', 'LIGA', 'DOPPEL_KO'].includes(turnierModus)) {
    return res.status(400).json({ error: 'Ungültiger Turnier-Modus' });
  }

  const tournamentId = parseInt(String(req.params.id));
  
  // Modus aktualisieren
  const tournament = await prisma.tournament.update({
    where: { id: tournamentId },
    data: { 
      turnierModus,
      ...(teamsAdvancingPerGroup !== undefined && { teamsAdvancingPerGroup: parseInt(teamsAdvancingPerGroup) }),
      ...(playoutAllPlacements !== undefined && { playoutAllPlacements: Boolean(playoutAllPlacements) }),
      ...(thirdPlaceMatch !== undefined && { thirdPlaceMatch: Boolean(thirdPlaceMatch) }),
      ...(qualificationRule !== undefined && { qualificationRule: String(qualificationRule) })
    }
  });

  // Spielplan löschen
  await prisma.match.deleteMany({ where: { tournamentId } });
  await prisma.knockoutBracket.deleteMany({ where: { tournamentId } });
  await prisma.standingsEntry.deleteMany({ where: { tournamentId } });

  return res.json({ tournament, message: `Modus geändert zu ${turnierModus}. Alter Spielplan wurde gelöscht.` });
};

/**
 * Spielplan für einen Jahrgang generieren.
 */
// ==================== Scheduler Logik ====================

function parseTime(dateStr: string | Date, timeStr: string): Date {
  const d = new Date(dateStr);
  const [h, m] = timeStr.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

interface ScheduleParams {
  matchDuration: number;
  halves: number;
  halftimeBreak: number;
  breakDuration: number;
}

async function scheduleAndSaveMatches(
  matchesToSchedule: any[],
  tournamentId: number,
  yearGroupId: number,
  params: ScheduleParams
) {
  let matchesCreated = 0;
  
  let fields = await prisma.field.findMany({ where: { tournamentId } });
  
  const timeSlots = await prisma.timeSlot.findMany({
    where: { tournamentId, yearGroupId },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
  });

  const totalMatchTime = (params.matchDuration * params.halves) + (params.halves > 1 ? params.halftimeBreak : 0);
  const blockDuration = totalMatchTime + params.breakDuration;

  if (timeSlots.length === 0) {
    throw new Error('Keine Turnier-Tage (Zeitslots) für diesen Jahrgang angelegt. Bitte unter "Turnier-Tage" konfigurieren!');
  }
  if (fields.length === 0) {
    throw new Error('Keine Spielfelder für diesen Jahrgang zugewiesen. Bitte unter "Spielfelder" konfigurieren!');
  }

  let currentSlotIdx = 0;
  let currentTime = parseTime(timeSlots[0].date, timeSlots[0].startTime);
  let currentFieldIdx = 0;
  let teamsPlayingInCurrentSlot = new Set<number>();
  let lastStage = 1;

  while (matchesToSchedule.length > 0) {
    if (currentFieldIdx === 0) {
      teamsPlayingInCurrentSlot.clear();
    }

    let slot = timeSlots[currentSlotIdx];
    let slotEnd = parseTime(slot.date, slot.endTime);
    let matchEnd = new Date(currentTime.getTime() + totalMatchTime * 60000);

    // Prüfen, ob das Spiel in den aktuellen Zeitslot passt
    if (matchEnd > slotEnd) {
      currentSlotIdx++;
      if (currentSlotIdx >= timeSlots.length) {
        currentSlotIdx = timeSlots.length - 1; // Notlösung: überziehen
        slot = timeSlots[currentSlotIdx];
      } else {
        slot = timeSlots[currentSlotIdx];
        currentTime = parseTime(slot.date, slot.startTime);
        currentFieldIdx = 0;
        teamsPlayingInCurrentSlot.clear();
        continue; // Schleife neu starten für diesen Block
      }
    }

    // Ermittle die aktuelle Stage (um z.B. KO-Spiele strikt NACH der Gruppenphase zu planen)
    const currentStage = Math.min(...matchesToSchedule.map(m => m.stage || 1));

    if (currentStage > lastStage) {
      if (currentFieldIdx !== 0) {
        currentFieldIdx = 0;
        currentTime = new Date(currentTime.getTime() + blockDuration * 60000);
        teamsPlayingInCurrentSlot.clear();
        
        // Prüfen ob wir den Zeitslot durch den Stage-Wechsel überschritten haben
        matchEnd = new Date(currentTime.getTime() + totalMatchTime * 60000);
        if (matchEnd > slotEnd) {
          currentSlotIdx++;
          if (currentSlotIdx >= timeSlots.length) {
            currentSlotIdx = timeSlots.length - 1;
            slot = timeSlots[currentSlotIdx];
          } else {
            slot = timeSlots[currentSlotIdx];
            currentTime = parseTime(slot.date, slot.startTime);
          }
        }
      }
      lastStage = currentStage;
    }

    // Finde ein Spiel der aktuellen Stage, bei dem keines der Teams gerade in diesem Block spielt
    const matchIndex = matchesToSchedule.findIndex(m => 
      (m.stage || 1) === currentStage &&
      (!m.teamAId || !teamsPlayingInCurrentSlot.has(m.teamAId)) && 
      (!m.teamBId || !teamsPlayingInCurrentSlot.has(m.teamBId))
    );

    if (matchIndex === -1) {
      // Kein passendes Spiel gefunden -> Spielfeld in diesem Block leer lassen und Zeit vordrehen
      currentFieldIdx = 0;
      currentTime = new Date(currentTime.getTime() + blockDuration * 60000);
      continue;
    }

    const match = matchesToSchedule.splice(matchIndex, 1)[0];
    if (match.teamAId) teamsPlayingInCurrentSlot.add(match.teamAId);
    if (match.teamBId) teamsPlayingInCurrentSlot.add(match.teamBId);

    const field = fields[currentFieldIdx];

    await prisma.match.create({
      data: {
        ...match,
        time: currentTime,
        fieldId: field.id
      }
    });
    matchesCreated++;

    currentFieldIdx++;
    if (currentFieldIdx >= fields.length) {
      currentFieldIdx = 0;
      currentTime = new Date(currentTime.getTime() + blockDuration * 60000);
    }
  }
  
  return matchesCreated;
}

/**
 * Spielplan für einen Jahrgang generieren.
 */
export const generateMatchesForYearGroup = async (req: Request, res: Response) => {
  const { yearGroupId, matchDuration = 15, halves = 1, halftimeBreak = 5, breakDuration = 5 } = req.body;
  
  if (!yearGroupId) {
    return res.status(400).json({ error: 'yearGroupId ist erforderlich' });
  }

  const tournamentId = parseInt(String(req.params.id));
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return res.status(404).json({ error: 'Turnier nicht gefunden' });

  const mode = tournament.turnierModus || 'GRUPPEN_KO';
  let result: any = { message: '', matchesCreated: 0, bracketsCreated: 0 };
  
  const params: ScheduleParams = {
    matchDuration: parseInt(String(matchDuration)),
    halves: parseInt(String(halves)),
    halftimeBreak: parseInt(String(halftimeBreak)),
    breakDuration: parseInt(String(breakDuration))
  };

  try {
    const yId = parseInt(String(yearGroupId));
    
    // Alten Spielplan dieses Jahrgangs komplett verwerfen, bevor neu generiert wird
    // Wichtig: Zuerst Matches löschen (die auf Brackets verweisen), dann Brackets
    const deletedMatches = await prisma.match.deleteMany({ where: { tournamentId, yearGroupId: yId } });
    const deletedStandings = await prisma.standingsEntry.deleteMany({ where: { tournamentId, team: { yearGroupId: yId } } });
    const deletedBrackets = await prisma.knockoutBracket.deleteMany({ where: { tournamentId, yearGroupId: yId } });
    console.log(`[Generate] Alte Daten gelöscht: ${deletedMatches.count} Matches, ${deletedStandings.count} Standings, ${deletedBrackets.count} Brackets`);

    if (mode === 'GRUPPEN_KO') {
      result = await generateGruppenKO(tournamentId, parseInt(String(yearGroupId)), params);
    } else if (mode === 'KO') {
      result = await generateKO(tournamentId, parseInt(String(yearGroupId)), params);
    } else if (mode === 'LIGA') {
      result = await generateLiga(tournamentId, parseInt(String(yearGroupId)), params);
    } else if (mode === 'DOPPEL_KO') {
      result = await generateDoppelKO(tournamentId, parseInt(String(yearGroupId)), params);
    }

    return res.json({ tournament, ...result });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Ein unerwarteter Fehler ist aufgetreten.' });
  }
};

// ==================== Turnier-Modi Generatoren ====================

async function getTeamsForGeneration(tournamentId: number, yearGroupId?: number) {
  let teams = await prisma.team.findMany({ 
    where: yearGroupId ? { tournamentId, yearGroupId } : { tournamentId },
    orderBy: { name: 'asc' }
  });
  if (teams.length < 2 && yearGroupId) {
    teams = await prisma.team.findMany({ 
      where: { tournamentId },
      orderBy: { name: 'asc' }
    });
  }
  return teams;
}

async function generateGruppenKO(tournamentId: number, yearGroupId: number, params: ScheduleParams) {
  let matchesToSchedule = [];
  
  const groups = await prisma.group.findMany({
    where: { tournamentId, yearGroup: { id: yearGroupId } },
    orderBy: { order: 'asc' }
  });
  
  if (groups.length > 0) {
    for (const group of groups) {
      const teams = await prisma.team.findMany({ where: { groupId: group.id, yearGroupId } });
      if (teams.length < 2) continue;
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          matchesToSchedule.push({
            tournamentId,
            yearGroupId,
            teamAId: teams[i].id,
            teamBId: teams[j].id,
            phase: `${group.name}`,
            status: 'geplant',
            stage: 1
          });
        }
      }
      for (const team of teams) {
        await prisma.standingsEntry.upsert({
          where: { teamId_tournamentId: { teamId: team.id, tournamentId } },
          update: {},
          create: { teamId: team.id, tournamentId }
        });
      }
    }

    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    const advancingPerGroup = tournament?.teamsAdvancingPerGroup || 2;
    const totalKoTeams = groups.length > 0 ? groups.length * advancingPerGroup : 0;

    // K.O. Phase nur generieren, wenn die Anzahl der Teams eine Zweierpotenz ist (2, 4, 8, 16)
    if (totalKoTeams >= 2) {
      const bracket = await prisma.knockoutBracket.create({
        data: { tournamentId, yearGroupId, name: 'Finalrunde', order: 1, runde: 'Finals' }
      });
      
      let participants = [];
      for (let i = 0; i < totalKoTeams / 2; i++) {
        let pA = `TBD ${i * 2 + 1}`;
        let pB = `TBD ${i * 2 + 2}`;
        
        // Smarte Platzhalter für typische Konstellationen
        if (totalKoTeams === 4 && groups.length === 2 && advancingPerGroup === 2) {
            pA = i === 0 ? `1. ${groups[0].name}` : `1. ${groups[1].name}`;
            pB = i === 0 ? `2. ${groups[1].name}` : `2. ${groups[0].name}`;
        } else if (totalKoTeams === 8 && groups.length === 4 && advancingPerGroup === 2) {
            pA = `1. ${groups[i].name}`;
            pB = `2. ${groups[(i + 1) % 4].name}`;
        } else if (totalKoTeams === 8 && groups.length === 2 && advancingPerGroup === 4) {
            pA = i < 2 ? `${i+1}. ${groups[0].name}` : `${i-1}. ${groups[1].name}`;
            pB = i < 2 ? `${4-i}. ${groups[1].name}` : `${6-i}. ${groups[0].name}`;
        } else if (groups.length === 1) {
            pA = `${i * 2 + 1}. ${groups[0].name}`;
            pB = `${i * 2 + 2}. ${groups[0].name}`;
        }
        
        participants.push({ placeholder: pA });
        participants.push({ placeholder: pB });
      }
      
      const koMatches = generateKnockoutTree(
        tournamentId,
        yearGroupId,
        bracket.id,
        participants,
        tournament?.playoutAllPlacements || false,
        tournament?.thirdPlaceMatch !== false,
        2, // startStage
        tournament?.qualificationRule
      );
      
      matchesToSchedule.push(...koMatches);
    }
  } else {
    const teams = await getTeamsForGeneration(tournamentId, yearGroupId);
    if (teams.length < 2) {
      return { message: `Keine Teams gefunden.`, matchesCreated: 0 };
    }
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matchesToSchedule.push({
          tournamentId,
          yearGroupId,
          teamAId: teams[i].id,
          teamBId: teams[j].id,
          phase: 'Gruppenphase',
          status: 'geplant',
          stage: 1
        });
      }
    }
  }

  const matchesCreated = await scheduleAndSaveMatches(matchesToSchedule, tournamentId, yearGroupId, params);
  return { message: `${groups.length} Gruppen mit Gruppenspielen erstellt`, matchesCreated };
}

async function generateKO(tournamentId: number, yearGroupId: number, params: ScheduleParams) {
  const teams = await getTeamsForGeneration(tournamentId, yearGroupId);
  if (teams.length < 2) return { message: `Keine Teams gefunden.`, matchesCreated: 0, bracketsCreated: 0 };

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });

  const bracket = await prisma.knockoutBracket.create({
    data: { tournamentId, yearGroupId, name: 'K.O.-Bracket', runde: 'Finals', order: 1 }
  });

  const participants = teams.map(t => ({ teamId: t.id }));
  
  const koMatches = generateKnockoutTree(
    tournamentId,
    yearGroupId,
    bracket.id,
    participants,
    tournament?.playoutAllPlacements || false,
    tournament?.thirdPlaceMatch !== false,
    1,
    tournament?.qualificationRule
  );

  const matchesCreated = await scheduleAndSaveMatches(koMatches, tournamentId, yearGroupId, params);
  return { message: `K.O.-Bracket mit ${koMatches.length} Spielen erstellt`, matchesCreated, bracketsCreated: 1 };
}

async function generateLiga(tournamentId: number, yearGroupId: number, params: ScheduleParams) {
  const teams = await getTeamsForGeneration(tournamentId, yearGroupId);
  if (teams.length < 2) return { message: `Keine Teams gefunden.`, matchesCreated: 0, bracketsCreated: 0 };

  let matchesToSchedule = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matchesToSchedule.push({
        tournamentId,
        yearGroupId,
        teamAId: teams[i].id,
        teamBId: teams[j].id,
        phase: 'Liga',
        status: 'geplant'
      });
    }
  }

  for (const team of teams) {
    await prisma.standingsEntry.upsert({
      where: { teamId_tournamentId: { teamId: team.id, tournamentId } },
      update: {},
      create: { teamId: team.id, tournamentId }
    });
  }

  const matchesCreated = await scheduleAndSaveMatches(matchesToSchedule, tournamentId, yearGroupId, params);
  return { message: `Liga-Spielplan mit ${matchesCreated} Spielen erstellt`, matchesCreated, bracketsCreated: 0 };
}

async function generateDoppelKO(tournamentId: number, yearGroupId: number, params: ScheduleParams) {
  const teams = await getTeamsForGeneration(tournamentId, yearGroupId);
  if (teams.length < 2) return { message: `Keine Teams gefunden.`, matchesCreated: 0, bracketsCreated: 0 };

  const siegerBracket = await prisma.knockoutBracket.create({
    data: { tournamentId, name: 'Sieger-Bracket', runde: 'Erste Runde', order: 1 }
  });

  const verliererRunden = Math.ceil(Math.log2(teams.length));
  for (let r = 1; r <= verliererRunden; r++) {
    await prisma.knockoutBracket.create({
      data: { tournamentId, name: `Verlierer-Runde-${r}`, runde: `Verlierer-Runde-${r}`, order: r + 1 }
    });
  }

  let matchesToSchedule = [];
  for (let i = 0; i < teams.length; i += 2) {
    matchesToSchedule.push({
      tournamentId,
      yearGroupId,
      teamAId: teams[i].id,
      teamBId: i + 1 < teams.length ? teams[i + 1].id : teams[i].id,
      phase: 'Doppel-K.O.',
      runde: `Sieger-Runde-1`,
      bracketTyp: 'sieger',
      bracketId: siegerBracket.id,
      status: 'geplant'
    });
  }

  const matchesCreated = await scheduleAndSaveMatches(matchesToSchedule, tournamentId, yearGroupId, params);
  return { message: `Doppel-K.O. mit Sieger-Bracket erstellt`, matchesCreated, bracketsCreated: 1 + verliererRunden };
}
