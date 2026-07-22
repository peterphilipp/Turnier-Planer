import { Router } from 'express';
import {
  getFoodDonationSlots,
  createFoodDonationSlot,
  updateFoodDonationSlot,
  deleteFoodDonationSlot
} from '../controllers/foodDonationSlot.controller.js';

const router = Router();

router.get('/', getFoodDonationSlots);
router.post('/', createFoodDonationSlot);
router.patch('/:id', updateFoodDonationSlot);
router.delete('/:id', deleteFoodDonationSlot);

export default router;
