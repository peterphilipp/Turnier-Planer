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

export const tournamentWorkAreaSyncSchema = z.object({
  tournamentId: z.number().int().positive()
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

export const updateTournamentDaySchema = z.object({
  date: z.string().or(z.date()),
  label: z.string().max(200, 'Label darf maximal 200 Zeichen lang sein').nullable(),
  order: z.number().int()
});

/** Body von generate-shifts / clear-shifts: beide nehmen nur die Turnier-ID entgegen. */
export const tournamentIdBodySchema = z.object({
  tournamentId: z.number().int().positive('tournamentId erforderlich')
});

export const exportDayToTemplateSchema = z.object({
  name: z.string().min(1, 'Name der Vorlage erforderlich').max(200, 'Name darf maximal 200 Zeichen lang sein'),
  description: z.string().max(1000, 'Beschreibung darf maximal 1000 Zeichen lang sein').optional()
});

export const dayWorkAreaTargetSchema = z.object({
  targetHelpers: z.number().int().min(0).nullable().optional()
});

export const addDayWorkAreaSchema = z.object({
  tournamentDayId: z.number().int().positive(),
  tournamentWorkAreaId: z.number().int().positive(),
  order: z.number().int().optional()
});

// ==================== TournamentWorkArea ====================
export const listTournamentWorkAreas = async (req: Request, res: Response) => {
  const tournamentId = req.query.tournamentId ? parseInt(String(req.query.tournamentId)) : null;
  if (!tournamentId) return res.status(400).json({ error: 'tournamentId erforderlich' });
  const areas = await prisma.tournamentWorkArea.findMany({ where: { tournamentId }, orderBy: [{ order: 'asc' }, { name: 'asc' }, { id: 'asc' }] });
  return res.json(areas);
};

/** Snapshotet alle nicht-obsoleten Katalog-WorkAreas in dieses Turnier (idempotent). */
export const syncTournamentWorkAreas = async (req: Request, res: Response) => {
  const { tournamentId } = req.body as { tournamentId: number }; // bereits von validate() geparst

  await prisma.$transaction(async (tx) => {
    // Alle nicht-obsoleten Katalog-Bereiche laden
    const catalog = await tx.workArea.findMany({ where: { isObsolete: false } });
    
    // Alle bestehenden Bereiche dieses Turniers laden
    const existing = await tx.tournamentWorkArea.findMany({
      where: { tournamentId },
      select: { id: true, sourceWorkAreaId: true, active: true, name: true }
    });
    
    // Map: sourceWorkAreaId → Eintrag (kann null sein)
    const known = new Map<number | null, typeof existing[number]>();
    for (const e of existing) {
      known.set(e.sourceWorkAreaId, e);
    }
    
    // Standard-Bereiche immer aktivieren
    const standardAreas = catalog.filter(w => w.isStandard);
    for (const stdArea of standardAreas) {
      let existingEntry = known.get(stdArea.id);
      
      // Wenn nicht gefunden: nach Namen suchen (für manuell angelegte Bereiche)
      if (!existingEntry) {
        const manualMatch = existing.find(e => e.sourceWorkAreaId === null && e.name === stdArea.name);
        if (manualMatch) existingEntry = { ...manualMatch, sourceWorkAreaId: null };
      }
      
      if (existingEntry?.id) {
        // Bereits vorhanden → aktivieren
        await tx.tournamentWorkArea.update({
          where: { id: existingEntry.id },
          data: { active: true }
        });
      } else {
        // Neu erstellen und aktivieren
        await tx.tournamentWorkArea.create({
          data: {
            tournamentId,
            sourceWorkAreaId: stdArea.id,
            name: stdArea.name,
            icon: stdArea.icon,
            order: stdArea.order,
            color: stdArea.color,
            minVolunteers: stdArea.minVolunteers,
            maxVolunteers: stdArea.maxVolunteers,
            operatingStartMin: stdArea.operatingStartMin,
            operatingEndMin: stdArea.operatingEndMin,
            active: true
          }
        });
      }
    }
    
    // Alle anderen Katalog-Bereiche nur erstellen, wenn nicht vorhanden (standardmäßig inaktiv)
    const toCreate = catalog
      .filter(w => !w.isStandard && !known.has(w.id))
      .map(w => ({
        tournamentId,
        sourceWorkAreaId: w.id,
        name: w.name,
        icon: w.icon,
        order: w.order,
        color: w.color,
        minVolunteers: w.minVolunteers,
        maxVolunteers: w.maxVolunteers,
        operatingStartMin: w.operatingStartMin,
        operatingEndMin: w.operatingEndMin,
        active: false  // Nicht-Standard-Bereiche standardmäßig inaktiv
      }));
    if (toCreate.length) await tx.tournamentWorkArea.createMany({ data: toCreate });
    
    // WICHTIG: Alle nicht-Standard-Bereiche deaktivieren, die noch aktiv sind
    const nonStandardAreas = catalog.filter(w => !w.isStandard);
    for (const area of nonStandardAreas) {
      const existingEntry = known.get(area.id);
      if (existingEntry && existingEntry.active) {
        await tx.tournamentWorkArea.update({
          where: { id: existingEntry.id },
          data: { active: false }
        });
      }
    }
    
    // Bereinige bestehende Einträge, die auf gelöschte Katalog-Bereiche verweisen
    const orphaned = await tx.tournamentWorkArea.findMany({
      where: {
        tournamentId,
        sourceWorkAreaId: { not: null },
        NOT: { sourceWorkAreaId: { in: catalog.map(w => w.id) } }
      }
    });
    if (orphaned.length > 0) {
      await tx.tournamentWorkArea.deleteMany({
        where: {
          id: { in: orphaned.map(o => o.id) }
        }
      });
    }

    // Bereinige Einträge mit veraltetem Namen (Katalog-Eintrag wurde umbenannt)
    const renamedOrphaned = await tx.tournamentWorkArea.findMany({
      where: {
        tournamentId,
        sourceWorkAreaId: { not: null }
      }
    });
    for (const entry of renamedOrphaned) {
      const catalogEntry = catalog.find(w => w.id === entry.sourceWorkAreaId);
      if (catalogEntry && entry.name !== catalogEntry.name) {
        await tx.tournamentWorkArea.delete({ where: { id: entry.id } });
      }
    }

    // Bereinige auch manuell angelegte Bereiche ohne Katalog-Referenz, die nicht im aktuellen Katalog vorkommen
    const manualOrphaned = await tx.tournamentWorkArea.findMany({
      where: {
        tournamentId,
        sourceWorkAreaId: null,
        NOT: { name: { in: catalog.map(w => w.name) } }
      }
    });
    if (manualOrphaned.length > 0) {
      await tx.tournamentWorkArea.deleteMany({
        where: {
          id: { in: manualOrphaned.map(o => o.id) }
        }
      });
    }

    // Auch bei bestehenden Bereichen die aktuelle Reihenfolge aus dem Katalog synchronisieren
    for (const cat of catalog) {
      await tx.tournamentWorkArea.updateMany({
        where: { tournamentId, sourceWorkAreaId: cat.id },
        data: { order: cat.order }
      });
    }
  });

  const areas = await prisma.tournamentWorkArea.findMany({ where: { tournamentId }, orderBy: [{ order: 'asc' }, { name: 'asc' }, { id: 'asc' }] });
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

export const exportDayToTemplate = async (req: Request, res: Response) => {
  const tournamentDayId = parseInt(req.params.id as string);
  const { name, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name der Vorlage erforderlich' });

  const day = await prisma.tournamentDay.findUnique({
    where: { id: tournamentDayId },
    include: {
      slots: true,
      shifts: {
        include: {
          workArea: true,
          daySlot: true
        }
      }
    }
  });
  if (!day) return res.status(404).json({ error: 'Turniertag nicht gefunden' });

  const intervalsMap = new Map<string, { startMin: number; endMin: number; shifts: typeof day.shifts }>();
  
  for (const s of day.shifts) {
    const st = s.startMin ?? s.daySlot?.startMin ?? 480;
    const en = s.endMin ?? s.daySlot?.endMin ?? 1080;
    const key = `${st}-${en}`;
    if (!intervalsMap.has(key)) {
      intervalsMap.set(key, { startMin: st, endMin: en, shifts: [] });
    }
    intervalsMap.get(key)!.shifts.push(s);
  }

  const createdTemplate = await prisma.$transaction(async (tx) => {
    const tmpl = await tx.globalDayTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null
      }
    });

    let order = 0;
    const sortedIntervals = Array.from(intervalsMap.values()).sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

    for (const interval of sortedIntervals) {
      const gSlot = await tx.globalDaySlot.create({
        data: {
          templateId: tmpl.id,
          startMin: interval.startMin,
          endMin: interval.endMin,
          order: order++
        }
      });

      const workAreaIds = new Set<number>();
      for (const s of interval.shifts) {
        if (s.workArea?.sourceWorkAreaId) {
          workAreaIds.add(s.workArea.sourceWorkAreaId);
        } else if (s.workArea?.name) {
          const match = await tx.workArea.findFirst({ where: { name: s.workArea.name, isObsolete: false } });
          if (match) workAreaIds.add(match.id);
        }
      }

      for (const waId of workAreaIds) {
        await tx.globalDaySlotWorkArea.create({
          data: {
            globalSlotId: gSlot.id,
            workAreaId: waId
          }
        });
      }
    }

    return tx.globalDayTemplate.findUnique({
      where: { id: tmpl.id },
      include: { slots: { include: { workAreas: true } } }
    });
  });

  return res.status(201).json(createdTemplate);
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

    // Sync DaySlots with their source templates
    for (const day of days) {
      if (day.sourceTemplateId) {
        const templateSlots = await tx.globalDaySlot.findMany({ where: { templateId: day.sourceTemplateId } });
        const existingDaySlots = day.slots;
        const existingSlotIds = new Set(existingDaySlots.map(s => s.sourceGlobalSlotId).filter(id => id != null));
        const templateSlotIds = new Set(templateSlots.map(s => s.id));

        for (const ts of templateSlots) {
          if (existingSlotIds.has(ts.id)) {
            const es = existingDaySlots.find(s => s.sourceGlobalSlotId === ts.id)!;
            if (es.startMin !== ts.startMin || es.endMin !== ts.endMin || es.label !== ts.label || es.color !== ts.color || es.order !== ts.order) {
              await tx.daySlot.update({
                where: { id: es.id },
                data: { startMin: ts.startMin, endMin: ts.endMin, label: ts.label, color: ts.color, order: ts.order }
              });
              es.startMin = ts.startMin;
              es.endMin = ts.endMin;
              es.label = ts.label;
              es.color = ts.color;
              es.order = ts.order;
            }
          } else {
            const newSlot = await tx.daySlot.create({
              data: { tournamentDayId: day.id, startMin: ts.startMin, endMin: ts.endMin, label: ts.label, color: ts.color, order: ts.order, sourceGlobalSlotId: ts.id }
            });
            day.slots.push(newSlot);
          }
        }

        for (const es of existingDaySlots) {
          if (es.sourceGlobalSlotId != null && !templateSlotIds.has(es.sourceGlobalSlotId)) {
            await tx.daySlot.delete({ where: { id: es.id } });
            day.slots = day.slots.filter(s => s.id !== es.id);
          }
        }
      }
    }

    const areas = await tx.tournamentWorkArea.findMany({ where: { tournamentId, active: true }, orderBy: [{ order: 'asc' }, { name: 'asc' }, { id: 'asc' }] });
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

    const toCreate: { tournamentId: number; tournamentDayId: number; daySlotId: number; tournamentWorkAreaId: number; startMin: number | null; endMin: number | null; minVolunteers: number; maxVolunteers: number }[] = [];
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

          let shiftStart = slot.startMin;
          let shiftEnd = slot.endMin;

          // Betriebszeiten-Filter: Zeitfenster zuschneiden, statt den ganzen Slot zu überspringen
          if (area.operatingStartMin != null && area.operatingStartMin > shiftStart) shiftStart = area.operatingStartMin;
          if (area.operatingEndMin != null && area.operatingEndMin < shiftEnd) shiftEnd = area.operatingEndMin;

          if (shiftStart >= shiftEnd) continue; // Außerhalb der Betriebszeiten

          const key = `${day.id}-${slot.id}-${area.id}`;
          if (seen.has(key)) continue;
          toCreate.push({
            tournamentId,
            tournamentDayId: day.id,
            daySlotId: slot.id,
            tournamentWorkAreaId: area.id,
            startMin: shiftStart > slot.startMin ? shiftStart : null,
            endMin: shiftEnd < slot.endMin ? shiftEnd : null,
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

// ==================== TournamentDayWorkArea ====================
/** Liefert alle WorkAreas für einen Tag: aktive (links) + Katalog (rechts). */
export const getDayWorkAreas = async (req: Request, res: Response) => {
  const dayId = parseInt(req.params.dayId as string);
  if (isNaN(dayId)) return res.status(400).json({ error: 'dayId erforderlich' });

  const day = await prisma.tournamentDay.findUnique({ where: { id: dayId } });
  if (!day) return res.status(404).json({ error: 'Turniertag nicht gefunden' });

  // Aktive WorkAreas dieses Turniers (mit existing DayWorkArea-Einträgen)
  const active = await prisma.tournamentDayWorkArea.findMany({
    where: { tournamentDayId: dayId, active: true },
    include: { workArea: true },
    orderBy: [{ order: 'asc' }]
  });

  // Alle aktiven TournamentWorkAreas (Katalog für dieses Turnier)
  const all = await prisma.tournamentWorkArea.findMany({
    where: { tournamentId: day.tournamentId, active: true },
    orderBy: [{ order: 'asc' }, { name: 'asc' }]
  });

  return res.json({ day, active, all });
};

/** Lädt alle aktiven TournamentDayWorkArea-Einträge für einen Tag (zeigt welche Arbeitsbereiche relevant sind). */
export const getDaySlotsWithWorkAreas = async (req: Request, res: Response) => {
  const dayId = parseInt(req.params.dayId as string);
  if (isNaN(dayId)) return res.status(400).json({ error: 'dayId erforderlich' });

  // Hole alle aktiven WorkArea-Einträge für diesen Tag
  const activeAreas = await prisma.tournamentDayWorkArea.findMany({
    where: { tournamentDayId: dayId, active: true },
    include: {
      workArea: true
    }
  });

  return res.json(activeAreas);
};

/** Sync: Erstellt TournamentDayWorkArea-Einträge NUR für die im Template (Tagtyp) vorgesehenen Arbeitsbereiche.
 * WICHTIG: Nur WorkAreas werden aktiviert, die in den Slots des zugewiesenen Templates verknüpft sind. */
export const syncDayWorkAreas = async (req: Request, res: Response) => {
  const dayId = parseInt(req.params.dayId as string);
  if (isNaN(dayId)) return res.status(400).json({ error: 'dayId erforderlich' });

  const day = await prisma.tournamentDay.findUnique({ where: { id: dayId } });
  if (!day) return res.status(404).json({ error: 'Turniertag nicht gefunden' });

  // Hole Template, falls vorhanden
  let templateWorkAreaIds: number[] = [];
  if (day.sourceTemplateId) {
    const template = await prisma.globalDayTemplate.findUnique({
      where: { id: day.sourceTemplateId },
      include: { slots: { include: { workAreas: true } } }
    });
    if (template && template.slots) {
      // Sammle alle workAreaIds aus allen Slots des Templates
      const ids = new Set<number>();
      for (const slot of template.slots) {
        for (const wa of slot.workAreas) {
          ids.add(wa.workAreaId);
        }
      }
      templateWorkAreaIds = Array.from(ids);
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // Hole alle aktiven TournamentWorkAreas dieses Turniers
    const allAreas = await tx.tournamentWorkArea.findMany({
      where: { tournamentId: day.tournamentId, active: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }]
    });

    // Filtere auf die, die im Template vorkommen (wenn Template existiert)
    const areas = templateWorkAreaIds.length > 0
      ? allAreas.filter(a => templateWorkAreaIds.includes(a.sourceWorkAreaId!))
      : allAreas;

    // Lösche ALLE bestehenden Einträge für diesen Tag
    await tx.tournamentDayWorkArea.deleteMany({
      where: { tournamentDayId: dayId }
    });

    let created = 0;
    for (const area of areas) {
      await tx.tournamentDayWorkArea.create({
        data: { tournamentId: day.tournamentId, tournamentDayId: dayId, tournamentWorkAreaId: area.id, active: true, order: area.order }
      });
      created++;
    }

    return { created };
  });

  return res.json(result);
};

/** Aktualisiert targetHelpers für einen DayWorkArea-Eintrag. */
export const updateDayWorkAreaTargetHelpers = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) return res.status(400).json({ error: 'id erforderlich' });

  const { targetHelpers } = req.body as { targetHelpers?: number | null };
  const updated = await prisma.tournamentDayWorkArea.update({
    where: { id },
    data: { targetHelpers: targetHelpers ?? null }
  });
  return res.json(updated);
};

/** Entfernt einen WorkArea-Eintrag von einem Tag (inactive setzen). */
export const removeDayWorkArea = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  if (isNaN(id)) return res.status(400).json({ error: 'id erforderlich' });

  await prisma.tournamentDayWorkArea.update({
    where: { id },
    data: { active: false }
  });
  return res.status(204).send();
};

/** Fügt einen einzelnen WorkArea-Eintrag zu einem Tag hinzu. */
export const addDayWorkArea = async (req: Request, res: Response) => {
  const { tournamentDayId, tournamentWorkAreaId, order } = req.body as z.infer<typeof addDayWorkAreaSchema>;
  if (!tournamentDayId || !tournamentWorkAreaId) return res.status(400).json({ error: 'tournamentDayId und tournamentWorkAreaId erforderlich' });

  // tournamentId aus dem Tag holen
  const day = await prisma.tournamentDay.findUnique({ where: { id: tournamentDayId } });
  if (!day) return res.status(404).json({ error: 'Turniertag nicht gefunden' });

  const existing = await prisma.tournamentDayWorkArea.findUnique({ where: { tournamentDayId_tournamentWorkAreaId: { tournamentDayId, tournamentWorkAreaId } } });
  if (existing) return res.status(409).json({ error: 'Eintrag existiert bereits' });

  const created = await prisma.tournamentDayWorkArea.create({
    data: { tournamentId: day.tournamentId, tournamentDayId, tournamentWorkAreaId, active: true, order: order ?? 0 }
  });
  return res.status(201).json(created);
};
