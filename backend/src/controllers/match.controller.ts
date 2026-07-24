import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { logMatchScoreUpdated, logMatchReset } from '../utils/logger.js';
import { computeKoPropagation } from '../utils/knockout.js';
import { z } from 'zod';

export const matchSchema = z.object({
  tournamentId: z.number().int().positive(),
  yearGroupId: z.number().int().positive().nullable().optional(),
  timeSlotId: z.number().int().positive().nullable().optional(),
  fieldId: z.number().int().positive().nullable().optional(),
  teamAId: z.number().int().positive(),
  teamBId: z.number().int().positive(),
  scoreA: z.number().int().min(0).nullable().optional(),
  scoreB: z.number().int().min(0).nullable().optional(),
  phase: z.string().optional(),
  runde: z.string().nullable().optional(),
  bracketTyp: z.enum(['sieger', 'verlierer']).nullable().optional(),
  siegerId: z.number().int().positive().nullable().optional(),
  verliererId: z.number().int().positive().nullable().optional(),
  status: z.enum(['geplant', 'gespielt', 'abgeschlossen', 'abgesagt']).optional(),
  time: z.string().datetime().or(z.date()),
  // K.O.-/Bracket-Felder (werden beim manuellen Anlegen/Bearbeiten evtl. mitgesendet)
  bracketId: z.number().int().positive().nullable().optional(),
  stage: z.number().int().nullable().optional(),
  upperBound: z.number().int().nullable().optional(),
  lowerBound: z.number().int().nullable().optional(),
  placeholderA: z.string().nullable().optional(),
  placeholderB: z.string().nullable().optional()
});

export const getMatchesByTournament = async (req: Request, res: Response) => {
  if (!req.params.tournamentId) return res.json([]);
  const ms = await prisma.match.findMany({
    where: { tournamentId: parseInt(String(req.params.tournamentId as string)) },
    include: { teamA: true, teamB: true, timeSlot: true, field: true, bracket: true },
    orderBy: [{ time: 'asc' }]
  });
  return res.json(ms || []);
};

export const createMatch = async (req: Request, res: Response) => {
  const body = req.body;
  if (body.time) body.time = new Date(body.time);
  
  if (body.teamAId === body.teamBId) {
    return res.status(400).json({ error: 'Team A und Team B dürfen nicht identisch sein' });
  }

  const m = await prisma.match.create({ data: body, include: { teamA: true, teamB: true, timeSlot: true, field: true } });
  res.status(201).json(m);
};

