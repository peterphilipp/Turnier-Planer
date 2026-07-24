import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
  try {
    // req.body durch das geparste Ergebnis ersetzen: unbekannte Felder werden
    // verworfen (Schutz gegen Mass-Assignment) und Zod-Transforms/Defaults greifen.
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    next(err);
  }
};

export default validate;
