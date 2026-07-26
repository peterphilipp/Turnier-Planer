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

/**
 * Prüft Token, hängt userId/role an req an. Gibt die Rolle zurück, oder null
 * wenn bereits eine 401-Antwort gesendet wurde (Aufrufer muss dann sofort
 * zurückkehren, ohne weiter zu antworten).
 */
async function authenticateAndGetRole(req: AuthRequest, res: Response): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Nicht authentifiziert' });
    return null;
  }

  let decoded: { userId: number };
  try {
    const token = authHeader.split(' ')[1];
    decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    res.status(401).json({ error: 'Ungültiger Token' });
    return null;
  }

  req.userId = decoded.userId;
  const role = await getUserRole(decoded.userId);
  req.role = role;
  return role;
}

/** Middleware: Admin/Organizer Only */
export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = await authenticateAndGetRole(req, res);
    if (role === null) return;
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

/**
 * Middleware: NUR Admin (kein Organizer). Für turnierübergreifende Verwaltung,
 * die Organisatoren nichts angeht (z.B. die vollständige, nicht turnier-
 * gebundene Benutzerverwaltung) - im Unterschied zu requireAdmin, das
 * Organisatoren bewusst für ihre eigenen, turniergebundenen Aufgaben
 * (z.B. Push an Helfer ihres Turniers) weiterhin durchlässt.
 */
export async function requireAdminOnly(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const role = await authenticateAndGetRole(req, res);
    if (role === null) return;
    if (role === 'ADMIN') {
      next();
    } else {
      res.status(403).json({ error: 'Unzureichende Berechtigungen – nur Administratoren' });
    }
  } catch (err) {
    next(err);
  }
}
