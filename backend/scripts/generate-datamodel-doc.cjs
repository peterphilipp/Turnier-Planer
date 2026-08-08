/**
 * Erzeugt docs/datenmodell.md aus backend/prisma/schema.prisma.
 *
 * Die Modell-Uebersicht wurde frueher von Hand gepflegt und ist prompt
 * auseinandergelaufen: README und PROJECT_MEMORY sprachen von 17 Modellen,
 * im Schema standen 36. Eine Doku, der man nicht trauen kann, ist schlimmer
 * als keine - deshalb wird sie jetzt abgeleitet statt gepflegt.
 *
 * Aufruf:
 *   npm run docs:datamodel          erzeugt die Datei
 *   npm run docs:datamodel -- --check  prueft nur, ob sie aktuell ist (CI)
 *
 * Der --check-Modus laeuft in der Pipeline und schlaegt fehl, sobald jemand
 * das Schema aendert, ohne die Doku neu zu erzeugen. Damit kann sie nicht
 * mehr veralten.
 */
const fs = require('fs');
const path = require('path');

const SCHEMA = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const ZIEL = path.join(__dirname, '..', '..', 'docs', 'datenmodell.md');

/** Zerlegt das Schema in Modelle samt vorangestellter Kommentare. */
function leseModelle(text) {
  const zeilen = text.split(/\r?\n/);
  const modelle = [];
  let kommentar = [];

  for (let i = 0; i < zeilen.length; i++) {
    const zeile = zeilen[i].trim();

    if (zeile.startsWith('//')) {
      kommentar.push(zeile.replace(/^\/\/\s?/, ''));
      continue;
    }

    const treffer = zeile.match(/^model\s+(\w+)\s*\{/);
    if (!treffer) {
      if (zeile !== '') kommentar = [];
      continue;
    }

    const modell = {
      name: treffer[1],
      beschreibung: kommentar.join(' ').replace(/\s+/g, ' ').trim(),
      tabelle: null, felder: [], indizes: []
    };
    kommentar = [];

    for (i++; i < zeilen.length; i++) {
      const inhalt = zeilen[i].trim();
      if (inhalt === '}') break;
      if (inhalt === '' || inhalt.startsWith('//')) continue;

      if (inhalt.startsWith('@@')) {
        const map = inhalt.match(/^@@map\("([^"]+)"\)/);
        if (map) modell.tabelle = map[1];
        else modell.indizes.push(inhalt);
        continue;
      }

      const feld = inhalt.match(/^(\w+)\s+(\S+)(.*)$/);
      if (feld) {
        modell.felder.push({ name: feld[1], typ: feld[2], rest: (feld[3] || '').trim() });
      }
    }

    modelle.push(modell);
  }

  return modelle;
}

/**
 * Liest den Inhalt von `@name(...)` heraus und zaehlt dabei Klammern mit -
 * ein simples /\(([^)]*)\)/ wuerde bei `@default(autoincrement())` nach der
 * inneren Klammer abbrechen.
 */
function attributInhalt(text, name) {
  const start = text.indexOf(`@${name}(`);
  if (start === -1) return null;
  let tiefe = 0;
  for (let i = start + name.length + 1; i < text.length; i++) {
    if (text[i] === '(') tiefe++;
    else if (text[i] === ')') {
      tiefe--;
      if (tiefe === 0) return text.slice(start + name.length + 2, i);
    }
  }
  return null;
}

/** Kurzform der Attribute - nur was beim Lesen wirklich hilft. */
function notiz(feld, modellNamen) {
  const teile = [];
  if (/@id\b/.test(feld.rest)) teile.push('Primärschlüssel');
  if (/@unique\b/.test(feld.rest)) teile.push('eindeutig');

  const standard = attributInhalt(feld.rest, 'default');
  if (standard) teile.push(`Standard: \`${standard}\``);

  const relation = feld.rest.match(/@relation\(fields:\s*\[([^\]]+)\]/);
  if (relation) teile.push(`Beziehung über \`${relation[1].trim()}\``);

  const loeschen = feld.rest.match(/onDelete:\s*(\w+)/);
  if (loeschen) teile.push(`beim Löschen: ${loeschen[1]}`);

  const basisTyp = feld.typ.replace(/[\[\]?]/g, '');
  if (!relation && modellNamen.has(basisTyp)) {
    teile.push(feld.typ.endsWith('[]') ? 'Gegenstück einer Beziehung (Liste)' : 'Gegenstück einer Beziehung');
  }

  return teile.join(', ');
}

function baueDokument(modelle) {
  const namen = new Set(modelle.map(m => m.name));
  const zeilen = [];

  zeilen.push('# Datenmodell');
  zeilen.push('');
  zeilen.push('> **Automatisch erzeugt — nicht von Hand bearbeiten.**');
  zeilen.push('> Quelle ist [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma).');
  zeilen.push('> Neu erzeugen mit `npm run docs:datamodel` im Ordner `backend`.');
  zeilen.push('');
  zeilen.push(`Das Schema umfasst **${modelle.length} Modelle**.`);
  zeilen.push('');
  zeilen.push('## Überblick');
  zeilen.push('');
  zeilen.push('| Modell | Tabelle | Felder |');
  zeilen.push('|--------|---------|--------|');
  for (const m of [...modelle].sort((a, b) => a.name.localeCompare(b.name))) {
    zeilen.push(`| [${m.name}](#${m.name.toLowerCase()}) | \`${m.tabelle || '—'}\` | ${m.felder.length} |`);
  }
  zeilen.push('');
  zeilen.push('---');
  zeilen.push('');

  for (const m of [...modelle].sort((a, b) => a.name.localeCompare(b.name))) {
    zeilen.push(`## ${m.name}`);
    zeilen.push('');
    if (m.beschreibung) {
      zeilen.push(m.beschreibung);
      zeilen.push('');
    }
    if (m.tabelle) {
      zeilen.push(`Tabelle: \`${m.tabelle}\``);
      zeilen.push('');
    }
    zeilen.push('| Feld | Typ | Hinweise |');
    zeilen.push('|------|-----|----------|');
    for (const f of m.felder) {
      zeilen.push(`| \`${f.name}\` | \`${f.typ}\` | ${notiz(f, namen)} |`);
    }
    const eindeutig = m.indizes.filter(i => i.startsWith('@@unique'));
    if (eindeutig.length) {
      zeilen.push('');
      for (const i of eindeutig) zeilen.push(`Eindeutigkeit: \`${i}\``);
    }
    zeilen.push('');
  }

  return zeilen.join('\n');
}

function main() {
  const nurPruefen = process.argv.includes('--check');
  const modelle = leseModelle(fs.readFileSync(SCHEMA, 'utf8'));
  const neu = baueDokument(modelle);

  if (nurPruefen) {
    const alt = fs.existsSync(ZIEL) ? fs.readFileSync(ZIEL, 'utf8') : '';
    if (alt.replace(/\r\n/g, '\n') !== neu) {
      console.error(
        '[datenmodell] docs/datenmodell.md passt nicht mehr zum Schema.\n' +
        '              Bitte "npm run docs:datamodel" im Ordner backend ausfuehren und das Ergebnis committen.'
      );
      process.exit(1);
    }
    console.log(`[datenmodell] aktuell (${modelle.length} Modelle).`);
    return;
  }

  fs.mkdirSync(path.dirname(ZIEL), { recursive: true });
  fs.writeFileSync(ZIEL, neu);
  console.log(`[datenmodell] docs/datenmodell.md erzeugt (${modelle.length} Modelle).`);
}

main();
