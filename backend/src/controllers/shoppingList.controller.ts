import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/prisma.js';

// ===================== Schemas =====================

export const createCatalogItemSchema = z.object({
  name: z.string().trim().min(1, 'Name ist erforderlich').max(150),
  category: z.string().trim().max(100).nullable().optional(),
  unit: z.string().trim().min(1).max(20).optional(),
  barcode: z.string().trim().max(64).nullable().optional()
});

export const createListItemSchema = z.object({
  tournamentId: z.number().int().positive('Turnier ist erforderlich'),
  catalogItemId: z.number().int().positive('Artikel ist erforderlich'),
  plannedQuantity: z.number().int().min(0).max(999999).optional(),
  note: z.string().max(500).nullable().optional()
});

export const updateListItemSchema = z.object({
  plannedQuantity: z.number().int().min(0).max(999999).optional(),
  purchasedQuantity: z.number().int().min(0).max(999999).optional(),
  note: z.string().max(500).nullable().optional()
});

// ===================== Katalog =====================

/** Katalog durchsuchen (für die Auswahl beim manuellen Hinzufügen). */
export const searchCatalog = async (req: Request, res: Response) => {
  const search = (req.query.search as string | undefined)?.trim();
  const items = await prisma.shoppingCatalogItem.findMany({
    where: search ? { name: { contains: search } } : undefined,
    orderBy: { name: 'asc' },
    take: 50
  });
  res.json(items);
};

/**
 * Barcode nachschlagen:
 *   1. Erst im eigenen Katalog (bereits verknüpft oder manuell gepflegt)
 *   2. Dann Open Food Facts → Produktnamen gegen FoodItems matchen
 *      (z.B. "Duplo Schokoriegel" → FoodItem "Schokoriegel" in Kategorie "Süßes")
 *   3. Wenn kein FoodItem passt: neuen Katalog-Eintrag mit OFF-Daten anlegen,
 *      aber mit Vorschlag für foodCategoryId (basierend auf OFF-Kategorie)
 *
 * Das Frontend kann dann den passenden FoodItem/FoodCategory auswählen und
 * verknüpfen - damit harmonisiert der Einkaufsliste-Katalog mit den
 * Verpflegung-Stammdaten.
 */
