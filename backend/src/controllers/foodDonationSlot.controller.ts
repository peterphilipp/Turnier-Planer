import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

// Alle Slots eines Turniers
export const getFoodDonationSlots = async (req: Request, res: Response) => {
  const { tournamentId } = req.query;
  
  const slots = await prisma.foodDonationSlot.findMany({
    where: tournamentId ? { tournamentId: Number(tournamentId) } : undefined,
    include: {
      tournament: true,
      yearGroup: true,
      foodItem: {
        include: {
          category: true
        }
      },
      volunteer: true
    },
    orderBy: [{ yearGroup: { name: 'asc' } }, { foodItemId: 'asc' }]
  });

  res.json(slots);
};

// Slot erstellen (upsert - erstellt oder aktualisiert falls bereits existiert)
export const createFoodDonationSlot = async (req: Request, res: Response) => {
  const { tournamentId, yearGroupId, foodItemId, targetQuantity, description, volunteerId } = req.body;
  
  if (!tournamentId || !yearGroupId) {
    return res.status(400).json({ error: 'tournamentId und yearGroupId sind erforderlich' });
  }

  const slot = await prisma.foodDonationSlot.upsert({
    where: {
      tournamentId_yearGroupId_foodItemId: {
        tournamentId: Number(tournamentId),
        yearGroupId: Number(yearGroupId),
        foodItemId: foodItemId ? Number(foodItemId) : null
      }
    },
    create: {
      tournamentId: Number(tournamentId),
      yearGroupId: Number(yearGroupId),
      foodItemId: foodItemId ? Number(foodItemId) : null,
      targetQuantity: Number(targetQuantity) || 0,
      description: description || null,
      volunteerId: volunteerId ? Number(volunteerId) : null
    },
    update: {
      targetQuantity: Number(targetQuantity) || 0,
      description: description || null,
      volunteerId: volunteerId ? Number(volunteerId) : null
    },
    include: {
      tournament: true,
      yearGroup: true,
      foodItem: true,
      volunteer: true
    }
  });

  res.status(201).json(slot);
};

// Slot aktualisieren
export const updateFoodDonationSlot = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { yearGroupId, foodItemId, targetQuantity, description, volunteerId } = req.body;

  const slot = await prisma.foodDonationSlot.update({
    where: { id: Number(id) },
    data: {
      ...(yearGroupId !== undefined && { yearGroupId: yearGroupId ? Number(yearGroupId) : null }),
      ...(foodItemId !== undefined && { foodItemId: foodItemId ? Number(foodItemId) : null }),
      ...(targetQuantity !== undefined && { targetQuantity: Number(targetQuantity) }),
      ...(description !== undefined && { description }),
      ...(volunteerId !== undefined && { volunteerId: volunteerId ? Number(volunteerId) : null })
    },
    include: {
      tournament: true,
      yearGroup: true,
      foodItem: true,
      volunteer: true
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
