import { Router } from 'express';
import validate from '../middleware/validate.js';
import { z } from 'zod';
import {
  getBracketsByTournament,
  createBracket,
  updateBracket,
  deleteBracket
} from '../controllers/knockoutBracket.controller.js';

const router = Router();

const bracketSchema = z.object({
  tournamentId: z.number().int().positive(),
  name: z.string().min(1),
  runde: z.string().min(1),
  order: z.number().int().default(0)
});

router.get('/', getBracketsByTournament);
router.post('/', validate(bracketSchema), createBracket);
router.patch('/:id', validate(bracketSchema.partial()), updateBracket);
router.delete('/:id', deleteBracket);

export default router;
