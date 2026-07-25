import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { logJobAssigned, logJobUnassigned } from '../utils/logger.js';
import JWT_SECRET from '../config/jwt.js';
import { getVapidPublicKey as getPubKey } from '../utils/push.js';

// Öffentliche Self-Service-Endpunkte: Body-Formen entsprechen exakt dem, was
// das Frontend sendet (SelfServiceView.tsx / utils/push.ts) - hier werden nur
// plausible Grenzen ergänzt, kein neuer Vertrag erfunden.
export const assignShiftSchema = z.object({
  shiftId: z.number().int().positive('shiftId muss eine positive Ganzzahl sein'),
  // Wird vom Frontend mitgeschickt, aber vom Controller aktuell nicht verwendet.
  date: z.string().max(50).optional()
});

export const rateShiftSchema = z.object({
  ratingWorkload: z.number().int().min(1, 'Wert muss zwischen 1 und 5 liegen').max(5, 'Wert muss zwischen 1 und 5 liegen').nullable().optional(),
  ratingOrganization: z.number().int().min(1, 'Wert muss zwischen 1 und 5 liegen').max(5, 'Wert muss zwischen 1 und 5 liegen').nullable().optional(),
  ratingFun: z.number().int().min(1, 'Wert muss zwischen 1 und 5 liegen').max(5, 'Wert muss zwischen 1 und 5 liegen').nullable().optional(),
  ratingComment: z.string().max(1000, 'Kommentar darf maximal 1000 Zeichen lang sein').nullable().optional()
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().url('Ungültiger Endpoint').max(2000),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(1, 'p256dh erforderlich').max(500),
    auth: z.string().min(1, 'auth erforderlich').max(500)
  })
});

// Helper: Get userId from token
const getUserId = (req: Request): number | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const bearerToken = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(bearerToken, JWT_SECRET) as { userId: number };
    return decoded.userId;
  } catch {
    return null;
  }
};

/** Minuten seit Mitternacht → "HH:MM". */
const minToTime = (m: number): string =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

async function resolveTournamentForUser(
  userId: number,
  requestedTournamentId?: number,
  userPreferredTournamentId?: number | null
) {
  const activeTournaments = await prisma.tournament.findMany({
    where: { status: 'aktiv' },
    orderBy: { startDate: 'desc' },
    include: { yearGroups: true }
  });

  if (activeTournaments.length === 0) {
    return { targetTournamentId: null, availableTournaments: [] };
  }

  const userShifts = await prisma.volunteerShift.findMany({
    where: { userId },
    select: { tournamentId: true }
  });
  const shiftTournamentIds = new Set(userShifts.map(s => s.tournamentId));

  const userDonations = await prisma.foodDonation.findMany({
    where: { userId },
    select: { tournamentId: true }
  });
  const donationTournamentIds = new Set(userDonations.map(d => d.tournamentId));

  const userChildren = await prisma.userChild.findMany({ where: { userId } });
  const userChildYears = userChildren.map(c => c.childYear);

  let relevantTournaments = activeTournaments.filter(t => {
    if (shiftTournamentIds.has(t.id)) return true;
    if (donationTournamentIds.has(t.id)) return true;
    if (userPreferredTournamentId === t.id) return true;
    
    // Check if any year group matches any child year
    const hasMatchingYearGroup = t.yearGroups.some(yg => 
      userChildYears.some(childYear => childYear >= yg.birthYearStart && childYear <= yg.birthYearEnd)
    );
    if (hasMatchingYearGroup) return true;

    return false;
  });

  if (relevantTournaments.length === 0) {
    // Fallback: If no tournament is "relevant", all active tournaments are available.
    relevantTournaments = activeTournaments;
  }

  // If a specific tournament is requested via query param and it's in the relevant list
  let targetTournamentId: number | null = null;
  if (requestedTournamentId && relevantTournaments.some(t => t.id === requestedTournamentId)) {
    targetTournamentId = requestedTournamentId;
  } else if (userPreferredTournamentId && relevantTournaments.some(t => t.id === userPreferredTournamentId)) {
    targetTournamentId = userPreferredTournamentId;
  } else {
    // Pick the most recent one
    targetTournamentId = relevantTournaments[0].id;
  }

  return {
    targetTournamentId,
    availableTournaments: relevantTournaments.map(t => ({ id: t.id, name: t.name, startDate: t.startDate, endDate: t.endDate }))
  };
}

