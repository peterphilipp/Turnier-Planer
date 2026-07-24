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
      user: true
    },
    orderBy: [{ yearGroup: { name: 'asc' } }, { foodItemId: 'asc' }]
  });

  res.json(slots);
};

// Slot erstellen (upsert - erstellt oder aktualisiert falls bereits existiert)
export const createFoodDonationSlot = async (req: Request, res: Response) => {
  const { tournamentId, yearGroupId, foodItemId, targetQuantity, description, userId } = req.body;
  
  if (!tournamentId || !yearGroupId) {
    return res.status(400).json({ error: 'tournamentId und yearGroupId sind erforderlich' });
  }

  const slot = await prisma.foodDonationSlot.upsert({
    where: {
      tournamentId_yearGroupId_foodItemId: {
        tournamentId: Number(tournamentId),
        yearGroupId: Number(yearGroupId),
        foodItemId: Number(foodItemId)
      }
    },
    create: {
      tournamentId: Number(tournamentId),
      yearGroupId: Number(yearGroupId),
      foodItemId: Number(foodItemId),
      targetQuantity: Number(targetQuantity) || 0,
      description: description || null,
      userId: userId ? Number(userId) : null
    },
    update: {
      targetQuantity: Number(targetQuantity) || 0,
      description: description || null,
      userId: userId ? Number(userId) : null
    },
    include: {
      tournament: true,
      yearGroup: true,
      foodItem: true,
      user: true
    }
  });

  res.status(201).json(slot);
};

// Slot aktualisieren
export const updateFoodDonationSlot = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { yearGroupId, foodItemId, targetQuantity, description, userId } = req.body;

  const slot = await prisma.foodDonationSlot.update({
    where: { id: Number(id) },
    data: {
      ...(yearGroupId !== undefined && { yearGroupId: yearGroupId ? Number(yearGroupId) : null }),
      ...(foodItemId !== undefined && { foodItemId: Number(foodItemId) }),
      ...(targetQuantity !== undefined && { targetQuantity: Number(targetQuantity) }),
      ...(description !== undefined && { description }),
      ...(userId !== undefined && { userId: userId ? Number(userId) : null })
    },
    include: {
      tournament: true,
      yearGroup: true,
      foodItem: true,
      user: true
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
