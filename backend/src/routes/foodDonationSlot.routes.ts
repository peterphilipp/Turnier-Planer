import { Router } from 'express';
import {
  getFoodDonationSlots,
  createFoodDonationSlot,
  updateFoodDonationSlot,
  deleteFoodDonationSlot
} from '../controllers/foodDonationSlot.controller.js';
import { requireAdmin, authenticate } from '../middleware/auth.js';

const router = Router();

router.get('/', getFoodDonationSlots);
router.post('/', authenticate, requireAdmin, createFoodDonationSlot);
router.patch('/:id', authenticate, requireAdmin, updateFoodDonationSlot);
router.delete('/:id', authenticate, requireAdmin, deleteFoodDonationSlot);

export default router;
