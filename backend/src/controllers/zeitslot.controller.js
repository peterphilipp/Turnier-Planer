import prisma from '../config/prisma.js';
import { z } from 'zod';

export const zeitslotSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  color: z.string().optional(),
  order: z.number().int().optional()
});

export const getZeitslots = async (req, res) => {
  const slots = await prisma.zeitslot.findMany({ orderBy: { order: 'asc' } });
  return res.json(slots || []);
};

export const createZeitslot = async (req, res) => {
  const s = await prisma.zeitslot.create({ data: req.body });
  return res.status(201).json(s);
};

export const updateZeitslot = async (req, res) => {
  const usedShifts = await prisma.shift.findMany({
    where: { zeitslotId: parseInt(req.params.id) }
  });
  
  if (usedShifts.length > 0) {
    return res.status(409).json({
      error: usedShifts.length + ' bestehende Schicht(en) verwenden diesen Zeitslot und können nicht geändert werden.'
    });
  }
  
  const s = await prisma.zeitslot.update({
    where: { id: parseInt(req.params.id) },
    data: req.body
  });
  return res.json(s);
};

export const deleteZeitslot = async (req, res) => {
  const usedShifts = await prisma.shift.findMany({
    where: { zeitslotId: parseInt(req.params.id) },
    include: { tournament: true }
  });
  const activeShifts = usedShifts.filter(s => s.tournament && s.tournament.status === 'aktiv');
  
  if (activeShifts.length > 0) {
    return res.status(409).json({
      error: 'Zeitslot wird noch in einem aktiven Turnier verwendet und kann nicht gelöscht werden.',
      activeTournaments: activeShifts.map(s => ({ id: s.tournament.id, name: s.tournament.name }))
    });
  }
  
  if (usedShifts.length > 0) {
    return res.status(409).json({
      error: usedShifts.length + ' bestehende Schicht(en) verwenden diesen Zeitslot.'
    });
  }
  
  await prisma.zeitslot.delete({ where: { id: parseInt(req.params.id) } });
  return res.status(204).send();
};
