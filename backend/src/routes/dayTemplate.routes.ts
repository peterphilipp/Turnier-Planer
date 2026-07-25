import { Router } from 'express';
import validate from '../middleware/validate.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import {
  listDayTemplates, createDayTemplate, updateDayTemplate, deleteDayTemplate,
  addTemplateSlot, updateTemplateSlot, deleteTemplateSlot, setSlotWorkAreas,
  dayTemplateSchema, catalogSlotSchema, setSlotWorkAreasSchema
} from '../controllers/dayTemplate.controller.js';

const router = Router();

router.get('/', listDayTemplates);
router.post('/', authenticate, requireAdmin, validate(dayTemplateSchema), createDayTemplate);
router.patch('/:id', authenticate, requireAdmin, validate(dayTemplateSchema.partial()), updateDayTemplate);
router.delete('/:id', authenticate, requireAdmin, deleteDayTemplate);

// Katalog-Slots
router.post('/slots', authenticate, requireAdmin, validate(catalogSlotSchema), addTemplateSlot);
router.patch('/slots/:id', authenticate, requireAdmin, validate(catalogSlotSchema.partial()), updateTemplateSlot);
router.delete('/slots/:id', authenticate, requireAdmin, deleteTemplateSlot);
router.put('/slots/:id/work-areas', authenticate, requireAdmin, validate(setSlotWorkAreasSchema), setSlotWorkAreas);

export default router;
