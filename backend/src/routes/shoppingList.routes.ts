import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import * as ctrl from '../controllers/shoppingList.controller.js';
import { createCatalogItemSchema, createListItemSchema, updateListItemSchema } from '../controllers/shoppingList.controller.js';

const router = Router();

// Katalog: turnierübergreifend wiederverwendbar (Admin/Organizer wie bei
// anderen Organisations-Werkzeugen, siehe food.routes.ts).
router.get('/catalog', authenticate, requireAdmin, ctrl.searchCatalog);
router.get('/catalog/barcode/:barcode', authenticate, requireAdmin, ctrl.lookupBarcode);
router.post('/catalog', authenticate, requireAdmin, validate(createCatalogItemSchema), ctrl.createCatalogItem);

// FoodCategory Mapping (Verpflegung-Stammdaten)
router.get('/food-categories', authenticate, requireAdmin, ctrl.getFoodCategories);
router.patch('/catalog/:catalogItemId/link-food-category', authenticate, requireAdmin, ctrl.linkFoodCategory);

// Einkaufsliste pro Turnier
router.get('/', authenticate, requireAdmin, ctrl.getShoppingList);
router.post('/', authenticate, requireAdmin, validate(createListItemSchema), ctrl.addShoppingListItem);
router.patch('/:id', authenticate, requireAdmin, validate(updateListItemSchema), ctrl.updateShoppingListItem);
router.delete('/:id', authenticate, requireAdmin, ctrl.deleteShoppingListItem);
router.post('/copy-from/:sourceTournamentId', authenticate, requireAdmin, ctrl.copyShoppingList);

export default router;
