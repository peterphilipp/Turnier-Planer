import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import JWT_SECRET from '../config/jwt.js';

export interface AuthRequest extends Request {
  userId?: number;
  role?: string;
}

/** Helper: Rolle aus DB laden */
async function getUserRole(userId: number): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return 'HELPER';
  
  // Fallback für alte Daten (roles als JSON-String)
  if (typeof user.role === 'string' && !['HELPER', 'ORGANIZER', 'ADMIN'].includes(user.role)) {
    try {
      const parsed = JSON.parse(user.role);
      return Array.isArray(parsed) ? (parsed[0] || 'HELPER') : 'HELPER';
    } catch {
      return 'HELPER';
    }
  }
  
  // Prisma Enum wird als String zurückgegeben
  return user.role as string || 'HELPER';
}

/** Middleware: Prüft gültiges Token und hängt User-Daten an req */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Nicht authentifiziert' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: 'Ungültiger Token' });
  }
}

/** Middleware: Prüft gültiges Token + Rolle */
export function requireRole(requiredRoles: string[]) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Nicht authentifiziert' });
      return;
    }

    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      
      req.userId = decoded.userId;
      
      // Rolle aus DB prüfen
      const role = await getUserRole(decoded.userId);
      req.role = role;
      
      // Admin/Organizer haben immer Zugriff auf alles
      if (role === 'ADMIN' || role === 'ORGANIZER') {
        next();
        return;
      }
      
      // Sonst muss die exakte Rolle vorhanden sein
      if (!requiredRoles.includes(role)) {
        res.status(403).json({ error: 'Unzureichende Berechtigungen' });
        return;
      }
      
      next();
    } catch {
      res.status(401).json({ error: 'Ungültiger Token' });
    }
  };
}

/** Middleware: Admin/Organizer Only */
export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Nicht authentifiziert' });
    return;
  }

  let decoded: { userId: number };
  try {
    const token = authHeader.split(' ')[1];
    decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    res.status(401).json({ error: 'Ungültiger Token' });
    return;
  }

  try {
    req.userId = decoded.userId;

    // Rolle aus DB prüfen (Admin/Organizer haben Zugriff)
    const role = await getUserRole(decoded.userId);
    req.role = role;
    if (role === 'ADMIN' || role === 'ORGANIZER') {
      next();
    } else {
      res.status(403).json({ error: 'Unzureichende Berechtigungen – Admin oder Organisator erforderlich' });
    }
  } catch (err) {
    // DB-Fehler nicht verschlucken → an zentralen Error-Handler weiterreichen
    next(err);
  }
}
