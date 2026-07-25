import { Request, Response, NextFunction } from 'express';

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Error]', err);

  if (err.name === 'ZodError') {
    // Zod v4 nennt das Array "issues" (v3 hieß es noch "errors") - ohne diese
    // Unterscheidung crasht JEDE Validierungsfehlermeldung hier mit einem
    // "Cannot read properties of undefined (reading 'map')" und Express faellt
    // auf seine eigene HTML-Fehlerseite mit Stacktrace zurueck, statt eine
    // saubere 400-Antwort zu liefern.
    const issues = err.issues || err.errors || [];
    return res.status(400).json({
      error: 'Validierungsfehler',
      details: issues.map((e: any) => ({ path: e.path.join('.'), message: e.message }))
    });
  }

  // Prisma specific errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'Eintrag existiert bereits' });
  }
  
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Eintrag nicht gefunden' });
  }

  const message = err.message || 'Ein unerwarteter Fehler ist aufgetreten';
  res.status(500).json({ error: message });
};

export default errorHandler;
