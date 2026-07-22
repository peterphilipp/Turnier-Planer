import prisma from '../config/prisma.js';
import { z } from 'zod';

export const materialSchema = z.object({
  tournamentId: z.number().int().positive(),
  name: z.string().min(1, 'Name ist erforderlich'),
  quantity: z.number().int().min(1).optional(),
  unit: z.string().optional(),
  done: z.boolean().optional()
});

export const getMaterialItemsByTournament = async (req, res) => {
  const items = await prisma.materialItem.findMany({
    where: { tournamentId: parseInt(req.params.tournamentId) },
    orderBy: { createdAt: 'asc' }
  });
  return res.json(items || []);
};

export const createMaterialItem = async (req, res) => {
  const item = await prisma.materialItem.create({ data: req.body });
  return res.status(201).json(item);
};

export const updateMaterialItem = async (req, res) => {
  const item = await prisma.materialItem.update({
    where: { id: parseInt(req.params.id) },
    data: req.body
  });
  return res.json(item);
};

export const deleteMaterialItem = async (req, res) => {
  await prisma.materialItem.delete({ where: { id: parseInt(req.params.id) } });
  return res.status(204).send();
};
