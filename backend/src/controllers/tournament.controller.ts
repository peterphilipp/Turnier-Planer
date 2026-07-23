import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

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
  const { turnierModus } = req.body;
  
  if (!['GRUPPEN_KO', 'KO', 'LIGA', 'DOPPEL_KO'].includes(turnierModus)) {
    return res.status(400).json({ error: 'Ungültiger Turnier-Modus' });
  }

  const tournamentId = parseInt(String(req.params.id));
  
  // Modus aktualisieren
  const tournament = await prisma.tournament.update({
    where: { id: tournamentId },
    data: { turnierModus }
  });

  return res.json({ tournament, message: `Modus geändert zu ${turnierModus}` });
};

/**
 * Spielplan für einen Jahrgang generieren.
 */
export const generateMatchesForYearGroup = async (req: Request, res: Response) => {
  const { yearGroupId } = req.body;
  
  if (!yearGroupId) {
    return res.status(400).json({ error: 'yearGroupId ist erforderlich' });
  }

  const tournamentId = parseInt(String(req.params.id));
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return res.status(404).json({ error: 'Turnier nicht gefunden' });

  const mode = tournament.turnierModus || 'GRUPPEN_KO';
  let result = { message: '', matchesCreated: 0, bracketsCreated: 0 };

  if (mode === 'GRUPPEN_KO') {
    result = await generateGruppenKO(tournamentId, parseInt(String(yearGroupId)));
  } else if (mode === 'KO') {
    result = await generateKO(tournamentId, parseInt(String(yearGroupId)));
  } else if (mode === 'LIGA') {
    result = await generateLiga(tournamentId, parseInt(String(yearGroupId)));
  } else if (mode === 'DOPPEL_KO') {
    result = await generateDoppelKO(tournamentId, parseInt(String(yearGroupId)));
  }

  return res.json({ tournament, ...result });
};

// ==================== Turnier-Modi Generatoren ====================

async function generateGruppenKO(tournamentId: number, yearGroupId?: number) {
  let matchesCreated = 0;
  
  // Wenn yearGroupId gegeben ist → nur Gruppen dieses Jahrgangs
  const groups = await prisma.group.findMany({
    where: yearGroupId ? { tournamentId, yearGroup: { id: yearGroupId } } : { tournamentId },
    orderBy: { order: 'asc' }
  });
  
  if (groups.length === 0) {
    return { message: 'Keine Gruppen für diesen Jahrgang gefunden. Bitte zuerst unter "Gruppen & Teams" anlegen.', matchesCreated: 0 };
  }
  
  // Für jede Gruppe Gruppenspiele generieren (Jeder gegen jeden)
  for (const group of groups) {
    const teams = await prisma.team.findMany({ where: { groupId: group.id, yearGroupId } });
    
    if (teams.length < 2) continue;
    
    // Jeder gegen jeden in der Gruppe
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        await prisma.match.create({
          data: {
            tournamentId,
            yearGroupId: yearGroupId || undefined,
            teamAId: teams[i].id,
            teamBId: teams[j].id,
            phase: `${group.name}`,
            status: 'geplant',
            time: new Date()
          }
        });
        matchesCreated++;
      }
    }

    // Gruppentabelle erstellen
    for (const team of teams) {
      await prisma.standingsEntry.upsert({
        where: { teamId_tournamentId: { teamId: team.id, tournamentId } },
        update: {},
        create: { teamId: team.id, tournamentId }
      });
    }
  }

  return { message: `${groups.length} Gruppen mit Gruppenspielen erstellt`, matchesCreated };
}

