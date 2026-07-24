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
    // Chronologisch sortiert (siehe listDayTemplates) – ein mittig eingefügter
    // Slot erscheint an seiner zeitlichen Position.
    include: { slots: { orderBy: [{ startMin: 'asc' }, { endMin: 'asc' }, { id: 'asc' }] } }
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
      const slots = await tx.globalDaySlot.findMany({ where: { templateId }, orderBy: [{ startMin: 'asc' }] });
      if (slots.length) {
        await tx.daySlot.createMany({
          data: slots.map(s => ({
            tournamentDayId: d.id, startMin: s.startMin, endMin: s.endMin, label: s.label, color: s.color, order: s.order,
            // Herkunft merken: generateShifts nutzt dies, um nur Areas zu erzeugen,
            // die im Katalog-Slot der Vorlage tatsächlich vorgesehen sind.
            sourceGlobalSlotId: s.id
          }))
        });
      }
    }
    return d;
  });
  const full = await prisma.tournamentDay.findUnique({ where: { id: day.id }, include: { slots: { orderBy: [{ startMin: 'asc' }, { endMin: 'asc' }, { id: 'asc' }] } } });
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
 * Erzeugt Shifts aus (Tag × Slot × Area), aber NUR fuer Kombinationen, die die
 * zugrundeliegende Tag-Vorlage fuer diesen Slot auch tatsaechlich vorsieht
 * (GlobalDaySlotWorkArea). Ein aktiver Turnier-Arbeitsbereich, der in KEINER
 * Vorlage einem Slot zugeordnet ist, wird NICHT automatisch irgendwo
 * eingefuegt - er erscheint stattdessen in `orphanedActiveAreas`, damit der
 * Admin bewusst entscheidet (Vorlage ergaenzen oder Bereich fuers Turnier
 * deaktivieren).
 *
 * Fuer manuell angelegte Slots ohne Vorlagen-Herkunft (sourceGlobalSlotId
 * null) gibt es keine Katalog-Einschraenkung - dort zaehlt weiterhin nur der
 * Betriebszeiten-Filter.
 *
 * Idempotent (ueberspringt bereits existierende Kombinationen) und
 * transaktional; bestehende Shifts inkl. Helfer-Zuweisungen bleiben
 * unangetastet.
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

    // Katalog-Zuordnungen (welche WorkArea gehört laut Vorlage zu welchem Slot?) vorladen.
    const catalogSlotIds = [...new Set(days.flatMap(d => d.slots.map(s => s.sourceGlobalSlotId).filter((id): id is number => id != null)))];
    const catalogLinks = catalogSlotIds.length
      ? await tx.globalDaySlotWorkArea.findMany({ where: { globalSlotId: { in: catalogSlotIds } } })
      : [];
    const allowedByCatalogSlot = new Map<number, Set<number>>();
    for (const link of catalogLinks) {
      if (!allowedByCatalogSlot.has(link.globalSlotId)) allowedByCatalogSlot.set(link.globalSlotId, new Set());
      allowedByCatalogSlot.get(link.globalSlotId)!.add(link.workAreaId);
    }

    // Nur relevant, wenn JEDER Slot des Turniers eine Vorlagen-Herkunft hat – bei
    // manuell angelegten Slots (kein Katalog) ist "orphan" nicht aussagekräftig.
    const allSlotsHaveTemplate = days.every(d => d.slots.every(s => s.sourceGlobalSlotId != null));
    const usedCatalogWorkAreaIds = new Set<number>();

    const toCreate: { tournamentId: number; tournamentDayId: number; daySlotId: number; tournamentWorkAreaId: number; minVolunteers: number; maxVolunteers: number }[] = [];
    for (const day of days) {
      for (const slot of day.slots) {
        const allowedCatalogAreaIds = slot.sourceGlobalSlotId != null ? allowedByCatalogSlot.get(slot.sourceGlobalSlotId) : null;

        for (const area of areas) {
          // Vorlagen-Filter: Bei Slots mit Katalog-Herkunft nur Areas erzeugen,
          // die dort auch zugeordnet sind. Slots ohne Herkunft sind uneingeschränkt.
          if (allowedCatalogAreaIds) {
            if (!area.sourceWorkAreaId || !allowedCatalogAreaIds.has(area.sourceWorkAreaId)) continue;
            usedCatalogWorkAreaIds.add(area.sourceWorkAreaId);
          }

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

    const orphanedActiveAreas = allSlotsHaveTemplate
      ? areas.filter(a => a.sourceWorkAreaId && !usedCatalogWorkAreaIds.has(a.sourceWorkAreaId)).map(a => a.name)
      : [];

    return { created: toCreate.length, existing: existing.length, orphanedActiveAreas };
  });

  return res.json({ success: true, ...result });
};

/**
 * Loescht alle generierten Shifts (inkl. daraus resultierender Helfer-
 * Zuweisungen) fuer ein Turnier, um die Planung neu zu konfigurieren.
 */
export const clearShifts = async (req: Request, res: Response) => {
  const tournamentId = Number(req.body.tournamentId);
  if (!tournamentId) return res.status(400).json({ error: 'tournamentId erforderlich' });

  const result = await prisma.$transaction(async (tx) => {
    const shiftCount = await tx.shift.count({ where: { tournamentId } });
    const volunteerShiftCount = await tx.volunteerShift.count({ where: { shift: { tournamentId } } });
    await tx.shift.deleteMany({ where: { tournamentId } }); // kaskadiert VolunteerShift
    return { deletedShifts: shiftCount, deletedVolunteerShifts: volunteerShiftCount };
  });

  return res.json({ success: true, ...result });
};
