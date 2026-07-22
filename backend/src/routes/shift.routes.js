import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getShifts,
  createShift,
  updateShift,
  deleteShift,
  shiftSchema
} from '../controllers/shift.controller.js';

const router = Router();

router.get('/', getShifts);
router.post('/', validate(shiftSchema), createShift);
router.patch('/:id', validate(shiftSchema.partial()), updateShift);
router.delete('/:id', deleteShift);

export default router;