async function generateKO(tournamentId: number, yearGroupId?: number) {
  const teams = await prisma.team.findMany({ 
    where: yearGroupId ? { tournamentId, yearGroupId } : { tournamentId },
    orderBy: { name: 'asc' }
  });
  
  if (teams.length < 2) return { message: 'Mindestens 2 Teams benötigt für K.O.', matchesCreated: 0, bracketsCreated: 0 };

  // Bracket erstellen
  const bracket = await prisma.knockoutBracket.create({
    data: { tournamentId, name: 'Sieger-Bracket', runde: 'Erste Runde', order: 1 }
  });

  // Paarungen generieren (1vs2, 3vs4, ...)
  let matchesCreated = 0;
  for (let i = 0; i < teams.length - 1; i += 2) {
    await prisma.match.create({
      data: {
        tournamentId,
        yearGroupId: yearGroupId || undefined,
        teamAId: teams[i].id,
        teamBId: teams[i + 1]?.id || teams[0].id, // Bye wenn ungerade Anzahl
        phase: 'K.O.',
        runde: `Runde ${Math.ceil((i + 2) / 2)}`,
        bracketTyp: 'sieger',
        bracketId: bracket.id,
        status: 'geplant',
        time: new Date()
      }
    });
    matchesCreated++;
  }

  return { message: `K.O.-Bracket mit ${matchesCreated} Spielen erstellt`, matchesCreated, bracketsCreated: 1 };
}

async function generateLiga(tournamentId: number, yearGroupId?: number) {
  const teams = await prisma.team.findMany({ 
    where: yearGroupId ? { tournamentId, yearGroupId } : { tournamentId },
    orderBy: { name: 'asc' }
  });
  let matchesCreated = 0;
  
  if (teams.length < 2) return { message: 'Mindestens 2 Teams benötigt für Liga', matchesCreated, bracketsCreated: 0 };

  // Jeder gegen jeden
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      await prisma.match.create({
        data: {
          tournamentId,
          yearGroupId: yearGroupId || undefined,
          teamAId: teams[i].id,
          teamBId: teams[j].id,
          phase: 'Liga',
          status: 'geplant',
          time: new Date()
        }
      });
      matchesCreated++;
    }
  }

  // Tabelle erstellen
  for (const team of teams) {
    await prisma.standingsEntry.upsert({
      where: { teamId_tournamentId: { teamId: team.id, tournamentId } },
      update: {},
      create: { teamId: team.id, tournamentId }
    });
  }

  return { message: `Liga-Spielplan mit ${matchesCreated} Spielen erstellt`, matchesCreated, bracketsCreated: 0 };
}

async function generateDoppelKO(tournamentId: number, yearGroupId?: number) {
  const teams = await prisma.team.findMany({ 
    where: yearGroupId ? { tournamentId, yearGroupId } : { tournamentId },
    orderBy: { name: 'asc' }
  });
  let matchesCreated = 0;
  
  if (teams.length < 2) return { message: 'Mindestens 2 Teams benötigt für Doppel-K.O.', matchesCreated, bracketsCreated: 0 };

  // Sieger-Bracket
  const siegerBracket = await prisma.knockoutBracket.create({
    data: { tournamentId, name: 'Sieger-Bracket', runde: 'Erste Runde', order: 1 }
  });

  // Verlierer-Runden (so viele wie nötig)
  const verliererRunden = Math.ceil(Math.log2(teams.length));
  for (let r = 1; r <= verliererRunden; r++) {
    await prisma.knockoutBracket.create({
      data: { tournamentId, name: `Verlierer-Runde-${r}`, runde: `Verlierer-Runde-${r}`, order: r + 1 }
    });
  }

  // Erste Runde Sieger-Bracket
  for (let i = 0; i < teams.length - 1; i += 2) {
    await prisma.match.create({
      data: {
        tournamentId,
        yearGroupId: yearGroupId || undefined,
        teamAId: teams[i].id,
        teamBId: teams[i + 1]?.id || teams[0].id,
        phase: 'Doppel-K.O.',
        runde: `Sieger-Runde-1`,
        bracketTyp: 'sieger',
        bracketId: siegerBracket.id,
        status: 'geplant',
        time: new Date()
      }
    });
    matchesCreated++;
  }

  return { message: `Doppel-K.O. mit Sieger-Bracket + ${verliererRunden} Verlierer-Runde(n) erstellt`, matchesCreated, bracketsCreated: 1 + verliererRunden };
}
