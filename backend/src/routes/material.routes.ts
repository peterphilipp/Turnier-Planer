import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getMaterialItemsByTournament,
  createMaterialItem,
  updateMaterialItem,
  deleteMaterialItem,
  materialSchema
} from '../controllers/material.controller.js';

const router = Router();

router.get('/:tournamentId', getMaterialItemsByTournament);
router.post('/', validate(materialSchema), createMaterialItem);
router.patch('/:id', validate(materialSchema.partial()), updateMaterialItem);
router.delete('/:id', deleteMaterialItem);

export default router;
