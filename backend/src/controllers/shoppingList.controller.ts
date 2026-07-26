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
 * Barcode nachschlagen: erst im eigenen Katalog (schon einmal manuell
 * gepflegt oder aus einem früheren Scan übernommen), sonst bei Open Food
 * Facts (kostenlos, kein API-Key). Wird dort ein Produkt gefunden, legen wir
 * es direkt im eigenen Katalog an - damit lernt der Katalog mit jedem Scan
 * dazu und der nächste Scan desselben Produkts braucht keinen Netzwerk-Call
 * mehr. Wird nichts gefunden (Food-Datenbank kennt z.B. viele Non-Food-
 * Artikel wie Kohle/Servietten nicht), liefert die Route explizit 404 mit
 * einer klaren Meldung - das Frontend bietet dann manuelle Eingabe an.
 */
export const lookupBarcode = async (req: Request, res: Response) => {
  const barcode = String(req.params.barcode || '').trim();
  if (!barcode) return res.status(400).json({ error: 'Barcode erforderlich' });

  const existing = await prisma.shoppingCatalogItem.findUnique({ where: { barcode } });
  if (existing) return res.json(existing);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let offResponse: globalThis.Response;
    try {
      offResponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!offResponse.ok) {
      return res.status(404).json({ error: 'Kein Produkt gefunden' });
    }

    const data: any = await offResponse.json();
    const productName = data?.product?.product_name || data?.product?.product_name_de;
    if (data?.status !== 1 || !productName) {
      return res.status(404).json({ error: 'Kein Produkt gefunden' });
    }

    // Erste, gröbste Kategorie aus Open Food Facts als Vorschlag übernehmen
    // (freier Text bei uns, keine Übernahme der kompletten, oft sehr
    // verschachtelten OFF-Kategorienliste nötig).
    const category = typeof data.product.categories === 'string'
      ? data.product.categories.split(',')[0]?.trim()
      : null;

    const created = await prisma.shoppingCatalogItem.create({
      data: {
        name: String(productName).trim().slice(0, 150),
        category: category ? category.slice(0, 100) : null,
        barcode,
        unit: 'Stk'
      }
    });
    return res.status(201).json(created);
  } catch (e) {
    // Netzwerkfehler/Timeout bei Open Food Facts ist kein Serverfehler unsererseits -
    // aus Nutzersicht identisch zu "nicht gefunden", manuelle Eingabe bleibt möglich.
    return res.status(404).json({ error: 'Kein Produkt gefunden' });
  }
};

export const createCatalogItem = async (req: Request, res: Response) => {
  const { name, category, unit, barcode } = req.body;
  try {
    const created = await prisma.shoppingCatalogItem.create({
      data: { name, category: category || null, unit: unit || 'Stk', barcode: barcode || null }
    });
    res.status(201).json(created);
  } catch (e: any) {
    if (e.code === 'P2002') {
      return res.status(409).json({ error: 'Ein Artikel mit diesem Barcode existiert bereits' });
    }
    res.status(500).json({ error: e.message });
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
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

export const updateShoppingListItem = async (req: Request, res: Response) => {
  const id = parseInt(req.params.id as string, 10);
  const { plannedQuantity, purchasedQuantity, note } = req.body;
  const data: any = {};
  if (plannedQuantity !== undefined) data.plannedQuantity = plannedQuantity;
  if (purchasedQuantity !== undefined) data.purchasedQuantity = purchasedQuantity;
  if (note !== undefined) data.note = note;

  try {
    const updated = await prisma.shoppingListItem.update({ where: { id }, data, include: { catalogItem: true } });
    res.json(updated);
  } catch (e: any) {
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
