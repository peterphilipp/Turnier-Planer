import { Router } from 'express';
import * as ctrl from '../controllers/field.controller.js';

const router = Router();

router.get('/', ctrl.getFields);
router.get('/:id', ctrl.getFieldById);
router.post('/', ctrl.createField);
router.patch('/:id', ctrl.updateField);
router.delete('/:id', ctrl.deleteField);

export default router;
