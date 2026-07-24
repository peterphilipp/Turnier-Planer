import { Router } from 'express';
import { requireAdmin, authenticate } from '../middleware/auth.js';
import { getClubs, createClub, updateClub, deleteClub } from '../controllers/club.controller.js';

const router = Router();

router.get('/', getClubs);
router.post('/', authenticate, requireAdmin, createClub);
router.put('/:id', authenticate, requireAdmin, updateClub);
router.delete('/:id', authenticate, requireAdmin, deleteClub);

export default router;