export const lookupBarcode = async (req: Request, res: Response) => {
  const barcode = String(req.params.barcode || '').trim();
  if (!barcode) return res.status(400).json({ error: 'Barcode erforderlich' });

  // 1. Bereits im eigenen Katalog?
  const existing = await prisma.shoppingCatalogItem.findFirst({ where: { barcode } });
  if (existing) {
    // Wenn bereits verknüpft → trotzdem OFF-Hierarchie nachreichen
    const foodCat = await prisma.foodCategory.findUnique({ where: { id: existing.foodCategoryId! } });
    let offProduct = null;

    // Immer OFF abfragen für Hierarchie-Anzeige (auch bei bestehenden Einträgen)
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const offResponse = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (offResponse.ok) {
        const offData = await offResponse.json();
        const productName = (offData?.product as Record<string, unknown>)?.["product_name"] || (offData?.product as Record<string, unknown>)?.["product_name_de"];
        if (offData?.status === 1 && productName) {
          // categories_hierarchy aus OFF nutzen
          const hierarchy = Array.isArray((offData.product as any).categories_hierarchy)
            ? (offData.product as any).categories_hierarchy.map((tag: string) => tag.replace(/^en:/, '')).filter(Boolean)
            : [];
          const displayHierarchy = hierarchy.slice(0, 5);

          // Deutsche Labels
          const hierarchyLabelsDe: Record<string, string> = {
            'snacks': 'Snacks', 'sweet-snacks': 'Süßigkeiten',
            'cocoa-and-its-products': 'Schokoladenprodukte', 'chocolates': 'Schokolade',
            'milk-chocolates': 'Milchschokolade', 'dark-chocolates': 'Dunkle Schokolade',
            'chocolates-with-hazelnuts': 'Schokolade mit Haselnüssen',
            'chocolates-with-nuts': 'Schokolade mit Nüssen',
            'milk-chocolate-bar': 'Milchschokoladentafel', 'cacao-et-dérivés': 'Kakao & Derivate',
            'snacks-sucrés': 'Süße Snacks', 'breads': 'Brote',
            'bakery-products': 'Backwaren', 'cakes': 'Kuchen', 'pastries': 'Gebäck',
            'beverages': 'Getränke', 'drinks': 'Trinken',
            'soft-drinks': 'Erfrischungsgetränke', 'juices': 'Säfte',
            'teas': 'Tees', 'coffee': 'Kaffee',
            'dairy-products': 'Milchprodukte', 'milk': 'Milch',
            'fruits-and-vegetables-foods': 'Obst & Gemüse',
          };
          const hierarchyLabels = displayHierarchy.map((tag: string) => hierarchyLabelsDe[tag] || tag);

          offProduct = {
            name: String(productName).trim().slice(0, 150),
            category: typeof (offData.product as any).categories === 'string'
              ? (offData.product as any).categories.split(',')[0]?.trim().slice(0, 100) || null
              : null,
            hierarchy: displayHierarchy,
            hierarchyLabelsDe: hierarchyLabels
          };
        }
      }
    } catch {
      // OFF-Fehler ignorieren — bestehender Eintrag wird trotzdem zurückgegeben
    }

    return res.json({ ...existing, matchedFoodItem: null, matchedFoodCategory: foodCat, offProduct });
  }

  // 2. Open Food Facts abfragen (neuer Barcode)
  let offData: Record<string, unknown> = {};
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const offResponse = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);

    if (!offResponse.ok) {
      return res.status(404).json({ error: 'Kein Produkt gefunden' });
    }

    offData = await offResponse.json();
    const productName = (offData?.product as Record<string, unknown>)?.["product_name"] || (offData?.product as Record<string, unknown>)?.["product_name_de"];
    if (offData?.status !== 1 || !productName) {
      return res.status(404).json({ error: 'Kein Produkt gefunden' });
    }
  } catch {
    // Netzwerkfehler/Timeout → aus Nutzersicht wie "nicht gefunden"
    return res.status(404).json({ error: 'Kein Produkt gefunden' });
  }

  const productName = String((offData?.product as Record<string, unknown>)?.["product_name"] || (offData?.product as Record<string, unknown>)?.["product_name_de"] || '').trim().slice(0, 150);

  // OFF-Kategorie extrahieren (für Anzeige als Fallback)
  let offCategory: string | null = null;
  if (typeof (offData.product as any).categories === 'string') {
    offCategory = (offData.product as any).categories.split(',')[0]?.trim().slice(0, 100) || null;
  }

  // categories_hierarchy aus OFF nutzen für generalisierte Kategorie:
  // Hierarchie-Tiefe 3-4 ist meist die richtige Abstraktionsebene.
  // Beispiel: [snacks, sweet-snacks, cocoa-and-its-products, chocolates, milk-chocolates]
  // → Index 3 "chocolates" = "Schokolade" (nicht "Milchschokolade mit Haselnüssen")
  const hierarchy = Array.isArray((offData.product as any).categories_hierarchy)
    ? (offData.product as any).categories_hierarchy
        .map((tag: string) => tag.replace(/^en:/, ''))
        .filter(Boolean)
    : [];

  // Deutsche Anzeige-Namen für die Hierarchie (OFF-Tags sind englisch/französisch)
  const hierarchyLabelsDe: Record<string, string> = {
    'snacks':                              'Snacks',
    'sweet-snacks':                        'Süßigkeiten',
    'cocoa-and-its-products':              'Schokoladenprodukte',
    'chocolates':                          'Schokolade',
    'milk-chocolates':                     'Milchschokolade',
    'dark-chocolates':                     'Dunkle Schokolade',
    'chocolates-with-hazelnuts':           'Schokolade mit Haselnüssen',
    'chocolates-with-nuts':                'Schokolade mit Nüssen',
    'milk-chocolate-bar':                  'Milchschokoladentafel',
    'cacao-et-dérivés':                    'Kakao & Derivate',
    'snacks-sucrés':                       'Süße Snacks',
    'breads':                              'Brote',
    'bakery-products':                     'Backwaren',
    'cakes':                               'Kuchen',
    'pastries':                            'Gebäck',
    'beverages':                           'Getränke',
    'drinks':                              'Trinken',
    'soft-drinks':                         'Erfrischungsgetränke',
    'juices':                              'Säfte',
    'teas':                                'Tees',
    'coffee':                              'Kaffee',
    'dairy-products':                      'Milchprodukte',
    'milk':                                'Milch',
    'fruits-and-vegetables-foods':         'Obst & Gemüse',
  };

  // Deutsche Labels für die Hierarchie berechnen (max 5 Stufen — tiefere sind zu spezifisch)
  const displayHierarchy = hierarchy.slice(0, 5);
  const hierarchyLabels = displayHierarchy.map((tag: string) => hierarchyLabelsDe[tag] || tag);

  // OFF-Tags → unsere FoodCategory-Namen (manuell gepflegt, da keine 1:1-Übersetzung)
  const offToFoodCat: Record<string, { name: string; icon: string }> = {
    'chocolates':           { name: 'Süßes',         icon: '🍪' },
    'cocoa-and-its-products': { name: 'Süßes',       icon: '🍪' },
    'milk-chocolates':      { name: 'Süßes',         icon: '🍪' },
    'dark-chocolates':      { name: 'Süßes',         icon: '🍪' },
    'chocolates-with-hazelnuts': { name: 'Süßes',   icon: '🍪' },
    'chocolates-with-nuts':     { name: 'Süßes',   icon: '🍪' },
    'sweet-snacks':         { name: 'Süßes',         icon: '🍪' },
    'snacks':               { name: 'Süßes',         icon: '🍪' },
    'breads':               { name: 'Gebäck',        icon: '🥐' },
    'bakery-products':      { name: 'Gebäck',        icon: '🥐' },
    'cakes':                { name: 'Kuchen',        icon: '🍰' },
    'pastries':             { name: 'Gebäck',        icon: '🥐' },
    'beverages':            { name: 'Getränke',      icon: '🥤' },
    'drinks':               { name: 'Getränke',      icon: '🥤' },
    'soft-drinks':          { name: 'Getränke',      icon: '🥤' },
    'juices':               { name: 'Getränke',      icon: '🥤' },
    'teas':                 { name: 'Kaffee & Tee',  icon: '☕' },
    'coffee':               { name: 'Kaffee & Tee',  icon: '☕' },
    'dairy-products':       { name: 'Süßes',         icon: '🍪' },
    'milk':                 { name: 'Getränke',      icon: '🥤' },
    'fruits-and-vegetables-foods': { name: 'Süßes', icon: '🍪' },
  };

  // Beste passende Kategorie aus der Hierarchie finden:
  // Von hinten nach vorne durchlaufen (spezifischste Ebene zuerst).
  // Beispiel: [..., chocolates, milk-chocolates, chocolates-with-hazelnuts]
  // → Zuerst 'chocolates-with-hazelnuts' prüfen, dann 'milk-chocolates', dann 'chocolates'
  let matchedFoodCategoryId: number | null = null;
  for (let i = hierarchy.length - 1; i >= 0; i--) {
    const tag = hierarchy[i];
    const mapping = offToFoodCat[tag];
    if (mapping) {
      // Suche FoodCategory mit diesem Namen
      const foodCat = await prisma.foodCategory.findFirst({ where: { name: mapping.name } });
      if (foodCat) {
        matchedFoodCategoryId = foodCat.id;
        break; // Spezifischste passende Ebene gefunden
      }
    }
  }

  // 3. Produktnamen gegen FoodItems matchen (Fallback, wenn Hierarchie nicht passt):
  const foodItems = await prisma.foodItem.findMany({
    include: { category: true },
    where: {
      OR: [
        { name: { contains: productName } },
        ...(productName.length > 3 ? [{ name: { contains: productName.slice(0, 50) } }] : [])
      ]
    }
  });

  // Bester Match: längster gemeinsamer Teil
  let bestMatch: typeof foodItems[number] | null = foodItems[0] || null;
  let bestOverlap = 0;
  if (foodItems.length > 1 && productName) {
    for (const item of foodItems) {
      const overlap = Math.max(
        productName.includes(item.name) ? item.name.length : 0,
        item.name.includes(productName.slice(0, 20)) ? productName.slice(0, 20).length : 0
      );
      if (overlap > bestOverlap && overlap >= 4) {
        bestMatch = item;
        bestOverlap = overlap;
      }
    }
  }

  // 4. Katalog-Eintrag anlegen (mit Mapping-Vorschlag)
  const foodCategoryId = matchedFoodCategoryId ?? (bestMatch ? bestMatch.categoryId : null);
  
  // Neuen Eintrag anlegen
  const created = await prisma.shoppingCatalogItem.create({
    data: {
      name: productName,
      category: offCategory,
      barcode,
      unit: 'Stk',
      foodCategoryId
    },
    include: { foodCategory: true }
  });

  // Typ-Safe: created.foodCategory kann null sein (SetNull relation)
  const foodCategory = created.foodCategory || null;

  return res.status(201).json({
    ...created,
    matchedFoodItem: bestMatch || null,
    matchedFoodCategory: foodCategory,
    offProduct: {
      name: productName,
      category: offCategory,
      hierarchy: displayHierarchy,  // Begrenzt auf max 5 Stufen
      hierarchyLabelsDe: hierarchyLabels
    }
  });
};

