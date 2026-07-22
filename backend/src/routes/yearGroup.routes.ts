import { Router } from 'express';
import * as controller from '../controllers/yearGroup.controller.js';

const router = Router();

router.get('/', controller.getYearGroups);
router.get('/:id', controller.getYearGroup);
router.post('/', controller.createYearGroup);
router.patch('/:id', controller.updateYearGroup);
router.delete('/:id', controller.deleteYearGroup);

export default router;
