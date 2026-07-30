import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';
import { generateKnockoutTree } from '../utils/knockout.js';
import { logTournamentCreated, logTournamentUpdated } from '../utils/logger.js';

// Basis-Felder des Turniers, gemeinsam für Create (vollständig) und Update (partial).
const tournamentBaseSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  status: z.enum(['aktiv', 'entwurf', 'archiviert']).default('aktiv'),
  turnierModus: z.enum(['GRUPPEN_KO', 'KO', 'LIGA']).default('GRUPPEN_KO'),
  clubId: z.number().int().positive().nullable().optional(),
  yearGroupIds: z.array(z.number().int().positive()).optional(),
  hasSponsor: z.boolean().optional(),
  sponsorName: z.string().max(200).nullable().optional(),
  sponsorUrl: z.string().max(500).nullable().optional(),
  // Base64-Data-URI des Sponsoren-Logos; Obergrenze verhindert übergroße Payloads (~6MB dekodiert)
  logo: z.string().max(8_000_000).nullable().optional(),
  teamsAdvancingPerGroup: z.number().int().min(1).max(16).optional(),
  playoutAllPlacements: z.boolean().optional(),
  thirdPlaceMatch: z.boolean().optional(),
  qualificationRule: z.string().max(50).nullable().optional()
});

const datesInOrder = (data: { startDate?: string | Date; endDate?: string | Date }) => {
  if (!data.startDate || !data.endDate) return true;
  return new Date(data.startDate) <= new Date(data.endDate);
};

export const tournamentSchema = tournamentBaseSchema.refine(datesInOrder, {
  message: 'Enddatum darf nicht vor dem Startdatum liegen',
  path: ['endDate']
});

// Für PATCH /:id: alle Felder optional, gleiche Cross-Field-Prüfung falls beide Daten gesetzt sind.
export const updateTournamentSchema = tournamentBaseSchema.partial().refine(datesInOrder, {
  message: 'Enddatum darf nicht vor dem Startdatum liegen',
  path: ['endDate']
});

export const tournamentStatusSchema = z.object({
  status: z.enum(['aktiv', 'entwurf', 'archiviert'])
});

export const tournamentModeSchema = z.object({
  turnierModus: z.enum(['GRUPPEN_KO', 'KO', 'LIGA']),
  teamsAdvancingPerGroup: z.number().int().min(1).max(16).optional(),
  playoutAllPlacements: z.boolean().optional(),
  thirdPlaceMatch: z.boolean().optional(),
  qualificationRule: z.string().max(50).nullable().optional()
});

export const uploadLogoSchema = z.object({
  // Base64-Data-URI (Frontend nutzt FileReader.readAsDataURL); Obergrenze ~6MB dekodiert
  logoBase64: z.string().min(1, 'Kein Logo übermittelt').max(8_000_000, 'Logo zu groß')
});

export const generateMatchesSchema = z.object({
  yearGroupId: z.number().int().positive(),
  matchDuration: z.number().int().min(1).max(180).optional(),
  halves: z.number().int().min(1).max(4).optional(),
  halftimeBreak: z.number().int().min(0).max(60).optional(),
  breakDuration: z.number().int().min(0).max(120).optional()
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
    where: { id: parseInt(String(req.params.id as string)) },
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
      yearGroups: yearGroupIds ? { connect: yearGroupIds.map((id: number) => ({ id })) } : undefined
    }
  });
  logTournamentCreated(tournament.id, tournament.name);
  res.status(201).json(tournament);
};

