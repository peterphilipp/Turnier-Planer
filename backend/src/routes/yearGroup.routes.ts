import { Router } from 'express';
import * as controller from '../controllers/yearGroup.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', controller.getYearGroups);
router.get('/:id', controller.getYearGroup);
router.post('/', authenticate, requireAdmin, controller.createYearGroup);
router.patch('/:id', authenticate, requireAdmin, controller.updateYearGroup);
router.delete('/:id', authenticate, requireAdmin, controller.deleteYearGroup);

export default router;
