# Problem: KO-Bracket Winner/Loser Propagation funktioniert nicht

## Fachliches Problem

### Was das System können soll

Ein Turnier hat typischerweise zwei Phasen:
1. **Gruppenphase** – Alle Teams spielen gegen alle in ihrer Gruppe
2. **K.O.-Phase** – Die Gruppensieger und -zweiten ziehen in ein K.O.-Bracket ein

### Das K.O.-Bracket-Problem

Bei einem K.O.-Turnier mit z.B. 4 Teams gibt es folgende Struktur:

```
Halbfinale 1: Team A vs Team B → Sieger ins Finale, Verlierer um Platz 3
Halbfinale 2: Team C vs Team D → Sieger ins Finale, Verlierer um Platz 3

Finale: HF1-Sieger vs HF2-Sieger
Platzierung: HF1-Verlierer vs HF2-Verlierer
```

**Das Kernproblem:** Wenn ein Halbfinale gespielt wird (z.B. Match 1 mit Ergebnis 3:1), muss das System automatisch wissen:
- **Wer** in die nächste Runde zieht (der Sieger)
- **Wo** er hingeht (ins Finale, also Match mit bounds [1,2])
- **Als was** er eingetragen wird (teamA oder teamB?)

### Warum ist das nicht trivial?

Bei einem 4-Team-Bracket ist es noch einfach: HF1-Sieger → Finale. Aber bei **8, 16 oder 64 Teams** wird es komplex:

```
Viertelfinale 1 (bounds [1,8])  → Halbfinale 1 (bounds [1,4])
Viertelfinale 2 (bounds [1,8])  → Halbfinale 1 (bounds [1,4])
Viertelfinale 3 (bounds [1,8])  → Halbfinale 2 (bounds [5,8])
Viertelfinale 4 (bounds [1,8])  → Halbfinale 2 (bounds [5,8])

Halbfinale 1 (bounds [1,4])     → Finale (bounds [1,1])
Halbfinale 2 (bounds [1,4])     → Platzierung (bounds [3,4])
```

**Die Frage ist:** Wie finde ich heraus, welches Match das "nächste" ist?

### Die bounds-basierte Lösung

Jeder Match bekommt beim Erzeugen durch `generateKnockoutTree()` zwei Werte:
- **upperBound**: Wo beginnt dieser Bracket-Bereich?
- **lowerBound**: Wo endet er?

Die Regel: Winner geht nach `[upperBound, midpoint]`, Loser nach `[midpoint+1, lowerBound]`.

**Aber:** Mehrere Matches haben dieselben bounds! Bei 8 Teams haben alle 4 Viertelfinale-Matches bounds [1,8].

**Also muss man zusätzlich die Position innerhalb der Gruppe kennen:**
- Match 1 ist das erste von 2 Paaren → pairIndex 0 → geht zum ersten Ziel-Match
- Match 2 ist das zweite von 2 Paaren → pairIndex 0 → geht zum ersten Ziel-Match
- Match 3 ist das dritte von 2 Paaren → pairIndex 1 → geht zum zweiten Ziel-Match
- Match 4 ist das vierte von 2 Paaren → pairIndex 1 → geht zum zweiten Ziel-Match

**Und:** Innerhalb eines Pairs entscheidet die Position (even/odd), ob der Sieger als teamA oder teamB eingetragen wird.

### Zusammenfassung des fachlichen Problems

> Wenn ein KO-Match gespielt wird, muss das System automatisch den Sieger und Verlierer in die korrekten nächsten Matches propagieren. Dazu muss es:
> 1. Die Bounds des aktuellen Matches verstehen
> 2. Die Position innerhalb der Bounds-Gruppe berechnen (pairIndex)
> 3. Das richtige Ziel-Match in der nächsten Runde finden oder erstellen
> 4. Den Sieger/Verlierer als teamA oder teamB eintragen (je nach even/odd Position)
>
> Aktuell wird **keines** davon korrekt umgesetzt – keine Teams werden propagiert.

