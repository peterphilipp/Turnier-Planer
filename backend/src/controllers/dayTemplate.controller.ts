import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const dayTemplateSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  isObsolete: z.boolean().optional()
});

export const catalogSlotSchema = z.object({
  templateId: z.number().int().positive(),
  startMin: z.number().int().min(0).max(1439),
  endMin: z.number().int().min(1).max(1440),
  label: z.string().nullable().optional(),
  color: z.string().optional(),
  order: z.number().int().optional()
});

// ---------- Vorlagen ----------
export const listDayTemplates = async (_req: Request, res: Response) => {
  const templates = await prisma.globalDayTemplate.findMany({
    orderBy: { name: 'asc' },
    include: {
      // Immer chronologisch sortiert – ein neu in der Mitte eingefügter Slot
      // erscheint an der richtigen zeitlichen Position, nicht am Ende.
      slots: {
        orderBy: [{ startMin: 'asc' }, { endMin: 'asc' }, { id: 'asc' }],
        include: { workAreas: { orderBy: { order: 'asc' }, include: { workArea: true } } }
      }
    }
  });
  return res.json(templates);
};

export const createDayTemplate = async (req: Request, res: Response) => {
  const t = await prisma.globalDayTemplate.create({ data: { name: req.body.name } });
  return res.status(201).json(t);
};

export const updateDayTemplate = async (req: Request, res: Response) => {
  const t = await prisma.globalDayTemplate.update({
    where: { id: parseInt(req.params.id as string) },
    data: req.body
  });
  return res.json(t);
};

export const deleteDayTemplate = async (req: Request, res: Response) => {
  await prisma.globalDayTemplate.delete({ where: { id: parseInt(req.params.id as string) } });
  return res.status(204).send();
};

// ---------- Katalog-Slots ----------
export const addTemplateSlot = async (req: Request, res: Response) => {
  const { templateId, startMin, endMin, label, color, order } = req.body;
  if (endMin <= startMin) return res.status(400).json({ error: 'endMin muss größer als startMin sein' });
  const slot = await prisma.globalDaySlot.create({
    data: { templateId, startMin, endMin, label: label ?? null, color: color || '#3b98f8', order: order ?? 0 }
  });
  return res.status(201).json(slot);
};

export const updateTemplateSlot = async (req: Request, res: Response) => {
  const slot = await prisma.globalDaySlot.update({
    where: { id: parseInt(req.params.id as string) },
    data: req.body
  });
  return res.json(slot);
};

export const deleteTemplateSlot = async (req: Request, res: Response) => {
  await prisma.globalDaySlot.delete({ where: { id: parseInt(req.params.id as string) } });
  return res.status(204).send();
};

/** Ersetzt die WorkArea-Zuordnungen eines Katalog-Slots atomar. Body: { workAreaIds: number[] } */
export const setSlotWorkAreas = async (req: Request, res: Response) => {
  const slotId = parseInt(req.params.id as string);
  const ids: number[] = Array.isArray(req.body.workAreaIds) ? req.body.workAreaIds.map(Number) : [];
  await prisma.$transaction(async (tx) => {
    await tx.globalDaySlotWorkArea.deleteMany({ where: { globalSlotId: slotId } });
    if (ids.length) {
      await tx.globalDaySlotWorkArea.createMany({
        data: ids.map((workAreaId, i) => ({ globalSlotId: slotId, workAreaId, order: i }))
      });
    }
  });
  const updated = await prisma.globalDaySlot.findUnique({
    where: { id: slotId },
    include: { workAreas: { orderBy: { order: 'asc' }, include: { workArea: true } } }
  });
  return res.json(updated);
};
