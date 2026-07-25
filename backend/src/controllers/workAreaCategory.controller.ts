import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

export const workAreaCategorySchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  color: z.string().optional(),
  order: z.number().int().optional(),
  isObsolete: z.boolean().optional()
});

export const getWorkAreaCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.workAreaCategory.findMany({
      orderBy: { order: 'asc' }
    });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Laden der Kategorien.' });
  }
};

export const createWorkAreaCategory = async (req: Request, res: Response) => {
  try {
    const data = workAreaCategorySchema.parse(req.body);
    const count = await prisma.workAreaCategory.count();
    const newCategory = await prisma.workAreaCategory.create({
      data: {
        ...data,
        order: data.order ?? count
      }
    });
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(400).json({ error: 'Ungültige Daten', details: error });
  }
};

export const updateWorkAreaCategory = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const data = workAreaCategorySchema.partial().parse(req.body);
    const updated = await prisma.workAreaCategory.update({
      where: { id },
      data
    });
    res.json(updated);
  } catch (error) {
    res.status(400).json({ error: 'Ungültige Daten oder Kategorie nicht gefunden', details: error });
  }
};

export const deleteWorkAreaCategory = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    await prisma.workAreaCategory.delete({ where: { id } });
    res.json({ message: 'Kategorie gelöscht' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Löschen' });
  }
};

export const updateWorkAreaCategoryOrder = async (req: Request, res: Response) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) return res.status(400).json({ error: 'Array erwartet' });

    await prisma.$transaction(
      order.map((id: number, index: number) =>
        prisma.workAreaCategory.update({
          where: { id },
          data: { order: index }
        })
      )
    );
    res.json({ message: 'Reihenfolge gespeichert' });
  } catch (error) {
    res.status(500).json({ error: 'Fehler beim Speichern der Reihenfolge' });
  }
};