Es wird ein Turnier-System gebaut, das Gruppenspiele und K.O.-Phasen unterstützt. Die K.O.-Phase verwendet ein bounds-basiertes Bracket-System aus `generateKnockoutTree()`.

## Wie die Bounds funktionieren (aus knockout.ts)

Jeder Match in einem Knockout-Bracket hat zwei interne Felder:
- `upperBound`: Untere Grenze des Bracket-Bereichs
- `lowerBound`: Obere Grenze des Bracket-Bereichs

**Beispiel 4-Team-Bracket:**
```
Match 1: upperBound=1, lowerBound=4   (HF 1)
Match 2: upperBound=1, lowerBound=4   (HF 2)

Winner Match 1 → Match mit bounds [1,2]    (Finale)
Loser Match 1  → Match mit bounds [3,4]    (Platzierung)
Winner Match 2 → Match mit bounds [1,2]    (Finale)
Loser Match 2  → Match mit bounds [3,4]    (Platzierung)
```

**Beispiel 8-Team-Bracket:**
```
Runde 1: bounds [1,8], [1,8], [1,8], [1,8]   (Viertelfinale)
Runde 2: bounds [1,4], [1,4], [5,8], [5,8]    (Halbfinale)
Runde 3: bounds [1,2], [3,4]                    (Spiel um Platz 3+4)
Runde 4: bounds [1,1]                           (Finale)
```

**Regel:**
- Winner eines Matches mit bounds [A,B] geht zu Match mit bounds [A, floor((A+B)/2)]
- Loser geht zu Match mit bounds [floor((A+B)/2)+1, B] (nur wenn playouts aktiv)

## Das Problem

Wenn ein KO-Match gespielt wird (`scoreA` und `scoreB` gesetzt), werden die Teams **nicht** in die nächste Runde propagiert.

### Was bereits gefixt wurde:
1. ✅ `knockout.ts` Zeile 130: `upperBound`/`lowerBound` wurden aus gespeicherten Matches entfernt → jetzt bleiben sie erhalten
2. ✅ Algorithmus angepasst um Position innerhalb der Bounds-Gruppe zu berechnen

### Aktueller Stand (match.controller.ts, updateMatch-Funktion)

```typescript
// KO-Ergebnis → Sieger/Verlierer in nächste Runde propagieren
if (m.bracketId && m.scoreA !== null && m.scoreB !== null) {
  const bracket = await prisma.knockoutBracket.findUnique({ where: { id: m.bracketId } });
  
  // Sieger und Verlierer bestimmen
  const siegerId = m.scoreA > m.scoreB ? m.teamAId : m.teamBId;
  const verliererId = m.scoreA > m.scoreB ? m.teamBId : m.teamAId;

  // Alle KO-Matches laden (mit bounds!)
  const koMatches = await prisma.match.findMany({
    where: { tournamentId: bracket.tournamentId }
  });

  const currentUpper = m.upperBound;
  const currentLower = m.lowerBound;
  
  if (currentUpper !== currentLower) {
    const midPoint = Math.floor((currentUpper + currentLower) / 2);

    // Position innerhalb der Bounds-Gruppe bestimmen
    const sameBoundsGroup = koMatches
      .filter(m => m.bracketId === bracket.id && 
                   m.stage === (m.stage || 0) &&
                   m.upperBound === currentUpper && 
                   m.lowerBound === currentLower)
      .sort((a, b) => a.id - b.id);

    let myIndexInGroup = -1;
    for (let i = 0; i < sameBoundsGroup.length; i++) {
      if (sameBoundsGroup[i].id === m.id) { myIndexInGroup = i; break; }
    }

    const pairIndex = Math.floor(myIndexInGroup / 2);
    const isEvenSlot = myIndexInGroup % 2 === 0; // teamA oder teamB?

    // Ziel-Matches in nächster Runde finden/erstellen
    const nextRoundMatches = koMatches
      .filter(m => m.bracketId === bracket.id && m.stage === (m.stage || 0) + 1)
      .sort((a, b) => a.id - b.id);

    // Gruppiere nächste Runde nach bounds
    const nextGroups: Map<string, typeof koMatches> = new Map();
    for (const m of nextRoundMatches) {
      const key = `${m.upperBound}-${m.lowerBound}`;
      if (!nextGroups.has(key)) nextGroups.set(key, []);
      nextGroups.get(key).push(m);
    }

    // Winner-Ziel: pairIndex-tes Match in der winner bounds group
    const winnerBoundsKey = `${currentUpper}-${midPoint}`;
    const winnerGroup = nextGroups.get(winnerBoundsKey) || [];
    let targetWinner = null;
    if (pairIndex < winnerGroup.length) {
      targetWinner = winnerGroup[pairIndex];
    }

    // Loser-Ziel: pairIndex-tes Match in der loser bounds group  
    const loserBoundsKey = `${midPoint + 1}-${currentLower}`;
    const loserGroup = nextGroups.get(loserBoundsKey) || [];
    let targetLoser = null;
    if (pairIndex < loserGroup.length) {
      targetLoser = loserGroup[pairIndex];
    }

    // Falls kein Ziel-Match existiert, erstellen und Team zuweisen...
  }
}
```