// Teams aus Gruppenphase in KO-Spiele zuweisen basierend auf Platzhalter-Text (z.B. "1. Gruppe A")
export const assignKOTeams = async (req: Request, res: Response) => {
  const { tournamentId, yearGroupId } = req.body;

  if (!tournamentId || !yearGroupId) {
    return res.status(400).json({ error: 'tournamentId und yearGroupId erforderlich' });
  }

  // Alle gespielten Matches laden und im Code filtern (Prisma unterstützt kein contains+or)
  const gruppenMatches = await prisma.match.findMany({
    where: { tournamentId, yearGroupId, status: 'gespielt' }
  }).then(m => m.filter(match => match.phase && (match.phase.startsWith('Gruppe') || match.phase === 'Liga')));

  if (gruppenMatches.length === 0) {
    return res.status(400).json({ error: 'Keine gespielten Gruppenspiele gefunden. Bitte zuerst alle Spiele absolvieren.' });
  }

  // Standings pro Gruppe berechnen
  const groupStats = new Map<string, Map<number, { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number }>>();

  for (const match of gruppenMatches) {
    if (!match.phase || !match.teamAId || !match.teamBId || match.scoreA === null || match.scoreB === null) continue;

    const phase = match.phase;
    if (!groupStats.has(phase)) groupStats.set(phase, new Map());

    [match.teamAId, match.teamBId].forEach((teamId, idx) => {
      let stats = groupStats.get(phase)?.get(teamId);
      if (!stats) { stats = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }; groupStats.get(phase)?.set(teamId, stats); }
      stats.played++;
      const gf = idx === 0 ? match.scoreA : match.scoreB;
      const ga = idx === 0 ? match.scoreB : match.scoreA;
      stats.goalsFor += gf!;
      stats.goalsAgainst += ga!;
      if (gf! > ga!) stats.won++;
      else if (gf! === ga!) stats.drawn++;
      else stats.lost++;
    });
  }

  // Pro Gruppe sortierte Teams erstellen
  const groupRankings: Record<string, number[]> = {};
  for (const [groupName, stats] of groupStats) {
    const ranked = Array.from(stats.entries())
      .map(([teamId, s]) => ({ teamId, ...s, points: s.won * 3 + s.drawn }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const diffA = a.goalsFor - a.goalsAgainst;
        const diffB = b.goalsFor - b.goalsAgainst;
        if (diffB !== diffA) return diffB - diffA;
        return b.goalsFor - a.goalsFor;
      })
      .map(x => x.teamId);
    groupRankings[groupName] = ranked;
  }

  // Alle KO-Matches laden und Teams zuweisen
  const koMatches = await prisma.match.findMany({
    where: { tournamentId, yearGroupId },
    orderBy: { id: 'asc' }
  });

  let updatedCount = 0;

  for (const match of koMatches) {
    if (!match.placeholderA && !match.placeholderB) continue; // Kein Platzhalter → skip

    const updateData: any = {};

    // placeholderA parsen: "1. Gruppe A" → position=1, group="Gruppe A"
    if (match.placeholderA) {
      const matchPosGroup = match.placeholderA.match(/^(\d+)\.\s*(.+)$/);
      if (matchPosGroup) {
        const pos = parseInt(matchPosGroup[1] as string);
        const groupName = matchPosGroup[2].trim();
        const ranking = groupRankings[groupName];
        if (ranking && ranking[pos - 1]) {
          updateData.teamAId = ranking[pos - 1];
          updatedCount++;
        }
      }
    }

    // placeholderB parsen
    if (match.placeholderB) {
      const matchPosGroup = match.placeholderB.match(/^(\d+)\.\s*(.+)$/);
      if (matchPosGroup) {
        const pos = parseInt(matchPosGroup[1] as string);
        const groupName = matchPosGroup[2].trim();
        const ranking = groupRankings[groupName];
        if (ranking && ranking[pos - 1]) {
          updateData.teamBId = ranking[pos - 1];
          updatedCount++;
        }
      }
    }

    // Nur aktualisieren wenn sich was geändert hat
    if (Object.keys(updateData).length > 0) {
      await prisma.match.update({ where: { id: match.id }, data: updateData });
    }
  }

  return res.json({ success: true, updatedCount });
};

export const updateMatch = async (req: Request, res: Response) => {
  const body = req.body;
  if (body.time) body.time = new Date(body.time);
  
  const existing = await prisma.match.findUnique({ where: { id: parseInt(String(req.params.id as string)) } });
  if (existing && body.teamAId === body.teamBId && body.teamAId !== undefined) {
    return res.status(400).json({ error: 'Team A und Team B dürfen nicht identisch sein' });
  }

  const m = await prisma.match.update({
    where: { id: parseInt(String(req.params.id as string)) },
    data: body,
    include: { teamA: true, teamB: true, timeSlot: true, field: true }
  });

  // KO-Ergebnis → Sieger/Verlierer in nächste Runde propagieren
  if (m.bracketId && m.scoreA !== null && m.scoreB !== null) {
    logMatchScoreUpdated(m.id, m.teamA?.name || '', m.scoreA, m.teamB?.name || '', m.scoreB);

    // Alle KO-Matches dieses Turniers laden (nur Bracket-Spiele)
    const koMatches = await prisma.match.findMany({
      where: { tournamentId: m.tournamentId, bracketId: { not: null } }
    });

    // Reine Logik bestimmt Ziel-Matches + Slots (siehe utils/knockout.ts + Tests)
    const assignments = computeKoPropagation(
      {
        id: m.id, bracketId: m.bracketId, stage: m.stage,
        upperBound: m.upperBound, lowerBound: m.lowerBound,
        teamAId: m.teamAId, teamBId: m.teamBId, scoreA: m.scoreA, scoreB: m.scoreB
      },
      koMatches.map(k => ({
        id: k.id, bracketId: k.bracketId, stage: k.stage,
        upperBound: k.upperBound, lowerBound: k.lowerBound
      }))
    );

    if (assignments.length > 0) {
      // Sieger/Verlierer atomar in die Ziel-Slots eintragen (Überschreiben erlaubt,
      // damit eine korrigierte Ergebnis-Eingabe korrekt neu propagiert)
      await prisma.$transaction(
        assignments.map(a =>
          prisma.match.update({
            where: { id: a.targetMatchId },
            data: a.slot === 'teamA' ? { teamAId: a.teamId } : { teamBId: a.teamId }
          })
        )
      );
    }
  }

  return res.json(m);
};

