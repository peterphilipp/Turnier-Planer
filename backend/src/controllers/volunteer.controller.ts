import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { z } from 'zod';

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
  
  const v = await prisma.volunteer.create({ data: body });
  return res.status(201).json(v);
};

export const deleteVolunteer = async (req: Request, res: Response) => {
  await prisma.volunteerShift.deleteMany({ where: { volunteerId: parseInt(req.params.id) } });
  await prisma.volunteer.delete({ where: { id: parseInt(req.params.id) } });
  return res.status(204).send();
};