## Mögliche Fehlerquellen

### 1. `sameBoundsGroup` Filter-Logik
```typescript
m.stage === (m.stage || 0)
```
Das vergleicht den stage-Wert des aktuellen Matches mit sich selbst – das ist immer true, aber vielleicht nicht was gemeint war? Vielleicht sollte es heißen:
```typescript
m.stage === m.stage // oder einfach weglassen
```

### 2. Bounds-Gruppierung in nächster Runde
Die `nextGroups` werden nach `${upperBound}-${lowerBound}` gruppiert. Aber wenn mehrere Matches dieselben bounds haben (z.B. zwei Halbfinale-Matches), dann ist die Zuordnung über `pairIndex` fehleranfällig.

### 3. Match-Erstellung vs. Existenzprüfung
Es wird geprüft ob ein Ziel-Match existiert, aber:
- Wenn es existiert, wird nur geprüft ob `teamAId` frei ist
- Die Logik für even/odd slot innerhalb des Pairs könnte falsch sein

### 4. Debugging-Hinweise
Um das Problem zu finden, müsste man loggen:
```typescript
console.log('Match:', m.id, 'bounds:', currentUpper, '-', currentLower);
console.log('sameBoundsGroup:', sameBoundsGroup.map(m => m.id));
console.log('myIndexInGroup:', myIndexInGroup);
console.log('pairIndex:', pairIndex);
console.log('isEvenSlot:', isEvenSlot);
console.log('nextGroups keys:', Array.from(nextGroups.keys()));
console.log('winnerGroup:', winnerGroup.map(m => m.id));
console.log('loserGroup:', loserGroup.map(m => m.id));
```

## Dateien die relevant sind:
- `backend/src/controllers/match.controller.ts` → `updateMatch()` Funktion (Zeile ~215)
- `backend/src/utils/knockout.ts` → `generateKnockoutTree()` Funktion (bounds-Erstellung)
- `backend/src/routes/match.routes.ts` → Route für PUT /match/:id

## Erwartetes Verhalten
Wenn Match mit bounds [1,4] gespielt wird und Team A gewinnt:
- Team A sollte in das Match mit bounds [1,2] eingetragen werden (als teamA oder teamB je nach Position)
- Der Verlierer sollte in das Match mit bounds [3,4] eingetragen werden

## Tatsächliches Verhalten
Keine Teams werden in die nächste Runde geschrieben. Weder teamA noch teamB wird aktualisiert.
