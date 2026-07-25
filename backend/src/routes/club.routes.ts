import { Router } from 'express';
import { requireAdmin, authenticate } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { getClubs, createClub, updateClub, deleteClub, clubSchema } from '../controllers/club.controller.js';

const router = Router();

router.get('/', getClubs);
router.post('/', authenticate, requireAdmin, validate(clubSchema), createClub);
router.put('/:id', authenticate, requireAdmin, validate(clubSchema.partial()), updateClub);
router.delete('/:id', authenticate, requireAdmin, deleteClub);

export default router;
