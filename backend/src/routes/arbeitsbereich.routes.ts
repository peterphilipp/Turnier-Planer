import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getArbeitsbereiche,
  createArbeitsbereich,
  updateArbeitsbereich,
  deleteArbeitsbereich,
  arbeitsbereichSchema
} from '../controllers/arbeitsbereich.controller.js';

const router = Router();

router.get('/', getArbeitsbereiche);
router.post('/', validate(arbeitsbereichSchema), createArbeitsbereich);
router.patch('/:id', validate(arbeitsbereichSchema.partial()), updateArbeitsbereich);
router.delete('/:id', deleteArbeitsbereich);

export default router;
