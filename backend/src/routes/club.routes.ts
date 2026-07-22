import { Router } from 'express';
import { getClubs, createClub, updateClub, deleteClub } from '../controllers/club.controller.js';

const router = Router();

router.get('/', getClubs);
router.post('/', createClub);
router.put('/:id', updateClub);
router.delete('/:id', deleteClub);

export default router;
