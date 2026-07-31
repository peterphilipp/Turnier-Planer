export interface ChildInput {
  childName?: string | null;
  childYear?: number | string | null;
}

/**
 * Validiert und Bereinigt Kinder-Eingaben für die Datenbank.
 * Verwirft unvollständige Einträge (ohne Name oder ohne gültiges Geburtsjahr)
 * sowie ungültige Werte (NaN, Strings, leere Felder), um Prisma-Fehler zu verhindern.
 */
export function sanitizeChildrenInput(children?: ChildInput[] | null): Array<{ childName: string; childYear: number }> {
  if (!children || !Array.isArray(children)) return [];

  const result: Array<{ childName: string; childYear: number }> = [];

  for (const c of children) {
    if (!c) continue;

    const name = typeof c.childName === 'string' ? c.childName.trim() : '';
    if (!name) continue;

    let yearNum: number | null = null;
    if (typeof c.childYear === 'number' && !isNaN(c.childYear)) {
      yearNum = Math.floor(c.childYear);
    } else if (c.childYear !== null && c.childYear !== undefined && String(c.childYear).trim() !== '') {
      const parsed = parseInt(String(c.childYear).trim(), 10);
      if (!isNaN(parsed)) {
        yearNum = parsed;
      }
    }

    if (yearNum !== null && yearNum >= 1900 && yearNum <= 2100) {
      result.push({ childName: name, childYear: yearNum });
    }
  }

  return result;
}
