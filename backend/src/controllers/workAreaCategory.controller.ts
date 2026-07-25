import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const workAreaCategorySchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  // Hex-Farbe, da der Wert im Frontend direkt in style/background landet
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Farbe muss ein Hex-Wert wie #aabbcc sein').optional(),
  order: z.number().int().min(0).optional(),
  isObsolete: z.boolean().optional()
});

export const reorderSchema = z.object({
  order: z.array(z.number().int().positive())
});

/** Robuster ID-Parser: verhindert NaN-Durchgriff auf Prisma (500 statt 400). */
const parseId = (raw: unknown): number | null => {
  const id = parseInt(String(raw), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export const getWorkAreaCategories = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await prisma.workAreaCategory.findMany({
      // Tiebreaker: bei gleichem order sonst nicht-deterministische Reihenfolge
      orderBy: [{ order: 'asc' }, { id: 'asc' }]
    });
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

export const createWorkAreaCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = req.body; // bereits von validate() geparst/bereinigt
    let order = data.order;
    if (order === undefined) {
      // max(order)+1 statt count(): count kollidiert nach Löschungen mit bestehenden Werten
      const agg = await prisma.workAreaCategory.aggregate({ _max: { order: true } });
      order = (agg._max.order ?? -1) + 1;
    }
    const newCategory = await prisma.workAreaCategory.create({ data: { ...data, order } });
    res.status(201).json(newCategory);
  } catch (error) {
    // Zentraler errorHandler mappt ZodError->400, P2002->409 (Name @unique), P2025->404
    next(error);
  }
};

export const updateWorkAreaCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Ungültige ID' });
    const updated = await prisma.workAreaCategory.update({ where: { id }, data: req.body });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteWorkAreaCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: 'Ungültige ID' });
    // Die m:n-Zuordnungen zu WorkAreas räumt Prisma über die implizite
    // Join-Tabelle selbst ab; die Arbeitsbereiche selbst bleiben erhalten.
    await prisma.workAreaCategory.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const updateWorkAreaCategoryOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { order } = req.body as { order: number[] };
    await prisma.$transaction(
      order.map((id, index) =>
        prisma.workAreaCategory.update({ where: { id }, data: { order: index } })
      )
    );
    res.json({ message: 'Reihenfolge gespeichert' });
  } catch (error) {
    next(error);
  }
};
