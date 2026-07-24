import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

// ==================== Zod-Schemas ====================
export const tournamentWorkAreaUpdateSchema = z.object({
  active: z.boolean().optional(),
  name: z.string().min(1).optional(),
  minVolunteers: z.number().int().min(0).optional(),
  maxVolunteers: z.number().int().min(0).optional(),
  operatingStartMin: z.number().int().min(0).max(1439).nullable().optional(),
  operatingEndMin: z.number().int().min(1).max(1440).nullable().optional()
});

export const tournamentDaySchema = z.object({
  tournamentId: z.number().int().positive(),
  date: z.string().or(z.date()),
  label: z.string().nullable().optional(),
  order: z.number().int().optional(),
  templateId: z.number().int().positive().nullable().optional()
});

export const daySlotSchema = z.object({
  tournamentDayId: z.number().int().positive(),
  startMin: z.number().int().min(0).max(1439),
  endMin: z.number().int().min(1).max(1440),
  label: z.string().nullable().optional(),
  color: z.string().optional(),
  order: z.number().int().optional()
});

// ==================== TournamentWorkArea ====================
export const listTournamentWorkAreas = async (req: Request, res: Response) => {
  const tournamentId = req.query.tournamentId ? parseInt(String(req.query.tournamentId)) : null;
  if (!tournamentId) return res.status(400).json({ error: 'tournamentId erforderlich' });
  const areas = await prisma.tournamentWorkArea.findMany({ where: { tournamentId }, orderBy: { name: 'asc' } });
  return res.json(areas);
};

/** Snapshotet alle nicht-obsoleten Katalog-WorkAreas in dieses Turnier (idempotent). */
export const syncTournamentWorkAreas = async (req: Request, res: Response) => {
  const tournamentId = Number(req.body.tournamentId);
  if (!tournamentId) return res.status(400).json({ error: 'tournamentId erforderlich' });

  await prisma.$transaction(async (tx) => {
    const catalog = await tx.workArea.findMany({ where: { isObsolete: false } });
    const existing = await tx.tournamentWorkArea.findMany({ where: { tournamentId }, select: { sourceWorkAreaId: true } });
    const known = new Set(existing.map(e => e.sourceWorkAreaId));
    const toCreate = catalog
      .filter(w => !known.has(w.id))
      .map(w => ({
        tournamentId,
        sourceWorkAreaId: w.id,
        name: w.name,
        icon: w.icon,
        color: w.color,
        minVolunteers: w.minVolunteers,
        maxVolunteers: w.maxVolunteers,
        operatingStartMin: w.operatingStartMin,
        operatingEndMin: w.operatingEndMin,
        active: true
      }));
    if (toCreate.length) await tx.tournamentWorkArea.createMany({ data: toCreate });
  });

  const areas = await prisma.tournamentWorkArea.findMany({ where: { tournamentId }, orderBy: { name: 'asc' } });
  return res.json(areas);
};

export const updateTournamentWorkArea = async (req: Request, res: Response) => {
  const area = await prisma.tournamentWorkArea.update({
    where: { id: parseInt(req.params.id as string) },
    data: req.body
  });
  return res.json(area);
};

// ==================== TournamentDay ====================
export const listTournamentDays = async (req: Request, res: Response) => {
  const tournamentId = req.query.tournamentId ? parseInt(String(req.query.tournamentId)) : null;
  if (!tournamentId) return res.status(400).json({ error: 'tournamentId erforderlich' });
  const days = await prisma.tournamentDay.findMany({
    where: { tournamentId },
    orderBy: [{ order: 'asc' }, { date: 'asc' }],
    include: { slots: { orderBy: { order: 'asc' } } }
  });
  return res.json(days);
};

/** Legt einen Turniertag an; mit templateId werden die Katalog-Slots als Snapshot kopiert. */
export const createTournamentDay = async (req: Request, res: Response) => {
  const { tournamentId, date, label, order, templateId } = req.body;
  const day = await prisma.$transaction(async (tx) => {
    const d = await tx.tournamentDay.create({
      data: { tournamentId, date: new Date(date), label: label ?? null, order: order ?? 0, sourceTemplateId: templateId ?? null }
    });
    if (templateId) {
      const slots = await tx.globalDaySlot.findMany({ where: { templateId }, orderBy: { order: 'asc' } });
      if (slots.length) {
        await tx.daySlot.createMany({
          data: slots.map(s => ({ tournamentDayId: d.id, startMin: s.startMin, endMin: s.endMin, label: s.label, color: s.color, order: s.order }))
        });
      }
    }
    return d;
  });
  const full = await prisma.tournamentDay.findUnique({ where: { id: day.id }, include: { slots: { orderBy: { order: 'asc' } } } });
  return res.status(201).json(full);
};

