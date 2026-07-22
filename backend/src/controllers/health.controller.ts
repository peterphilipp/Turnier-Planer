import prisma from '../config/prisma.js';

export const getHealth = async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ status: 'OK', db: 'connected' });
  } catch (err) {
    return res.status(503).json({ status: 'ERR', db: 'disconnected', detail: err.message });
  }
};
