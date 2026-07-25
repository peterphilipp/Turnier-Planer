import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

// Plausible Spanne für Geburtsjahrgänge im Jugendfußball (Bambini bis Senioren-Turniere).
const yearGroupBaseSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100),
  birthYearStart: z.number().int().min(1990).max(2030),
  birthYearEnd: z.number().int().min(1990).max(2030),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional()
});

export const createYearGroupSchema = yearGroupBaseSchema.refine(
  data => data.birthYearStart <= data.birthYearEnd,
  { message: 'birthYearStart darf nicht nach birthYearEnd liegen', path: ['birthYearEnd'] }
);

export const updateYearGroupSchema = yearGroupBaseSchema.partial().refine(
  data => data.birthYearStart == null || data.birthYearEnd == null || data.birthYearStart <= data.birthYearEnd,
  { message: 'birthYearStart darf nicht nach birthYearEnd liegen', path: ['birthYearEnd'] }
);

export const getYearGroups = async (_req: Request, res: Response) => {
  try {
    const yearGroups = await prisma.yearGroup.findMany({ orderBy: [{ order: 'asc' }] });
    return res.json(yearGroups);
  } catch (error) {
    console.error('Error fetching year groups:', error);
    return res.status(500).json({ message: 'Fehler beim Laden der Jahrgänge', error });
  }
};

export const getYearGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const yearGroup = await prisma.yearGroup.findUnique({ where: { id: Number(id) } });
    if (!yearGroup) return res.status(404).json({ message: 'Jahrgang nicht gefunden' });
    return res.json(yearGroup);
  } catch (error) {
    console.error('Error fetching year group:', error);
    return res.status(500).json({ message: 'Fehler beim Laden des Jahrgangs', error });
  }
};

export const createYearGroup = async (req: Request, res: Response) => {
  try {
    const { name, birthYearStart, birthYearEnd, order, isActive } = req.body;
    const yearGroup = await prisma.yearGroup.create({
      data: { name, birthYearStart, birthYearEnd, order: order || 0, isActive: isActive !== false }
    });
    return res.status(201).json(yearGroup);
  } catch (error) {
    console.error('Error creating year group:', error);
    return res.status(500).json({ message: 'Fehler beim Erstellen des Jahrgangs', error });
  }
};

export const updateYearGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, birthYearStart, birthYearEnd, order, isActive } = req.body;
    const yearGroup = await prisma.yearGroup.update({
      where: { id: Number(id) },
      data: { name, birthYearStart, birthYearEnd, order, isActive }
    });
    return res.json(yearGroup);
  } catch (error) {
    console.error('Error updating year group:', error);
    return res.status(500).json({ message: 'Fehler beim Aktualisieren des Jahrgangs', error });
  }
};

export const deleteYearGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.yearGroup.delete({ where: { id: Number(id) } });
    return res.json({ message: 'Jahrgang gelöscht' });
  } catch (error) {
    console.error('Error deleting year group:', error);
    return res.status(500).json({ message: 'Fehler beim Löschen des Jahrgangs', error });
  }
};
