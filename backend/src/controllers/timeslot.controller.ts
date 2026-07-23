import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const getTimeSlots = async (req: Request, res: Response) => {
  const tournamentId = parseInt(String(req.query.tournamentId));
  if (!tournamentId) return res.status(400).json({ error: 'tournamentId erforderlich' });
  
  const slots = await prisma.timeSlot.findMany({
    where: { tournamentId },
    orderBy: [{ date: 'asc' }, { order: 'asc' }]
  });
  return res.json(slots);
};

export const getTimeSlotById = async (req: Request, res: Response) => {
  const slot = await prisma.timeSlot.findUnique({
    where: { id: parseInt(String(req.params.id)) },
    include: { matches: true }
  });
  if (!slot) return res.status(404).json({ error: 'Zeitslot nicht gefunden' });
  return res.json(slot);
};

export const createTimeSlot = async (req: Request, res: Response) => {
  const { tournamentId, date, startTime, endTime, label, order } = req.body;
  
  if (!tournamentId || !date || !startTime || !endTime) {
    return res.status(400).json({ error: 'tournamentId, date, startTime, endTime erforderlich' });
  }

  const slot = await prisma.timeSlot.create({
    data: {
      tournamentId,
      date: new Date(date),
      startTime,
      endTime,
      label,
      order: order || 0
    },
    include: { matches: true }
  });
  res.status(201).json(slot);
};

export const updateTimeSlot = async (req: Request, res: Response) => {
  const body = req.body;
  if (body.date) body.date = new Date(body.date);
  
  const slot = await prisma.timeSlot.update({
    where: { id: parseInt(String(req.params.id)) },
    data: body,
    include: { matches: true }
  });
  return res.json(slot);
};

export const deleteTimeSlot = async (req: Request, res: Response) => {
  await prisma.timeSlot.delete({ where: { id: parseInt(String(req.params.id)) } });
  return res.status(204).send();
};
