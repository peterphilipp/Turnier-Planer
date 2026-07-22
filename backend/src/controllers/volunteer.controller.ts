import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';
import bcrypt from 'bcrypt';

export const volunteerSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  roles: z.union([z.array(z.string()), z.string()]).optional()
});

export const getVolunteers = async (req: Request, res: Response) => {
  const vs = await prisma.volunteer.findMany();
  return res.json(vs?.map(v => ({ ...v, roles: typeof v.roles === 'string' ? JSON.parse(v.roles) : [] })) || []);
};

export const createVolunteer = async (req: Request, res: Response) => {
  const body = req.body;
  if (Array.isArray(body.roles)) body.roles = JSON.stringify(body.roles);
  else body.roles = '["Helfer"]';
  
  if (body.password) {
    body.password = await bcrypt.hash(body.password, 10);
  }
  
  const v = await prisma.volunteer.create({ data: body });
  return res.status(201).json(v);
};

export const deleteVolunteer = async (req: Request, res: Response) => {
  await prisma.volunteerShift.deleteMany({ where: { volunteerId: parseInt(req.params.id) } });
  await prisma.volunteer.delete({ where: { id: parseInt(req.params.id) } });
  return res.status(204).send();
};

export const updateVolunteer = async (req: Request, res: Response) => {
  const body = req.body;
  if (Array.isArray(body.roles)) body.roles = JSON.stringify(body.roles);
  
  const v = await prisma.volunteer.update({
    where: { id: parseInt(req.params.id) },
    data: body
  });
  return res.json(v);
};

export const updateVolunteerPassword = async (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Passwort fehlt' });
  
  const hashed = await bcrypt.hash(password, 10);
  const v = await prisma.volunteer.update({
    where: { id: parseInt(req.params.id) },
    data: { password: hashed }
  });
  return res.json({ success: true });
};
