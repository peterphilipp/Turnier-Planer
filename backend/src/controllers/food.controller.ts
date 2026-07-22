import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'tsv-holm-secret-2025';

const getVolunteerId = (req: Request): number | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { volunteerId: number };
    return decoded.volunteerId;
  } catch {
    return null;
  }
};

// ===================== Admin: Kategorien CRUD =====================

export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.foodCategory.findMany({
      orderBy: { order: 'asc' },
      include: { items: true }
    });
    res.json(categories);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, icon, order } = req.body;
    const cat = await prisma.foodCategory.create({ data: { name, icon: icon || '🍽️', order: order || 0 } });
    res.json(cat);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { name, icon, order } = req.body;
    const cat = await prisma.foodCategory.update({ where: { id }, data: { name, icon, order } });
    res.json(cat);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.foodCategory.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
};

// ===================== Admin: Artikel CRUD =====================

export const getItems = async (req: Request, res: Response) => {
  try {
    const items = await prisma.foodItem.findMany({
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(items);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
};

export const createItem = async (req: Request, res: Response) => {
  try {
    const { categoryId, name, price, unit } = req.body;
    const item = await prisma.foodItem.create({
      data: { categoryId, name, price: price ? String(price) : null, unit: unit || 'Stk' }
    });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
};

export const updateItem = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { categoryId, name, price, unit } = req.body;
    const item = await prisma.foodItem.update({
      where: { id },
      data: { categoryId, name, price: price ? String(price) : null, unit }
    });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
};

export const deleteItem = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.foodItem.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
};

// ===================== Self-Service: Spenden CRUD =====================

export const getDonations = async (req: Request, res: Response) => {
  try {
    const volunteerId = getVolunteerId(req);
    if (!volunteerId) return res.status(401).json({ error: 'Nicht authentifiziert' });

    const volunteer = await prisma.volunteer.findUnique({ where: { id: volunteerId } });
    if (!volunteer || !volunteer.tournamentId) {
      return res.json({ donations: [] });
    }

    const donations = await prisma.foodDonation.findMany({
      where: { tournamentId: volunteer.tournamentId, volunteerId },
      include: {
        foodItem: { include: { category: true } },
        volunteer: { select: { id: true, name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ donations });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
};

export const createDonation = async (req: Request, res: Response) => {
  try {
    const volunteerId = getVolunteerId(req);
    if (!volunteerId) return res.status(401).json({ error: 'Nicht authentifiziert' });

    const volunteer = await prisma.volunteer.findUnique({ where: { id: volunteerId } });
    if (!volunteer || !volunteer.tournamentId) {
      return res.status(400).json({ error: 'Kein Tournament zugewiesen' });
    }

    const { foodItemId, quantity, note, slotId } = req.body;
    if (!foodItemId || !quantity) {
      return res.status(400).json({ error: 'foodItemId und quantity erforderlich' });
    }

    // Spende erstellen
    const donation = await prisma.foodDonation.create({
      data: {
        tournamentId: volunteer.tournamentId,
        volunteerId,
        foodItemId,
        quantity: parseInt(quantity),
        note: note || null,
        foodDonationSlotId: slotId ? Number(slotId) : null
      },
      include: {
        foodItem: { include: { category: true } }
      }
    });

    // Slot collected-Wert aktualisieren falls slotId übergeben wurde
    if (slotId) {
      await prisma.foodDonationSlot.updateMany({
        where: { id: Number(slotId) },
        data: { collected: { increment: parseInt(quantity) } }
      });
    }

    res.json(donation);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
};

export const deleteDonation = async (req: Request, res: Response) => {
  try {
    const volunteerId = getVolunteerId(req);
    if (!volunteerId) return res.status(401).json({ error: 'Nicht authentifiziert' });

    const id = parseInt(req.params.id);
    const existing = await prisma.foodDonation.findUnique({ where: { id } });
    if (!existing || existing.volunteerId !== volunteerId) {
      return res.status(403).json({ error: 'Zugriff verweigert oder nicht gefunden' });
    }

    // Collected-Wert des Slots dekrementieren
    if (existing.foodDonationSlotId) {
      await prisma.foodDonationSlot.updateMany({
        where: { id: existing.foodDonationSlotId },
        data: { collected: { decrement: existing.quantity } }
      });
    }

    await prisma.foodDonation.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
};
