import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const workAreaSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  icon: z.string().optional(),
  minVolunteers: z.number().int().min(1).optional(),
  maxVolunteers: z.number().int().min(1).optional(),
  color: z.string().optional(),
  order: z.number().int().min(0).optional(),
  isStandard: z.boolean().optional(),
  categoryIds: z.array(z.number()).optional(),
  isObsolete: z.boolean().optional()
});

export const reorderSchema = z.object({
  order: z.array(z.number().int().positive())
});

export const getWorkAreas = async (req: Request, res: Response) => {
  const areas = await prisma.workArea.findMany({ 
    orderBy: [{ order: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    include: { categories: true }
  });
  return res.json(areas || []);
};

export const createWorkArea = async (req: Request, res: Response) => {
  try {
    const { categoryIds, ...data } = req.body;
    let validIds: number[] = [];
    if (categoryIds && categoryIds.length > 0) {
      const validCats = await prisma.workAreaCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true } });
      validIds = validCats.map(c => c.id);
    }
    let order = data.order;
    if (order === undefined) {
      const agg = await prisma.workArea.aggregate({ _max: { order: true } });
      order = (agg._max.order ?? -1) + 1;
    }
    const a = await prisma.workArea.create({ 
      data: {
        ...data,
        order,
        ...(validIds.length > 0 && { categories: { connect: validIds.map(id => ({ id })) } })
      },
      include: { categories: true }
    });
    return res.status(201).json(a);
  } catch (error) {
    return res.status(400).json({ error: 'Fehler beim Erstellen', details: error });
  }
};

export const updateWorkArea = async (req: Request, res: Response) => {
  try {
    const { categoryIds, ...data } = req.body;
    let validIds: number[] | undefined = undefined;
    if (categoryIds !== undefined) {
      const validCats = await prisma.workAreaCategory.findMany({ where: { id: { in: categoryIds } }, select: { id: true } });
      validIds = validCats.map(c => c.id);
    }
    const a = await prisma.workArea.update({
      where: { id: parseInt(req.params.id as string) },
      data: {
        ...data,
        ...(validIds !== undefined && { categories: { set: validIds.map(id => ({ id })) } })
      },
      include: { categories: true }
    });
    return res.json(a);
  } catch (error) {
    return res.status(400).json({ error: 'Fehler beim Aktualisieren', details: error });
  }
};

export const deleteWorkArea = async (req: Request, res: Response) => {
  const areaId = parseInt(req.params.id as string);

  // Turnier-Snapshots (TournamentWorkArea) sind eigenständige Kopien und bleiben
  // beim Löschen des Katalog-Eintrags unberührt. Blockiert wird nur, wenn der
  // Bereich noch in Tag-Vorlagen referenziert wird.
  const catalogUses = await prisma.globalDaySlotWorkArea.count({ where: { workAreaId: areaId } });
  if (catalogUses > 0) {
    return res.status(409).json({
      error: catalogUses + ' Tag-Vorlage(n) verwenden diesen Arbeitsbereich. Bitte dort entfernen oder den Bereich als obsolet markieren.'
    });
  }

  await prisma.workArea.delete({ where: { id: areaId } });
  return res.status(204).send();
};

export const updateWorkAreaOrder = async (req: Request, res: Response) => {
  try {
    const { order } = req.body as { order: number[] };
    await prisma.$transaction(
      order.map((id, index) =>
        prisma.workArea.update({ where: { id }, data: { order: index } })
      )
    );
    // Auch in allen Turnier-Snapshots die Reihenfolge aktualisieren
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < order.length; i++) {
        await tx.tournamentWorkArea.updateMany({
          where: { sourceWorkAreaId: order[i] },
          data: { order: i }
        });
      }
    });
    return res.json({ message: 'Reihenfolge gespeichert' });
  } catch (error) {
    return res.status(500).json({ error: 'Fehler beim Speichern der Reihenfolge' });
  }
};
