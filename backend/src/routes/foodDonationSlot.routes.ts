import { Router } from 'express';
import {
  getFoodDonationSlots,
  createFoodDonationSlot,
  updateFoodDonationSlot,
  deleteFoodDonationSlot,
  foodDonationSlotSchema,
  updateFoodDonationSlotSchema
} from '../controllers/foodDonationSlot.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';
import validate from '../middleware/validate.js';

const router = Router();

router.get('/', getFoodDonationSlots);
router.post('/', authenticate, requireAdmin, validate(foodDonationSlotSchema), createFoodDonationSlot);
router.patch('/:id', authenticate, requireAdmin, validate(updateFoodDonationSlotSchema), updateFoodDonationSlot);
router.delete('/:id', authenticate, requireAdmin, deleteFoodDonationSlot);

export default router;
