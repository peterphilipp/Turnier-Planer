import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import fs from 'fs';
import path from 'path';

let backendVersion = process.env.APP_VERSION || 'dev';
let backendSha = process.env.GIT_SHA || 'local';

if (backendVersion === 'dev') {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf-8'));
    if (pkg.version) backendVersion = 'v' + pkg.version;
  } catch (e) {
    // fallback
  }
}

export const getHealth = async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({ 
      status: 'OK', 
      db: 'connected',
      version: backendVersion,
      sha: backendSha
    });
  } catch (err) {
    return res.status(503).json({ status: 'ERR', db: 'disconnected', detail: (err as Error).message });
  }
};