export const getAvailable = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

  const user = await prisma.user.findUnique({ 
    where: { id: userId },
    include: { children: true }
  });
  
  if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

  const requestedTournamentId = req.query.tournamentId ? parseInt(req.query.tournamentId as string) : undefined;
  
  const { targetTournamentId, availableTournaments } = await resolveTournamentForUser(
    userId,
    requestedTournamentId,
    user.tournamentId
  );

  // Optional: Update preference implicitly if they switched explicitly
  if (requestedTournamentId && targetTournamentId === requestedTournamentId && user.tournamentId !== targetTournamentId) {
    await prisma.user.update({ where: { id: userId }, data: { tournamentId: targetTournamentId } });
  }

  if (!targetTournamentId) {
    return res.json({ shifts: [], volunteerShifts: [], volunteer: null });
  }

  const shifts = await prisma.shift.findMany({
    where: { tournamentId: targetTournamentId },
    include: { day: true, daySlot: true, workArea: true }
  });

  const volunteerShifts = await prisma.volunteerShift.findMany({
    where: { tournamentId: targetTournamentId },
    include: {
      user: { select: { id: true, name: true } },
      shift: { include: { day: true, daySlot: true, workArea: true } }
    }
  });

  const tournament = await prisma.tournament.findUnique({
    where: { id: targetTournamentId },
    include: { club: true }
  });

  res.json({ shifts, volunteerShifts, volunteer: user, tournament, availableTournaments });
};

export const assignShift = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

  const { shiftId } = req.body;
  if (!shiftId) return res.status(400).json({ error: 'shiftId erforderlich' });

  const shift = await prisma.shift.findUnique({ where: { id: shiftId }, include: { day: true, daySlot: true, workArea: true } });
  if (!shift) return res.status(404).json({ error: 'Shift nicht gefunden' });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return res.status(404).json({ error: 'User nicht gefunden' });

  // Bereits für diesen Job-Slot eingetragen?
  const existing = await prisma.volunteerShift.findFirst({ where: { userId, shiftId } });
  if (existing) {
    return res.status(400).json({ error: 'Du bist für diesen Job-Slot bereits eingetragen.' });
  }

  const shiftDate = shift.day?.date ?? new Date();
  const slotLabel = shift.daySlot ? `${minToTime(shift.daySlot.startMin)}-${minToTime(shift.daySlot.endMin)}` : 'Unbekannt';

  const vs = await prisma.volunteerShift.create({
    data: {
      userId,
      tournamentId: shift.tournamentId,
      shiftId,
      date: shiftDate,
      slot: slotLabel,
      role: shift.workArea?.name || 'Helfer',
      areaId: String(shift.tournamentWorkAreaId)
    }
  });

  logJobAssigned(userId, user.name || '', shiftId, shiftDate.toISOString());
  res.json(vs);
};

export const unassignShift = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

  const volunteerShiftId = parseInt(req.params.id as string);
  
  const existing = await prisma.volunteerShift.findUnique({ 
    where: { id: volunteerShiftId },
    include: { user: true }
  });
  if (!existing || existing.userId !== userId) {
    return res.status(403).json({ error: 'Zugriff verweigert oder nicht gefunden' });
  }

  const userName = existing.user?.name || 'Unbekannt';
  const shiftDate = existing?.date ? new Date(existing.date).toISOString().split('T')[0] : '';
  await prisma.volunteerShift.delete({ where: { id: volunteerShiftId } });
  logJobUnassigned(userId, userName, existing.shiftId || 0, shiftDate);
  res.json({ success: true });
};

export const getVapidPublicKey = (req: Request, res: Response) => {
  res.json({ publicKey: getPubKey() });
};

export const subscribePush = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

  const { endpoint, keys } = req.body;
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    return res.status(400).json({ error: 'Ungültige Subscription-Daten' });
  }

  const existing = await prisma.pushSubscription.findFirst({
    where: { endpoint }
  });

  if (existing) {
    if (existing.userId !== userId || existing.p256dh !== keys.p256dh || existing.auth !== keys.auth) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: {
          userId,
          p256dh: keys.p256dh,
          auth: keys.auth
        }
      });
    }
  } else {
    await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth
      }
    });
  }

  res.status(201).json({ success: true });
};

export const rateShift = async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: 'Nicht authentifiziert' });

  const id = parseInt(String(req.params.id), 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Ungültige ID' });

  const existing = await prisma.volunteerShift.findUnique({
    where: { id }
  });

  if (!existing || existing.userId !== userId) {
    return res.status(403).json({ error: 'Diese Schicht gehört dir nicht' });
  }

  const { ratingWorkload, ratingOrganization, ratingFun, ratingComment } = req.body;

  const updated = await prisma.volunteerShift.update({
    where: { id },
    data: {
      ratingWorkload: ratingWorkload != null ? parseInt(ratingWorkload, 10) : null,
      ratingOrganization: ratingOrganization != null ? parseInt(ratingOrganization, 10) : null,
      ratingFun: ratingFun != null ? parseInt(ratingFun, 10) : null,
      ratingComment: ratingComment ? String(ratingComment).trim() : null
    }
  });

  res.json(updated);
};