export const createCatalogItem = async (req: Request, res: Response) => {
  const { name, category, unit, barcode } = req.body;
  try {
    const created = await prisma.shoppingCatalogItem.create({
      data: { name, category: category || null, unit: unit || 'Stk', barcode: barcode || null }
    });
    res.status(201).json(created);
  } catch (e: unknown) {
    if ((e as any).code === 'P2002') {
      return res.status(409).json({ error: 'Ein Artikel mit diesem Barcode existiert bereits' });
    }
    res.status(500).json({ error: (e as Error).message });
  }
};

// ===================== Einkaufsliste pro Turnier =====================

export const getShoppingList = async (req: Request, res: Response) => {
  const tournamentId = req.query.tournamentId ? Number(req.query.tournamentId) : undefined;
  if (!tournamentId) return res.status(400).json({ error: 'tournamentId erforderlich' });

  const items = await prisma.shoppingListItem.findMany({
    where: { tournamentId },
    include: { catalogItem: true },
    orderBy: { createdAt: 'asc' }
  });
  res.json(items);
};

export const addShoppingListItem = async (req: Request, res: Response) => {
  const { tournamentId, catalogItemId, plannedQuantity, note } = req.body;
  try {
    const created = await prisma.shoppingListItem.upsert({
      where: { tournamentId_catalogItemId: { tournamentId, catalogItemId } },
      // Bereits auf der Liste? Dann nur die geplante Menge erhöhen statt
      // eines Duplikats - z.B. wenn derselbe Artikel zweimal gescannt wird.
      update: { plannedQuantity: { increment: plannedQuantity ?? 1 } },
      create: { tournamentId, catalogItemId, plannedQuantity: plannedQuantity ?? 1, note: note || null },
      include: { catalogItem: true }
    });
    res.status(201).json(created);
  } catch (e: unknown) {
    const message = e instanceof Error ? (e as Error).message : 'Fehler beim Erstellen des Artikels';
    return res.status(400).json({ error: message });
  }
};