/**
 * Match-Ergebnis zurücksetzen (Fehleingabe korrigieren)
 * - scoreA/scoreB auf null
 * - status zurück auf 'geplant'
 * - Bei KO-Matches: propagierte Teams aus downstream-Matches entfernen
 * - Standings neu berechnen
 */
export const resetMatch = async (req: Request, res: Response) => {
  const matchId = parseInt(String(req.params.id as string));
  
  // Match laden
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { teamA: true, teamB: true, tournament: true }
  });

  if (!match) {
    return res.status(404).json({ error: 'Match nicht gefunden' });
  }

  // Prüfen ob Match überhaupt gespielt ist
  if (match.scoreA === null || match.scoreB === null || match.status !== 'gespielt') {
    return res.json({ message: 'Match war bereits nicht gespielt', match });
  }

  const wasKO = !!match.bracketId;
  const tournamentId = match.tournamentId;

  // Match zurücksetzen
  const resetted = await prisma.match.update({
    where: { id: matchId },
    data: {
      scoreA: null,
      scoreB: null,
      status: 'geplant',
      siegerId: null,
      verliererId: null
    }
  });

  // === KO-Propagation / Gruppenphase-Effekt rückgängig machen ===
  if (wasKO) {
    await undoKOPropagation(matchId);
  } else {
    // Gruppenspiel zurückgesetzt → alle KO-Matches für dieses Turnier leeren
    await clearAllKOMatches(tournamentId, match.yearGroupId);
  }

  // Standings neu berechnen
  await recalculateStandingsForTournament(tournamentId);

  logMatchReset(matchId, match.tournament?.name || '');

  return res.json({
    message: wasKO 
      ? 'KO-Match zurückgesetzt, downstream-Matches geleert' 
      : 'Gruppenspiel zurückgesetzt, KO-Phase komplett geleert',
    match: resetted
  });
};

/**
 * Alle KO-Matches für ein Turnier leeren (wenn Gruppenspiel zurückgesetzt wird)
 */
async function clearAllKOMatches(tournamentId: number, yearGroupId: number | null) {
  const koMatches = await prisma.match.findMany({
    where: { tournamentId }
  });

  // Alle KO-Matches mit Teams zurücksetzen (rekursiv)
  for (const match of koMatches) {
    if (!match.bracketId) continue; // Kein KO-Match
    
    const hasTeams = !!(match.teamAId || match.teamBId);
    if (!hasTeams) continue;

    await prisma.match.update({
      where: { id: match.id },
      data: {
        teamAId: null,
        teamBId: null,
        scoreA: null,
        scoreB: null,
        status: 'geplant',
        siegerId: null,
        verliererId: null
      }
    });
  }
}

/**
 * Rekursiv alle downstream-Matches durchgehen und Teams entfernen,
 * die nur von diesem Match abhängen.
 */
async function undoKOPropagation(matchId: number) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || !match.bracketId) return;

  const koMatches = await prisma.match.findMany({
    where: { tournamentId: match.tournamentId, bracketId: { not: null } }
  });

  // Dieselbe Ziel-Logik wie beim Propagieren verwenden (garantierte Symmetrie).
  // Teams/Scores sind hier irrelevant – wir brauchen nur die Ziel-Positionen/Slots;
  // daher Dummy-Werte, die einen eindeutigen "Sieger" erzeugen.
  const targets = computeKoPropagation(
    {
      id: match.id, bracketId: match.bracketId, stage: match.stage,
      upperBound: match.upperBound, lowerBound: match.lowerBound,
      teamAId: match.teamAId ?? -1, teamBId: match.teamBId ?? -2, scoreA: 1, scoreB: 0
    },
    koMatches.map(k => ({
      id: k.id, bracketId: k.bracketId, stage: k.stage,
      upperBound: k.upperBound, lowerBound: k.lowerBound
    }))
  );

  for (const t of targets) {
    await removeTeamFromDownstream(t.targetMatchId, t.slot);
  }
}

/**
 * Entfernt ein Team aus einem downstream-Match und geht rekursiv weiter,
 * wenn dadurch das nächste Match leer wird.
 */
