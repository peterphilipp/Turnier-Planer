import { Router } from 'express';
import * as controller from '../controllers/yearGroup.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import { createYearGroupSchema, updateYearGroupSchema } from '../controllers/yearGroup.controller.js';

const router = Router();

router.get('/', controller.getYearGroups);
router.get('/:id', controller.getYearGroup);
router.post('/', authenticate, requireAdmin, validate(createYearGroupSchema), controller.createYearGroup);
router.patch('/:id', authenticate, requireAdmin, validate(updateYearGroupSchema), controller.updateYearGroup);
router.delete('/:id', authenticate, requireAdmin, controller.deleteYearGroup);

export default router;
