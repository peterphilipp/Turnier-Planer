import { Router } from 'express';
import validate from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  listDayTemplates, createDayTemplate, updateDayTemplate, deleteDayTemplate,
  addTemplateWorkArea, updateTemplateWorkArea, deleteTemplateWorkArea,
  dayTemplateSchema, templateWorkAreaSchema
} from '../controllers/dayTemplate.controller.js';

const router = Router();

router.get('/', listDayTemplates);
router.post('/', authenticate, requireAdmin, validate(dayTemplateSchema), createDayTemplate);
router.patch('/:id', authenticate, requireAdmin, validate(dayTemplateSchema.partial()), updateDayTemplate);
router.delete('/:id', authenticate, requireAdmin, deleteDayTemplate);

// Template-Arbeitsbereiche
router.post('/work-areas', authenticate, requireAdmin, validate(templateWorkAreaSchema), addTemplateWorkArea);
router.patch('/work-areas/:id', authenticate, requireAdmin, validate(templateWorkAreaSchema.partial()), updateTemplateWorkArea);
router.delete('/work-areas/:id', authenticate, requireAdmin, deleteTemplateWorkArea);

export default router;