export const updateTournamentDay = async (req: Request, res: Response) => {
  const { date, label, order } = req.body;
  const data: any = {};
  if (date !== undefined) data.date = new Date(date);
  if (label !== undefined) data.label = label;
  if (order !== undefined) data.order = order;
  const day = await prisma.tournamentDay.update({ where: { id: parseInt(req.params.id as string) }, data });
  return res.json(day);
};

export const deleteTournamentDay = async (req: Request, res: Response) => {
  await prisma.tournamentDay.delete({ where: { id: parseInt(req.params.id as string) } });
  return res.status(204).send();
};

// ==================== DaySlot ====================
export const addDaySlot = async (req: Request, res: Response) => {
  const { tournamentDayId, startMin, endMin, label, color, order } = req.body;
  if (endMin <= startMin) return res.status(400).json({ error: 'endMin muss größer als startMin sein' });
  const slot = await prisma.daySlot.create({
    data: { tournamentDayId, startMin, endMin, label: label ?? null, color: color || '#3b98f8', order: order ?? 0 }
  });
  return res.status(201).json(slot);
};

export const updateDaySlot = async (req: Request, res: Response) => {
  const slot = await prisma.daySlot.update({ where: { id: parseInt(req.params.id as string) }, data: req.body });
  return res.json(slot);
};

export const deleteDaySlot = async (req: Request, res: Response) => {
  await prisma.daySlot.delete({ where: { id: parseInt(req.params.id as string) } });
  return res.status(204).send();
};

// ==================== Shift-Generierung ====================
/**
 * Erzeugt Shifts aus (Tag × Slot × aktive Area), gefiltert nach Betriebszeiten.
 * Idempotent (überspringt bereits existierende Kombinationen) und transaktional;
 * bestehende Shifts inkl. Helfer-Zuweisungen bleiben unangetastet.
 */
export const generateShifts = async (req: Request, res: Response) => {
  const tournamentId = Number(req.body.tournamentId);
  if (!tournamentId) return res.status(400).json({ error: 'tournamentId erforderlich' });

  const result = await prisma.$transaction(async (tx) => {
    const days = await tx.tournamentDay.findMany({ where: { tournamentId }, include: { slots: true } });
    const areas = await tx.tournamentWorkArea.findMany({ where: { tournamentId, active: true } });
    const existing = await tx.shift.findMany({
      where: { tournamentId },
      select: { tournamentDayId: true, daySlotId: true, tournamentWorkAreaId: true }
    });
    const seen = new Set(existing.map(e => `${e.tournamentDayId}-${e.daySlotId}-${e.tournamentWorkAreaId}`));

    const toCreate: { tournamentId: number; tournamentDayId: number; daySlotId: number; tournamentWorkAreaId: number; minVolunteers: number; maxVolunteers: number }[] = [];
    for (const day of days) {
      for (const slot of day.slots) {
        for (const area of areas) {
          // Betriebszeiten-Filter: Area muss den ganzen Slot abdecken
          if (area.operatingStartMin != null && area.operatingStartMin > slot.startMin) continue;
          if (area.operatingEndMin != null && area.operatingEndMin < slot.endMin) continue;
          const key = `${day.id}-${slot.id}-${area.id}`;
          if (seen.has(key)) continue;
          toCreate.push({
            tournamentId,
            tournamentDayId: day.id,
            daySlotId: slot.id,
            tournamentWorkAreaId: area.id,
            minVolunteers: area.minVolunteers,
            maxVolunteers: area.maxVolunteers
          });
        }
      }
    }
    if (toCreate.length) await tx.shift.createMany({ data: toCreate });
    return { created: toCreate.length, existing: existing.length };
  });

  return res.json({ success: true, ...result });
};
