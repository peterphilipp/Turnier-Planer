import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { logVolunteerUpdated, logClubCreated } from '../utils/logger.js';

export const volunteerSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  email: z.string().email('Ungültige E-Mail').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  role: z.enum(['HELPER', 'ORGANIZER', 'ADMIN']).optional(),
  isPrimaryAdmin: z.boolean().optional(),
  tournamentId: z.number().int().nullable().optional()
});

export const getVolunteers = async (req: Request, res: Response) => {
  const { tournamentId } = req.query;
  const users = await prisma.user.findMany({
    where: tournamentId ? { tournamentId: Number(tournamentId) } : undefined,
    orderBy: { name: 'asc' }
  });
  // Rolle als String zurückgeben (Prisma Enum wird intern als String gespeichert)
  return res.json(users?.map(u => ({ ...u, role: u.role as string })) || []);
};

export const createVolunteer = async (req: Request, res: Response) => {
  const body = req.body;
  
  // Rolle setzen (Default: HELPER)
  if (!body.role || !['HELPER', 'ORGANIZER', 'ADMIN'].includes(body.role)) {
    body.role = 'HELPER';
  }
  
  if (body.password) {
    body.password = await bcrypt.hash(body.password, 10);
  }
  
  if (body.isPrimaryAdmin) {
    await prisma.user.updateMany({ where: { isPrimaryAdmin: true }, data: { isPrimaryAdmin: false } });
  }

  const user = await prisma.user.create({ data: body });
  logVolunteerUpdated(user.id, { name: user.name }, 'created');
  return res.status(201).json(user);
};

export const deleteVolunteer = async (req: Request, res: Response) => {
  await prisma.volunteerShift.deleteMany({ where: { userId: parseInt(req.params.id as string) } });
  await prisma.userChild.deleteMany({ where: { userId: parseInt(req.params.id as string) } });
  await prisma.user.delete({ where: { id: parseInt(req.params.id as string) } });
  return res.status(204).send();
};

export const updateVolunteer = async (req: Request, res: Response) => {
  const body = req.body;
  
  // Rolle validieren
  if (body.role && !['HELPER', 'ORGANIZER', 'ADMIN'].includes(body.role)) {
    return res.status(400).json({ error: 'Ungültige Rolle' });
  }
  
  // Einziger Primary Admin
  if (body.isPrimaryAdmin) {
    await prisma.user.updateMany({ where: { isPrimaryAdmin: true }, data: { isPrimaryAdmin: false } });
  }
  
  const user = await prisma.user.update({
    where: { id: parseInt(req.params.id as string) },
    data: body
  });
  logVolunteerUpdated(user.id, Object.keys(body));
  return res.json(user);
};

export const updateVolunteerPassword = async (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Passwort fehlt' });
  
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({
    where: { id: parseInt(req.params.id as string) },
    data: { password: hashed }
  });
  return res.json({ success: true });
};
