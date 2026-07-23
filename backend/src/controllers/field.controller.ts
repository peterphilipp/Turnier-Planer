import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const getFields = async (req: Request, res: Response) => {
  const tournamentId = parseInt(String(req.query.tournamentId));
  if (!tournamentId) return res.status(400).json({ error: 'tournamentId erforderlich' });
  
  const fields = await prisma.field.findMany({
    where: { tournamentId },
    orderBy: { name: 'asc' }
  });
  return res.json(fields);
};

export const getFieldById = async (req: Request, res: Response) => {
  const field = await prisma.field.findUnique({
    where: { id: parseInt(String(req.params.id)) },
    include: { matches: true }
  });
  if (!field) return res.status(404).json({ error: 'Feld nicht gefunden' });
  return res.json(field);
};

export const createField = async (req: Request, res: Response) => {
  const { tournamentId, name, status } = req.body;
  
  if (!tournamentId || !name) {
    return res.status(400).json({ error: 'tournamentId und name erforderlich' });
  }

  const field = await prisma.field.create({
    data: { tournamentId, name, status: status || 'verfügbar' },
    include: { matches: true }
  });
  res.status(201).json(field);
};

export const updateField = async (req: Request, res: Response) => {
  const field = await prisma.field.update({
    where: { id: parseInt(String(req.params.id)) },
    data: req.body,
    include: { matches: true }
  });
  return res.json(field);
};

export const deleteField = async (req: Request, res: Response) => {
  await prisma.field.delete({ where: { id: parseInt(String(req.params.id)) } });
  return res.status(204).send();
};
