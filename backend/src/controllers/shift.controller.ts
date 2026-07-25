import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { sendPushToUser } from '../utils/push.js';

// Hinweis: Das Erzeugen von Shifts erfolgt künftig über die Tag-/Template-basierte
// Generierung (Etappe 2), nicht mehr über manuelles Anlegen einzelner Slots.

export const createShiftSchema = z.object({
  tournamentId: z.number().int().positive(),
  tournamentDayId: z.number().int().positive(),
  daySlotId: z.number().int().positive(),
  tournamentWorkAreaId: z.number().int().positive(),
  minVolunteers: z.number().int().min(0).max(200).optional(),
  maxVolunteers: z.number().int().min(0).max(200).optional()
});

export const updateShiftSchema = z.object({
  startMin: z.number().int().min(0).max(1440).nullable().optional(),
  endMin: z.number().int().min(0).max(1440).nullable().optional(),
  minVolunteers: z.number().int().min(0).max(200).optional(),
  maxVolunteers: z.number().int().min(0).max(200).optional(),
  description: z.string().max(1000).nullable().optional()
}).refine(
  data => data.startMin == null || data.endMin == null || data.endMin > data.startMin,
  { message: 'Endzeit muss nach der Startzeit liegen.', path: ['endMin'] }
);

export const updateShiftsBatchSchema = z.object({
  changes: z.array(z.object({
    id: z.number().int().positive(),
    startMin: z.number().int().min(0),
    endMin: z.number().int().min(0)
  })).min(1).refine(
    items => items.every(it => it.endMin > it.startMin),
    { message: 'Endzeit muss nach der Startzeit liegen.' }
  ).refine(
    items => new Set(items.map(it => it.id)).size === items.length,
    { message: 'Doppelte Schicht-ID in der Änderungsliste.' }
  )
});

export const getShifts = async (req: Request, res: Response) => {
  const { tournamentId } = req.query;
  if (!tournamentId) return res.json([]);
  const shifts = await prisma.shift.findMany({
    where: { tournamentId: parseInt(tournamentId as string) },
    include: { day: true, daySlot: true, workArea: true },
    orderBy: [{ tournamentDayId: 'asc' }, { daySlotId: 'asc' }, { workArea: { order: 'asc' } }, { id: 'asc' }]
  });
  return res.json(shifts);
};

/**
 * Legt eine einzelne Schicht direkt an - im Unterschied zu generateShifts()
 * NICHT durch den Tagesvorlagen-Katalog eingeschränkt (der Admin entscheidet
 * hier bewusst pro Schicht, nicht der Katalog-Abgleich). Deckt den Fall ab,
 * dass für einen bereits im Dienstplan vorhandenen Arbeitsbereich eine
 * weitere, zusätzliche Schicht in einem anderen Zeit-Slot desselben Tages
 * gebraucht wird - "+ Arbeitsbereich" (generateShifts) hilft dort nicht,
 * weil der Bereich an diesem Tag schon existiert.
 */
export const createShift = async (req: Request, res: Response) => {
  const { tournamentId, tournamentDayId, daySlotId, tournamentWorkAreaId, minVolunteers, maxVolunteers } = req.body;

  const existing = await prisma.shift.findFirst({ where: { tournamentDayId, daySlotId, tournamentWorkAreaId } });
  if (existing) {
    return res.status(409).json({ error: 'Für diesen Arbeitsbereich existiert in diesem Zeit-Slot bereits eine Schicht.' });
  }

  const area = await prisma.tournamentWorkArea.findUnique({ where: { id: tournamentWorkAreaId } });
  if (!area) return res.status(404).json({ error: 'Arbeitsbereich nicht gefunden' });

  const shift = await prisma.shift.create({
    data: {
      tournamentId,
      tournamentDayId,
      daySlotId,
      tournamentWorkAreaId,
      minVolunteers: minVolunteers ?? area.minVolunteers,
      maxVolunteers: maxVolunteers ?? area.maxVolunteers
    },
    include: { day: true, daySlot: true, workArea: true }
  });
  return res.status(201).json(shift);
};

// Entfernt eine einzelne, bereits generierte Schicht wieder aus dem
// Dienstplan (z.B. wenn ein Arbeitsbereich doch nicht gebraucht wird) - im
// Unterschied zu clearShifts() betrifft das NUR diese eine Schicht, nicht
// den ganzen Turnier-Plan. Bereits eingeplante Helfer werden vor dem
// Löschen (die Zuweisungen kaskadieren mit) per Push benachrichtigt, statt
// einfach kommentarlos aus ihrem Dienstplan zu verschwinden.
export const deleteShift = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const shift = await prisma.shift.findUnique({
    where: { id },
    include: { volunteerShifts: { include: { user: true } }, workArea: true, day: true }
  });
  if (!shift) return res.status(404).json({ error: 'Schicht nicht gefunden' });

  await prisma.shift.delete({ where: { id } });

  const areaName = shift.workArea?.name || 'Job';
  const dateStr = shift.day?.date ? new Date(shift.day.date).toLocaleDateString('de-DE') : '';
  for (const vs of shift.volunteerShifts) {
    if (!vs.userId) continue;
    sendPushToUser(
      vs.userId,
      'Schicht entfallen ℹ️',
      `Die Schicht ${areaName}${dateStr ? ` am ${dateStr}` : ''} wurde vom Organisator entfernt. Du bist dort nicht mehr eingeplant.`,
      '/?view=selfservice'
    ).catch(() => {});
  }

  return res.json({ deletedVolunteerAssignments: shift.volunteerShifts.length });
};

export const updateShift = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string);
  const { startMin, endMin, minVolunteers, maxVolunteers, description } = req.body;
  
  if (startMin !== undefined && endMin !== undefined && startMin != null && endMin != null && Number(endMin) <= Number(startMin)) {
    return res.status(400).json({ error: 'Endzeit muss nach der Startzeit liegen.' });
  }

  const data: any = {};
  if (startMin !== undefined) data.startMin = startMin === null ? null : Number(startMin);
  if (endMin !== undefined) data.endMin = endMin === null ? null : Number(endMin);
  if (minVolunteers !== undefined) data.minVolunteers = Number(minVolunteers);
  if (maxVolunteers !== undefined) data.maxVolunteers = Number(maxVolunteers);
  if (description !== undefined) data.description = description;

  const updated = await prisma.shift.update({
    where: { id },
    data,
    include: { day: true, daySlot: true, workArea: true }
  });
  return res.json(updated);
};

/**
 * Übernimmt mehrere Zeit-Änderungen als eine Business-Transaktion (Editiermodus
 * im Dienstplan): entweder werden alle Schichten aktualisiert, oder keine.
 * Verhindert einen Teil-Zustand, falls z. B. Schicht 3 von 5 an einer
 * verletzten Constraint scheitert.
 */
export const updateShiftsBatch = async (req: Request, res: Response) => {
  const { changes } = req.body as { changes: { id: number; startMin: number; endMin: number }[] };

  const updated = await prisma.$transaction(
    changes.map(c =>
      prisma.shift.update({
        where: { id: c.id },
        data: { startMin: c.startMin, endMin: c.endMin },
        include: { day: true, daySlot: true, workArea: true }
      })
    )
  );

  return res.json(updated);
};
