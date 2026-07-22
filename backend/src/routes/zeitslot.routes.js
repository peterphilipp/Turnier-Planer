import { Router } from 'express';
import validate from '../middleware/validate.js';
import {
  getZeitslots,
  createZeitslot,
  updateZeitslot,
  deleteZeitslot,
  zeitslotSchema
} from '../controllers/zeitslot.controller.js';

const router = Router();

router.get('/', getZeitslots);
router.post('/', validate(zeitslotSchema), createZeitslot);
router.patch('/:id', validate(zeitslotSchema.partial()), updateZeitslot);
router.delete('/:id', deleteZeitslot);

export default router;
