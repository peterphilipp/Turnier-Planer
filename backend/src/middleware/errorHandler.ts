import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);

  if (err instanceof ZodError) {
    const issues = err.issues || (err as any).errors || [];
    const messages = issues
      .map(e => e.message)
      .filter((m): m is string => typeof m === 'string' && m.trim().length > 0 && m !== 'Invalid input' && m !== 'Required');

    const mainMessage = messages.length > 0 ? messages.join('. ') : 'Validierungsfehler';

    return res.status(400).json({
      error: mainMessage,
      details: issues.map(e => ({ path: e.path.join('.'), message: e.message }))
    });
  }

  // Prisma specific errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Ungültige Eingabedaten übergeben.' });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Eintrag existiert bereits' });
    }
    
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Eintrag nicht gefunden' });
    }
    return res.status(400).json({ error: 'Datenbank-Anfrage fehlgeschlagen' });
  }

  const e = err as Error;
  const message = e?.message || 'Ein unerwarteter Fehler ist aufgetreten';
  res.status(500).json({ error: message });
};

export default errorHandler;