export const updateTournament = async (req: Request, res: Response) => {
  try {
    const { yearGroupIds } = req.body;

    // Nur erlaubte Felder übernehmen (kein Mass-Assignment über rohen req.body,
    // insbesondere kein Überschreiben von id/createdAt)
    const ALLOWED = [
      'name', 'description', 'startDate', 'endDate', 'status', 'turnierModus',
      'teamsAdvancingPerGroup', 'playoutAllPlacements', 'thirdPlaceMatch',
      'qualificationRule', 'clubId', 'hasSponsor', 'sponsorName', 'sponsorUrl', 'logo'
    ] as const;
    const updateData: Record<string, unknown> = {};
    for (const key of ALLOWED) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate as string | number | Date);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate as string | number | Date);

    // clubId als null wenn leer/0
    if (updateData.clubId === '' || updateData.clubId === 0) updateData.clubId = null;

    // yearGroupIds aktualisieren (viele-zu-viele)
    if (yearGroupIds !== undefined) {
      updateData.yearGroups = { set: yearGroupIds.map((id: number) => ({ id })) };
    }
    
    const tournament = await prisma.tournament.update({
      where: { id: parseInt(String(req.params.id as string)) },
      data: updateData,
      include: { club: true, yearGroups: true }
    });
    logTournamentUpdated(tournament.id, Object.keys(updateData));
    return res.json(tournament);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('updateTournament error:', message);
    return res.status(400).json({ error: message });
  }
};

export const updateTournamentStatus = async (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['aktiv', 'entwurf', 'archiviert'].includes(status)) {
    return res.status(400).json({ error: 'Ungültiger Status' });
  }
  const tournament = await prisma.tournament.update({
    where: { id: parseInt(String(req.params.id as string)) },
    data: { status }
  });
  return res.json(tournament);
};

export const deleteTournament = async (req: Request, res: Response) => {
  await prisma.tournament.delete({ where: { id: parseInt(String(req.params.id as string)) } });
  return res.status(204).send();
};

/**
 * Turnier-Modus ändern und automatisch Paarungen generieren.
 */
export const updateTournamentMode = async (req: Request, res: Response) => {
  const { turnierModus, teamsAdvancingPerGroup, playoutAllPlacements, thirdPlaceMatch, qualificationRule } = req.body;
  
  if (!['GRUPPEN_KO', 'KO', 'LIGA'].includes(turnierModus)) {
    return res.status(400).json({ error: 'Ungültiger Turnier-Modus' });
  }

  const tournamentId = parseInt(String(req.params.id as string));

  // Modus-Update + Löschen des alten Spielplans atomar: bricht ein Schritt ab,
  // bleibt kein halb gelöschter Spielplan zurück.
  const tournament = await prisma.$transaction(async (tx) => {
    const updated = await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        turnierModus,
        ...(teamsAdvancingPerGroup !== undefined && { teamsAdvancingPerGroup: parseInt(teamsAdvancingPerGroup as string) }),
        ...(playoutAllPlacements !== undefined && { playoutAllPlacements: Boolean(playoutAllPlacements) }),
        ...(thirdPlaceMatch !== undefined && { thirdPlaceMatch: Boolean(thirdPlaceMatch) }),
        ...(qualificationRule !== undefined && { qualificationRule: String(qualificationRule) })
      }
    });

    // Spielplan löschen
    await tx.match.deleteMany({ where: { tournamentId } });
    await tx.knockoutBracket.deleteMany({ where: { tournamentId } });
    await tx.standingsEntry.deleteMany({ where: { tournamentId } });

    return updated;
  });

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

interface ScheduleMatch {
  tournamentId: number;
  yearGroupId: number;
  stage?: number | null;
  teamAId?: number | null;
  teamBId?: number | null;
  placeholderA?: string | null;
  placeholderB?: string | null;
  bracketId?: number | null;
  upperBound?: number | null;
  lowerBound?: number | null;
  phase: string;
  groupId?: number | null;
  label?: string | null;
  nextMatchId?: number | null;
  [key: string]: unknown;
}

