import { Router } from 'express';
import { getDeleteImpact } from '../controllers/impact.controller.js';

const router = Router();

router.get('/:type/:id', getDeleteImpact);

export default router;