export const updateShoppingListItem = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const { plannedQuantity, purchasedQuantity, note } = req.body;
  const data: Record<string, unknown> = {};
  if (plannedQuantity !== undefined) data.plannedQuantity = plannedQuantity;
  if (purchasedQuantity !== undefined) data.purchasedQuantity = purchasedQuantity;
  if (note !== undefined) data.note = note;

  try {
    const updated = await prisma.shoppingListItem.update({ where: { id }, data, include: { catalogItem: true } });
    res.json(updated);
  } catch (e: unknown) {
    res.status(404).json({ error: 'Eintrag nicht gefunden' });
  }
};

export const deleteShoppingListItem = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  try {
    await prisma.shoppingListItem.delete({ where: { id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: 'Eintrag nicht gefunden' });
  }
};

/**
 * "Aus Turnieren lernen": übernimmt alle Katalog-Artikel der Quell-Liste in
 * die Ziel-Liste (mit derselben geplanten Menge, Ist-Menge startet bei 0) -
 * bereits vorhandene Artikel auf der Ziel-Liste werden nicht dupliziert,
 * sondern übersprungen (die Zielliste könnte schon eigene Einträge haben).
 */
// ===================== FoodCategory Mapping =====================

/** Alle Verpflegung-Kategorien mit Items - für das Mapping im Frontend. */
export const getFoodCategories = async (_req: Request, res: Response) => {
  const categories = await prisma.foodCategory.findMany({
    orderBy: { order: 'asc' },
    include: { items: { orderBy: { name: 'asc' } } }
  });
  res.json(categories);
};

