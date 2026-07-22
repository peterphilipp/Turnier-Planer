import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

// Alle Slots eines Turniers
export const getFoodDonationSlots = async (req: Request, res: Response) => {
  const { tournamentId } = req.query;
  
  const slots = await prisma.foodDonationSlot.findMany({
    where: tournamentId ? { tournamentId: Number(tournamentId) } : undefined,
    include: {
      tournament: true,
      foodItem: true
    },
    orderBy: { date: 'asc' }
  });

  res.json(slots);
};

// Slot erstellen
export const createFoodDonationSlot = async (req: Request, res: Response) => {
  const { tournamentId, date, yearGroup, foodItemId, targetQuantity, description } = req.body;
  
  if (!tournamentId || !date || !yearGroup) {
    return res.status(400).json({ error: 'tournamentId, date und yearGroup sind erforderlich' });
  }

  const slot = await prisma.foodDonationSlot.create({
    data: {
      tournamentId: Number(tournamentId),
      date: new Date(date),
      yearGroup,
      foodItemId: foodItemId ? Number(foodItemId) : null,
      targetQuantity: Number(targetQuantity) || 0,
      description: description || null
    },
    include: {
      tournament: true,
      foodItem: true
    }
  });

  res.status(201).json(slot);
};

// Slot aktualisieren
export const updateFoodDonationSlot = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { date, yearGroup, foodItemId, targetQuantity, description } = req.body;

  const slot = await prisma.foodDonationSlot.update({
    where: { id: Number(id) },
    data: {
      ...(date && { date: new Date(date) }),
      ...(yearGroup && { yearGroup }),
      ...(foodItemId !== undefined && { foodItemId: foodItemId ? Number(foodItemId) : null }),
      ...(targetQuantity !== undefined && { targetQuantity: Number(targetQuantity) }),
      ...(description !== undefined && { description })
    },
    include: {
      tournament: true,
      foodItem: true
    }
  });

  res.json(slot);
};

// Slot löschen
export const deleteFoodDonationSlot = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.foodDonationSlot.delete({ where: { id: Number(id) } });
  res.status(204).send();
};