async function scheduleAndSaveMatches(
  matchesToSchedule: ScheduleMatch[],
  tournamentId: number,
  yearGroupId: number,
  params: ScheduleParams
) {
  let matchesCreated = 0;
  
  // Nur Spielfelder für diesen Jahrgang
  let fields = await prisma.field.findMany({ 
    where: { 
      tournamentId,
      yearGroupId 
    } 
  });
  
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

  const lastExistingMatch = await prisma.match.findFirst({
    where: { tournamentId, yearGroupId },
    orderBy: { time: 'desc' }
  });

  if (lastExistingMatch && lastExistingMatch.time) {
    currentTime = new Date(lastExistingMatch.time);
    
    const lastFieldIndex = fields.findIndex(f => f.id === lastExistingMatch.fieldId);
    currentFieldIdx = lastFieldIndex !== -1 ? lastFieldIndex + 1 : 0;
    
    if (currentFieldIdx >= fields.length) {
      currentFieldIdx = 0;
      currentTime = new Date(currentTime.getTime() + blockDuration * 60000);
    }
    
    // Finde den passenden Slot
    for (let i = 0; i < timeSlots.length; i++) {
      const sStart = parseTime(timeSlots[i].date, timeSlots[i].startTime);
      const sEnd = parseTime(timeSlots[i].date, timeSlots[i].endTime);
      if (currentTime >= sStart && currentTime <= sEnd) {
        currentSlotIdx = i;
        break;
      }
      if (currentTime < sStart) {
        currentSlotIdx = i;
        currentTime = sStart;
        currentFieldIdx = 0;
        break;
      }
    }
  }

  while (matchesToSchedule.length > 0) {
    // Teams nur zurücksetzen wenn wir einen NEUEN Block starten (neues Feld ODER neuer Slot)
    const isNewBlock = currentFieldIdx === 0 && teamsPlayingInCurrentSlot.size > 0;
    if (isNewBlock) {
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
        tournamentId: match.tournamentId,
        yearGroupId: match.yearGroupId,
        teamAId: match.teamAId,
        teamBId: match.teamBId,
        placeholderA: match.placeholderA as string | null | undefined,
        placeholderB: match.placeholderB as string | null | undefined,
        bracketId: match.bracketId as number | null | undefined,
        stage: match.stage as number | null | undefined,
        upperBound: match.upperBound as number | null | undefined,
        lowerBound: match.lowerBound as number | null | undefined,
        phase: match.phase,
        groupId: match.groupId,
        label: match.label,
        nextMatchId: match.nextMatchId,
        time: currentTime,
        fieldId: field.id
      }
    });
    matchesCreated++;

    currentFieldIdx++;
    // Pause einplanen wenn Block endet (alle Felder belegt ODER letztes Spiel gespielt)
    if (currentFieldIdx >= fields.length || matchesToSchedule.length === 0) {
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

  const tournamentId = parseInt(String(req.params.id as string));
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return res.status(404).json({ error: 'Turnier nicht gefunden' });

  const mode = tournament.turnierModus || 'GRUPPEN_KO';
  let result: Record<string, unknown> = { message: '', matchesCreated: 0, bracketsCreated: 0 };
  
  const params: ScheduleParams = {
    matchDuration: parseInt(String(matchDuration as string)),
    halves: parseInt(String(halves as string)),
    halftimeBreak: parseInt(String(halftimeBreak as string)),
    breakDuration: parseInt(String(breakDuration as string))
  };

  try {
    const yId = parseInt(String(yearGroupId as string));
    
    // Alten Spielplan dieses Jahrgangs komplett verwerfen, bevor neu generiert wird
    // Wichtig: Zuerst Matches löschen (die auf Brackets verweisen), dann Brackets
    const deletedMatches = await prisma.match.deleteMany({ where: { tournamentId, yearGroupId: yId } });
    const deletedStandings = await prisma.standingsEntry.deleteMany({ where: { tournamentId, team: { yearGroupId: yId } } });
    const deletedBrackets = await prisma.knockoutBracket.deleteMany({ where: { tournamentId, yearGroupId: yId } });
    console.log(`[Generate] Alte Daten gelöscht: ${deletedMatches.count} Matches, ${deletedStandings.count} Standings, ${deletedBrackets.count} Brackets`);

    if (mode === 'GRUPPEN_KO') {
      result = await generateGruppenKO(tournamentId, parseInt(String(yearGroupId as string)), params);
    } else if (mode === 'KO') {
      result = await generateKO(tournamentId, parseInt(String(yearGroupId as string)), params);
    } else if (mode === 'LIGA') {
      result = await generateLiga(tournamentId, parseInt(String(yearGroupId as string)), params);
    }

    return res.json({ tournament, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten.';
    return res.status(400).json({ error: message });
  }
};

// Sponsor-Logo hochladen (Base64)
export const uploadTournamentLogo = async (req: Request, res: Response) => {
  const tournamentId = parseInt(String(req.params.id as string));
  const { logoBase64 } = req.body;
  if (!logoBase64) return res.status(400).json({ error: 'Kein Logo übermittelt' });

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { logo: logoBase64 }
  });

  return res.json({ message: 'Logo aktualisiert' });
};