/** ShoppingCatalogItem mit einer FoodCategory verknüpfen. */
export const linkFoodCategory = async (req: Request, res: Response) => {
  const catalogItemId = parseInt(req.params.catalogItemId as string, 10);
  const { foodCategoryId } = req.body;

  if (!foodCategoryId || typeof foodCategoryId !== 'number') {
    return res.status(400).json({ error: 'foodCategoryId erforderlich' });
  }

  try {
    const updated = await prisma.shoppingCatalogItem.update({
      where: { id: catalogItemId },
      data: { foodCategoryId },
      include: { foodCategory: true }
    });
    res.json(updated);
  } catch (e: unknown) {
    if ((e as any).code === 'P2025') {
      return res.status(404).json({ error: 'Artikel nicht gefunden' });
    }
    res.status(500).json({ error: (e as Error).message });
  }
};

export const copyShoppingList = async (req: Request, res: Response) => {
  const sourceTournamentId = parseInt(req.params.sourceTournamentId as string, 10);
  const targetTournamentId = req.query.targetTournamentId ? Number(req.query.targetTournamentId) : undefined;
  if (!targetTournamentId) return res.status(400).json({ error: 'targetTournamentId erforderlich' });

  const sourceItems = await prisma.shoppingListItem.findMany({ where: { tournamentId: sourceTournamentId } });
  const existingTargetCatalogIds = new Set(
    (await prisma.shoppingListItem.findMany({ where: { tournamentId: targetTournamentId }, select: { catalogItemId: true } }))
      .map(i => i.catalogItemId)
  );

  const toCreate = sourceItems.filter(i => !existingTargetCatalogIds.has(i.catalogItemId));

  if (toCreate.length > 0) {
    await prisma.shoppingListItem.createMany({
      data: toCreate.map(i => ({
        tournamentId: targetTournamentId,
        catalogItemId: i.catalogItemId,
        plannedQuantity: i.plannedQuantity,
        purchasedQuantity: 0,
        note: i.note
      }))
    });
  }

  res.json({ copied: toCreate.length, skipped: sourceItems.length - toCreate.length });
};