async function removeTeamFromDownstream(matchId: number, slot: 'teamA' | 'teamB') {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return;

  const wasPlayed = match.status === 'gespielt';

  // Verbleibende Teams NACH dem Entfernen berechnen (Fix: vorher wurde immer
  // fälschlich "beide leer" angenommen und der Score stets zurückgesetzt).
  const remainingA = slot === 'teamA' ? null : match.teamAId;
  const remainingB = slot === 'teamB' ? null : match.teamBId;
  const bothEmpty = !remainingA && !remainingB;

  await prisma.match.update({
    where: { id: matchId },
    data: {
      ...(slot === 'teamA' ? { teamAId: null } : { teamBId: null }),
      ...(bothEmpty
        ? { scoreA: null, scoreB: null, status: 'geplant', siegerId: null, verliererId: null }
        : {})
    }
  });

  // War dieses Match bereits gespielt, dessen eigene Weitergabe ebenfalls rückgängig machen
  if (wasPlayed && match.bracketId) {
    await undoKOPropagation(matchId);
  }
}

/**
 * Spiel als abgeschlossen markieren/unmarkieren (für die UI-Trennung)
 */
export const toggleCompleted = async (req: Request, res: Response) => {
  const matchId = parseInt(String(req.params.id as string));
  
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return res.status(404).json({ error: 'Match nicht gefunden' });
  }

  // Nur gespielte Spiele können abgeschlossen werden
  if (match.scoreA === null || match.scoreB === null) {
    return res.json({ message: 'Spiel muss gespielt sein', completed: false, match });
  }

  const newStatus = match.status === 'abgeschlossen' ? 'gespielt' : 'abgeschlossen';
  const updated = await prisma.match.update({
    where: { id: matchId },
    data: { status: newStatus }
  });

  return res.json({ completed: newStatus === 'abgeschlossen', match: updated });
};

export const deleteMatch = async (req: Request, res: Response) => {
  await prisma.match.delete({ where: { id: parseInt(String(req.params.id as string)) } });
  return res.status(204).send();
};

async function recalculateStandingsForTournament(tournamentId: number) {
  // Nur Gruppen-/Liga-Spiele (bracketId: null) fließen in die Tabelle ein, keine K.O.-Spiele.
  const matches = await prisma.match.findMany({
    where: { tournamentId, bracketId: null, status: 'gespielt', scoreA: { not: null }, scoreB: { not: null } },
    include: { teamA: true, teamB: true }
  });

  const teamStats = new Map<number, { played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number }>();

  for (const m of matches) {
    const scoreA = m.scoreA ?? 0;
    const scoreB = m.scoreB ?? 0;
    
    // Nur wenn beide Teams existieren
    if (!m.teamAId || !m.teamBId) continue;
    
    let a = teamStats.get(m.teamAId);
    if (!a) { a = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }; teamStats.set(m.teamAId, a); }
    a.played++;
    a.goalsFor += scoreA;
    a.goalsAgainst += scoreB;
    if (scoreA > scoreB) a.won++;
    else if (scoreA === scoreB) a.drawn++;
    else a.lost++;

    let b = teamStats.get(m.teamBId);
    if (!b) { b = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }; teamStats.set(m.teamBId, b); }
    b.played++;
    b.goalsFor += scoreB;
    b.goalsAgainst += scoreA;
    if (scoreB > scoreA) b.won++;
    else if (scoreB === scoreA) b.drawn++;
    else b.lost++;
  }

  const entries = await Promise.all(
    Array.from(teamStats.entries()).map(async ([teamId, stats]) => {
      const points = (stats.won * 3) + stats.drawn;
      return prisma.standingsEntry.upsert({
        where: { teamId_tournamentId: { teamId, tournamentId } },
        update: { ...stats, points },
        create: { teamId, tournamentId, ...stats, points }
      });
    })
  );

  const sorted = entries.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const diffA = a.goalsFor - a.goalsAgainst;
    const diffB = b.goalsFor - b.goalsAgainst;
    if (diffB !== diffA) return diffB - diffA;
    return b.goalsFor - a.goalsFor;
  });

  for (let i = 0; i < sorted.length; i++) {
    await prisma.standingsEntry.update({
      where: { id: sorted[i].id },
      data: { position: i + 1 }
    });
  }
}