// KO-Phase separat generieren (ohne Gruppen zu löschen)
export const generateKoOnly = async (req: Request, res: Response) => {
  const { yearGroupId } = req.body;
  if (!yearGroupId) {
    return res.status(400).json({ error: 'yearGroupId ist erforderlich' });
  }

  const tournamentId = parseInt(String(req.params.id as string));
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return res.status(404).json({ error: 'Turnier nicht gefunden' });

  // Nur KO-Modus erlaubt
  if (tournament.turnierModus !== 'KO') {
    return res.status(400).json({ error: 'Nur für reine K.O.-Turniere verfügbar. Für GRUPPEN_KO nutze den Button im Spielplan-Tab.' });
  }

  const params: ScheduleParams = {
    matchDuration: parseInt(String(req.body.matchDuration || 15)),
    halves: parseInt(String(req.body.halves || 2)),
    halftimeBreak: parseInt(String(req.body.halftimeBreak || 5)),
    breakDuration: parseInt(String(req.body.breakDuration || 5))
  };

  try {
    const yId = parseInt(String(yearGroupId));
    
    // Nur bestehende KO-Matches/Brackets löschen, NICHT die Gruppen!
    const deletedMatches = await prisma.match.deleteMany({ where: { tournamentId, yearGroupId: yId, bracketId: { not: null } } });
    const deletedBrackets = await prisma.knockoutBracket.deleteMany({ where: { tournamentId, yearGroupId: yId } });
    console.log(`[GenerateKoOnly] Alte KO-Daten gelöscht: ${deletedMatches.count} Matches, ${deletedBrackets.count} Brackets`);

    const result = await generateKO(tournamentId, yId, params);
    return res.json({ ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten.';
    return res.status(400).json({ error: message });
  }
};

// KO-Phase für GRUPPEN_KO separat generieren (ohne Gruppen zu löschen!)

export const generateKoFromGruppen = async (req: Request, res: Response) => {
  const { yearGroupId } = req.body;
  if (!yearGroupId) {
    return res.status(400).json({ error: 'yearGroupId ist erforderlich' });
  }

  const tournamentId = parseInt(String(req.params.id as string));
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return res.status(404).json({ error: 'Turnier nicht gefunden' });

  // Nur GRUPPEN_KO erlaubt
  if (tournament.turnierModus !== 'GRUPPEN_KO') {
    return res.status(400).json({ error: 'Nur für Gruppenphase + K.O.-Turniere verfügbar.' });
  }

  const params: ScheduleParams = {
    matchDuration: parseInt(String(req.body.matchDuration || 15)),
    halves: parseInt(String(req.body.halves || 2)),
    halftimeBreak: parseInt(String(req.body.halftimeBreak || 5)),
    breakDuration: parseInt(String(req.body.breakDuration || 5))
  };

  try {
    const yId = parseInt(String(yearGroupId));
    
    // Nur KO-Matches/Brackets löschen, NICHT die Gruppen!
    const deletedMatches = await prisma.match.deleteMany({ where: { tournamentId, yearGroupId: yId, bracketId: { not: null } } });
    const deletedBrackets = await prisma.knockoutBracket.deleteMany({ where: { tournamentId, yearGroupId: yId } });
    console.log(`[GenerateKoFromGruppen] Alte KO-Daten gelöscht: ${deletedMatches.count} Matches, ${deletedBrackets.count} Brackets`);

    let groups = await prisma.group.findMany({
      where: { tournamentId, yearGroup: { id: yId } },
      orderBy: { order: 'asc' }
    });

    // Fallback: Wenn keine Gruppen existieren, aber Matches mit played scores,
    // erstelle automatisch eine Standard-Gruppe aus den vorhandenen Matches.
    if (groups.length === 0) {
      const playedMatches = await prisma.match.findMany({
        where: { tournamentId, yearGroupId: yId, scoreA: { not: null }, scoreB: { not: null } }
      });
      
      if (playedMatches.length >= 3) {
        // Mindestens 3 Spiele für eine sinnvolle Gruppe
        const defaultGroup = await prisma.group.create({
          data: { tournamentId, yearGroupId: yId, name: 'Gruppe A', order: 1 }
        });
        groups = [defaultGroup];
        console.log(`[GenerateKoFromGruppen] Keine Gruppen gefunden – Standard-Gruppe "Gruppe A" erstellt aus ${playedMatches.length} gespielten Matches.`);
      } else {
        return res.status(400).json({ error: 'Zu wenige gespielte Spiele für KO-Phase. Mindestens 3 Spiele benötigt.' });
      }
    }

    const advancingPerGroup = tournament?.teamsAdvancingPerGroup || 2;
    const totalKoTeams = groups.length * advancingPerGroup;
    
    if (totalKoTeams < 2) {
      return res.status(400).json({ error: 'Zu wenige Teams für K.O.-Phase konfiguriert.' });
    }

    const bracket = await prisma.knockoutBracket.create({
      data: { tournamentId, yearGroupId: yId, name: 'Finalrunde', order: 1, runde: 'Finals' }
    });
    
    let participants = [];
    const numMatches = Math.ceil(totalKoTeams / 2);
    for (let i = 0; i < numMatches; i++) {
      let pA = `TBD ${i * 2 + 1}`;
      let pB = `TBD ${i * 2 + 2}`;
      
      if (groups.length === 1) {
        pA = `${i * 2 + 1}. ${groups[0].name}`;
        pB = `${i * 2 + 2}. ${groups[0].name}`;
      } else if (advancingPerGroup === 1) {
        const gA = i * 2;
        const gB = i * 2 + 1;
        pA = gA < groups.length ? `1. ${groups[gA].name}` : `TBD ${i * 2 + 1}`;
        pB = gB < groups.length ? `1. ${groups[gB].name}` : `TBD ${i * 2 + 2}`;
      } else {
        const rankIndex = Math.floor(i / groups.length);
        const groupIndex = i % groups.length;
        
        const rankA = rankIndex + 1;
        const rankB = advancingPerGroup - rankIndex;
        
        const groupIndexA = groupIndex;
        const groupIndexB = (groupIndex + rankA) % groups.length;
        
        pA = `${rankA}. ${groups[groupIndexA].name}`;
        pB = `${rankB}. ${groups[groupIndexB].name}`;
      }
      
      participants.push({ placeholder: pA });
      participants.push({ placeholder: pB });
    }
    
    const koMatches = generateKnockoutTree(
      tournamentId,
      yId,
      bracket.id,
      participants,
      tournament?.playoutAllPlacements || false,
      tournament?.thirdPlaceMatch !== false,
      2, // startStage
      tournament?.qualificationRule
    );

    const matchesCreated = await scheduleAndSaveMatches(koMatches, tournamentId, yId, params);
    return res.json({ message: `K.O.-Bracket (Platzhalter) mit ${koMatches.length} Spielen erstellt`, matchesCreated, bracketsCreated: 1 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Ein unerwarteter Fehler ist aufgetreten.';
    return res.status(400).json({ error: message });
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

