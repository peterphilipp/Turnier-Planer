import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getMaterialItemsByTournament,
  createMaterialItem,
  updateMaterialItem,
  deleteMaterialItem,
  materialSchema
} from '../controllers/material.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/:tournamentId', getMaterialItemsByTournament);
router.post('/', authenticate, requireAdmin, validate(materialSchema), createMaterialItem);
router.patch('/:id', authenticate, requireAdmin, validate(materialSchema.partial()), updateMaterialItem);
router.delete('/:id', authenticate, requireAdmin, deleteMaterialItem);

export default router;
