import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const dayTemplateSchema = z.object({
  name: z.string(),
  order: z.number().int().optional(),
  isObsolete: z.boolean().optional()
});

export const templateWorkAreaSchema = z.object({
  templateId: z.number().int().positive(),
  workAreaId: z.number().int().positive(),
  startMin: z.number().int().min(0).max(1439),
  endMin: z.number().int().min(1).max(1440),
  order: z.number().int().optional(),
  // Muss deklariert sein: validate() ersetzt req.body durch das Zod-Ergebnis,
  // undeklarierte Felder werden verworfen. Ohne diese Zeile kaeme das Flag nie
  // im Controller an und das Duplizieren einer Vorlage mit ueberlappenden
  // Balken wuerde immer an der Konfliktpruefung scheitern.
  skipConflictCheck: z.boolean().optional()
});

/**
 * Sucht Zeitueberschneidungen desselben Arbeitsbereichs innerhalb einer
 * Vorlage. `exceptId` blendet den gerade bearbeiteten Eintrag aus, damit er
 * sich beim Verschieben nicht mit sich selbst kollidiert.
 */
async function findOverlap(templateId: number, workAreaId: number, startMin: number, endMin: number, exceptId?: number) {
  return prisma.templateWorkArea.findFirst({
    where: {
      templateId,
      workAreaId,
      startMin: { lt: endMin },
      endMin: { gt: startMin },
      ...(exceptId != null && { id: { not: exceptId } })
    }
  });
}

// ---------- Vorlagen ----------
export const listDayTemplates = async (_req: Request, res: Response) => {
  const templates = await prisma.globalDayTemplate.findMany({
    orderBy: { order: 'asc' },
    include: {
      workAreas: {
        orderBy: [{ order: 'asc' }],
        include: {
          // Kategorien mitladen: getTemplateDisplayName() baut daraus die
          // [Kategorie]-Tags im Vorlagennamen - ohne sie bleiben die Tags leer.
          workArea: { include: { categories: { orderBy: { order: 'asc' } } } }
        }
      }
    }
  });
  return res.json(templates);
};

export const createDayTemplate = async (req: Request, res: Response) => {
  const { name } = req.body;
  // Neueste Vorlage ans Ende setzen
  const maxOrder = await prisma.globalDayTemplate.aggregate({
    _max: { order: true }
  });
  const t = await prisma.globalDayTemplate.create({ 
    data: { name, order: (maxOrder._max.order ?? -1) + 1 }
  });
  return res.status(201).json(t);
};

export const updateDayTemplate = async (req: Request, res: Response) => {
  const { name, isObsolete } = req.body;
  
  const t = await prisma.globalDayTemplate.update({
    where: { id: parseInt(req.params.id as string) },
    data: {
      ...(name !== undefined && { name }),
      ...(isObsolete !== undefined && { isObsolete })
    }
  });
  return res.json(t);
};

export const deleteDayTemplate = async (req: Request, res: Response) => {
  await prisma.globalDayTemplate.delete({ where: { id: parseInt(req.params.id as string) } });
  return res.status(204).send();
};

// ---------- Template-Arbeitsbereiche ----------
export const addTemplateWorkArea = async (req: Request, res: Response) => {
  const { templateId, workAreaId, startMin, endMin, order, skipConflictCheck } = req.body;
  if (endMin <= startMin) return res.status(400).json({ error: 'endMin muss größer als startMin sein' });

  // Prüfen auf Zeitkonflikte mit bestehenden Slots (nur für dieselbe WorkArea)
  if (!skipConflictCheck) {
    const conflict = await findOverlap(templateId, workAreaId, startMin, endMin);
    if (conflict) return res.status(409).json({ error: 'Zeitraum überschneidet sich mit bestehendem Slot' });
  }

  const twa = await prisma.templateWorkArea.create({
    data: { templateId, workAreaId, startMin, endMin, order: order ?? 0 },
    include: { workArea: true }
  });
  return res.status(201).json(twa);
};

export const updateTemplateWorkArea = async (req: Request, res: Response) => {
  const twaId = parseInt(req.params.id as string);
  const { startMin, endMin, order, skipConflictCheck } = req.body;

  const current = await prisma.templateWorkArea.findUnique({ where: { id: twaId } });
  if (!current) return res.status(404).json({ error: 'Eintrag nicht gefunden' });

  const nextStart = startMin ?? current.startMin;
  const nextEnd = endMin ?? current.endMin;
  if (nextEnd <= nextStart) {
    return res.status(400).json({ error: 'endMin muss größer als startMin sein' });
  }

  // Dieselbe Prüfung wie beim Anlegen: sonst liesse sich per Verschieben im
  // Gantt eine Überschneidung erzeugen, die das Formular verbietet - und ein
  // Treffer genau auf dem startMin eines anderen Balkens würde am Unique-Index
  // mit der nichtssagenden Meldung "Eintrag existiert bereits" scheitern.
  if (!skipConflictCheck) {
    const conflict = await findOverlap(current.templateId, current.workAreaId, nextStart, nextEnd, twaId);
    if (conflict) return res.status(409).json({ error: 'Zeitraum überschneidet sich mit bestehendem Slot' });
  }

  const twa = await prisma.templateWorkArea.update({
    where: { id: twaId },
    data: { startMin: nextStart, endMin: nextEnd, ...(order !== undefined && { order }) },
    include: { workArea: true }
  });
  return res.json(twa);
};

export const deleteTemplateWorkArea = async (req: Request, res: Response) => {
  await prisma.templateWorkArea.delete({ where: { id: parseInt(req.params.id as string) } });
  return res.status(204).send();
};
