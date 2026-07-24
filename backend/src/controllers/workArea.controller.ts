import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const workAreaSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  icon: z.string().optional(),
  minVolunteers: z.number().int().min(1).optional(),
  maxVolunteers: z.number().int().min(1).optional(),
  color: z.string().optional()
});

export const getWorkAreas = async (req: Request, res: Response) => {
  const areas = await prisma.workArea.findMany({ orderBy: { id: 'asc' } });
  return res.json(areas || []);
};

export const createWorkArea = async (req: Request, res: Response) => {
  const a = await prisma.workArea.create({ data: req.body });
  return res.status(201).json(a);
};

export const updateWorkArea = async (req: Request, res: Response) => {
  const a = await prisma.workArea.update({
    where: { id: parseInt(req.params.id as string) },
    data: req.body
  });
  return res.json(a);
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
