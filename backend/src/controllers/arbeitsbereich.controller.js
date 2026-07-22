import prisma from '../config/prisma.js';
import { z } from 'zod';

export const arbeitsbereichSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  icon: z.string().optional(),
  minVolunteers: z.number().int().min(1).optional(),
  maxVolunteers: z.number().int().min(1).optional(),
  color: z.string().optional()
});

export const getArbeitsbereiche = async (req, res) => {
  const areas = await prisma.arbeitsbereich.findMany({ orderBy: { id: 'asc' } });
  return res.json(areas || []);
};

export const createArbeitsbereich = async (req, res) => {
  const a = await prisma.arbeitsbereich.create({ data: req.body });
  return res.status(201).json(a);
};

export const updateArbeitsbereich = async (req, res) => {
  const a = await prisma.arbeitsbereich.update({
    where: { id: parseInt(req.params.id) },
    data: req.body
  });
  return res.json(a);
};

export const deleteArbeitsbereich = async (req, res) => {
  const usedShifts = await prisma.shift.findMany({
    where: { arbeitsbereichId: parseInt(req.params.id) },
    include: { tournament: true }
  });
  const activeShifts = usedShifts.filter(s => s.tournament && s.tournament.status === 'aktiv');
  
  if (activeShifts.length > 0) {
    return res.status(409).json({
      error: 'Arbeitsbereich wird noch in einem aktiven Turnier verwendet.',
      activeTournaments: activeShifts.map(s => ({ id: s.tournament.id, name: s.tournament.name }))
    });
  }
  
  if (usedShifts.length > 0) {
    return res.status(409).json({
      error: usedShifts.length + ' bestehende Schicht(en) verwenden diesen Bereich.'
    });
  }
  
  await prisma.arbeitsbereich.delete({ where: { id: parseInt(req.params.id) } });
  return res.status(204).send();
};
