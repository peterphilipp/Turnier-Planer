import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const getHealth = async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'OK', db: 'connected' });
  } catch (err) {
    return res.status(503).json({ status: 'ERR', db: 'disconnected', detail: err.message });
  }
};
