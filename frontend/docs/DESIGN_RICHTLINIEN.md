# 📐 Marktraumdokument – Design-Richtlinien

**Turnier-Planer** · v1.10.23  
*Letzte Aktualisierung: 2025-01-01*

---

## 1. Zwei Welten, zwei Kontexte

Die Anwendung bedient **zwei grundverschiedene Nutzergruppen** mit unterschiedlichen Geräten, Erwartungen und Arbeitsrhythmen. Jede Welt hat eigene Design-Regeln – sie dürfen nicht vermischt werden.

| Merkmal | 📱 Selbstservice (Helfer-Portal) | 🖥️ Admin-Bereich |
|---------|----------------------------------|-------------------|
| **Zielgruppe** | Helfer:innen ( Laien, mobil ) | Organisationsteam ( erfahren, desktop ) |
| **Gerät** | Smartphone primär, Tablet sekundär | Desktop/Laptop |
| **Layout-Breite** | Max 480px zentriert | Bis 1200px, füllend |
| **Navigation** | Hamburger-Menü + Tab-Switcher (Jobs/Verpflegung) | 3-stufig: Haupt-Tab → Sub-Tab → Content |
| **Interaktion** | Große Touch-Targets (≥40×40px), Swipe-freundlich | Präzise Klicks, Hover-Zustände möglich |
| **Branding** | Vereinsfarben dynamisch (#primary + #secondary) | Statisch: Blau/Grau/Grün je nach Kontext |
| **Stilrichtung** | Card-basiert, weich (16px radius), Gradient-Hintergründe | Tabellenbasiert, klar strukturiert (8px radius) |

> ⚠️ **Regel:** Komponenten gehören in eine der beiden Welten. Eine "gemischte" Komponente (z.B. Admin-Tabelle im SelfService) ist ein Design-Fehler.

---

## 2. Farbsystem

### 2.1 Vereinsfarben (SelfService nur)

Jedes Turnier hat einen zugehörigen Club mit **zwei** Farben:

| Rolle | Variable | Default | Verwendung |
|-------|----------|---------|------------|
| `primaryColor` | `#0d6efd` (Blau) | Header-Gradients, aktive Tabs, Primär-Buttons, Fortschrittsbalken |
| `secondaryColor` | `#198754` (Grün) | Sekundär-Buttons ("Zusagen"), aktive Sub-Tabs im SelfService |

**Wichtig:** `accentColor` wurde entfernt. Es gibt nur noch 2 Vereinsfarben.

### 2.2 Status-Farben (beide Welten)

| Zustand | Farbe | Hex | Verwendung |
|---------|-------|-----|------------|
| ✅ Erfolg / Aktiv | Grün | `#198754` | Bestätigung, aktive Elemente, "Zusagen"-Buttons |
| ⚠️ Warnung | Gelb | `#ffc107` | Fortschritt < 100%, Warn-Banners |
| ❌ Fehler / Gefahr | Rot | `#dc3545` | Löschen-Buttons, Fehlermeldungen, "Abmelden" |
| ℹ️ Info | Blau | `#0d6efd` | Primäre Aktionen im Admin, Links |

### 2.3 Neutrale Farben (beide Welten)

| Ebene | Farbe | Hex | Verwendung |
|-------|-------|-----|------------|
| Hintergrund SelfService | Hellgrau | `#f0f2f5` | Seiten-Hintergrund |
| Hintergrund Admin | Weiß/Hellgrau | `#fff` / `#f8f9fa` | Karten, Tabellen-Zellen |
| Rahmen / Divider | Grau | `#e9ecef` | Borders, Trennlinien |
| Text primär | Dunkelgrau | `#212529` / `#333` | Überschriften, Body-Text |
| Text sekundär | Mittelgrau | `#495057` / `#666` | Labels, Platzhalter |
| Text tertiär | Hellgrau | `#adb5bd` / `#ced4da` | Disabled, Footer, Meta-Info |

### 2.4 Admin-Kontext-Farben (nur Admin-Bereich)

Jeder Haupt-Tab hat eine eigene Akzentfarbe für aktive Sub-Tabs:

| Tab | Farbe | Hex |
|-----|-------|-----|
| 🏆 Spielplanmanagement | Blau | `#0d6efd` |
| 📋 Organisationsmanagement | Grün | `#198754` |
| ⚙️ Stammdaten | Grau | `#6c757d` |

---

## 3. Typografie

### 3.1 Schriftgröße (SelfService – mobile-first)

| Element | Größe | Gewicht | Farbe |
|---------|-------|---------|-------|
| Seiten-Header (Turniername) | 22px / 18px (mobil) | bold | `#fff` auf Gradient-Hintergrund |
| Section-Titel (`<h3>`) | 16px | normal | `clubPrimary` |
| Body-Text | 14–15px | normal | `#333` / `#666` |
| Labels / Meta | 12–13px | normal/bold | `#495057` / `#adb5bd` |
| Footer | 10–12px | normal | `#adb5bd` |

### 3.2 Schriftgröße (Admin – desktop)

| Element | Größe | Gewicht | Farbe |
|---------|-------|---------|-------|
| Haupt-Header (`<h1>`) | ~24px | bold | `#212529` |
| Section-Titel (`<h3>`) | 18px | bold | `#212529` |
| Tabellen-Header (`th`) | 13px | **600** | `#495057` |
| Body / Labels | 14–15px | normal/500 | `#333` / `#495057` |
| Footer / Meta | 12px | normal | `#adb5bd` |

### 3.3 Button-Schriftgewicht (verbindlich!)

| Aktionstyp | fontWeight | Beispiel |
|------------|------------|----------|
| **Primär** (Speichern, Erstellen, Zusagen) | **600** | "Anmelden", "Registrieren", "Zusagen" |
| **Sekundär** (Abbrechen, Zurück, Profil) | **500** | "Abbrechen", "Zurück zum Login" |

> ⚠️ **Nie** `fontWeight: 'bold'` für Buttons verwenden – immer `600` bzw. `500`.  
> Die Konstanten `btnStyle` (→ 600) und `btnStyleSecondary` (→ 500) in `shared.ts` sind die Quelle der Wahrheit.

---

## 4. Abstände & Radii

### 4.1 Border-Radius

| Element | Radius |
|---------|--------|
| SelfService-Karten / Overlays | **16px** |
| Admin-Karten / Panels | **12–16px** |
| Buttons, Inputs, Badges | **8–10px** |
| Profile-Bilder / Logos | **12px** (rund bei Logo: `22%`) |
| Status-Badges | **12px** (pill) |

### 4.2 Padding-System

| Kontext | Wert | Verwendung |
|---------|------|------------|
| SelfService-Seitenränder | `20px` mobil / `40px` desktop | Äußerer Container |
| SelfService-Karten-Inhalt | `24px` mobil / `40px` desktop | Weiße Card-Box |
| Admin-Inhaltsbereich | `20px` | Haupt-Container |
| Formular-Felder (Input/Select) | `10–14px` innen | Input-Styling |
| Tabellen-Zellen (`td`) | `12px 16px` | tdStyle |

### 4.3 Box-Shadows

| Ebene | Shadow | Verwendung |
|-------|--------|------------|
| SelfService-Cards | `0 20px 60px rgba(0,0,0,0.3)` | Login/Registrierung-Overlays |
| Admin-Karten | `0 4px 12px rgba(0,0,0,0.05)` / `0 2px 8px rgba(0,0,0,0.08)` | Content-Cards |
| Modals | `0 20px 60px rgba(0,0,0,0.3)` | Alle Dialoge |
| Dropdown-Menüs | `0 8px 30px rgba(0,0,0,0.2)` | Hamburger-Menü |

---

## 5. SelfServiceView – Spezifikation

### 5.1 Struktur (von oben nach unten)

```
┌──────────────────────────────────────┐
│ Gradient-Header (Vereinsfarbe)       │ ← linear-gradient(135deg, primary, shade(primary, -20))
│   Hamburger-Menü | Turniername       │
│   "Hallo, {Name}!"                   │
├──────────────────────────────────────┤
│ Tab-Switcher (Jobs / Verpflegung)    │ ← 2 Buttons, aktiver = secondaryColor
├──────────────────────────────────────┤
│ Push-Banner (optional, gelb)         │ 🔔 Banner nur wenn Push nicht aktiviert
├──────────────────────────────────────┤
│ Content-Region                       │
│   ┌──────────────────────────────┐   │
│   │ Card 1: Meine Schichten      │   │ ← border: 2px solid primaryColor
│   │ ┌──────────────────────────┐ │   │
│   │ │ Shift-Karte (white)      │ │   │ ← boxShadow, linker Rand accentColor
│   │ └──────────────────────────┘ │   │
│   │ ┌──────────────────────────┐ │   │
│   │ │ Shift-Karte              │ │   │
│   │ └──────────────────────────┘ │   │
│   └──────────────────────────────┘   │
│   ┌──────────────────────────────┐   │
│   │ Card 2: Offene Jobs          │   │
│   └──────────────────────────────┘   │
├──────────────────────────────────────┤
│ Sponsor-Leiste (sticky bottom)       │ ← transparent, blur-Hintergrund
├──────────────────────────────────────┤
│ Footer-Links (Privacy/Impressum)     │ ← klein, grau
└──────────────────────────────────────┘
```

### 5.2 Farbanwendung im Detail

| Element | Regel |
|---------|-------|
| **Header-Hintergrund** | `linear-gradient(135deg, clubPrimary, shadeColor(clubPrimary, -20))` |
| **Tab-Switcher aktiv** | Hintergrund = `clubSecondary`, Text = `clubSecondaryText` (berechnet aus Contrast) |
| **Tab-Switcher inaktiv** | Weißer Hintergrund, grauer Text (`#666`) |
| **Section-Titel** | Farbe = `clubPrimary` |
| **Fortschrittsbalken** | `< 100%`: Gelb `#ffc107`, `≥ 100%`: Grün `#198754`, `0`: Rot `#dc3545` |
| **"Zusagen"-Button** | Hintergrund = `clubSecondary`, Text = kontrastierend (hell/dunkel berechnet) |
| **Abmelden-Button** | Hintergrund `#fde8e8`, Text `#dc3545` |
| **Shift-Karte linker Rand** | `borderLeft: 4px solid clubAccent` (Default `#198754`) |

### 5.3 Touch-Targets

Alle interaktiven Elemente müssen **mindestens 40×40px** haben. Buttons: `padding: '12px 20px'` oder größer. Icon-Buttons: `width: 40, height: 40`.

---

## 6. AdminView – Spezifikation

### 6.1 Navigation (3-stufig)

```
┌──────────────────────────────────────────────────────┐
│ [Logo] Turnierplaner – Admin    [👑 Admin] [Self-Service →] │
├──────────────────────────────────────────────────────┤
│ Haupt-Navigation (Level 1):                          │
│   [🏆 Spielplanmanagement] [📋 Organisation] [⚙️ Stammdaten] │ ← aktiver = primaryColor, weißer Text
├──────────────────────────────────────────────────────┤
│ Kontext-Leiste:                                      │
│   [Aktives Turnier ▼]  [Jahrgang ▼]                │ ← hellgrauer Hintergrund (#f8f9fa)
├──────────────────────────────────────────────────────┤
│ Sub-Navigation (Level 2):                            │
│   [📅 Turniertage] [⚽ Felder] [📋 Teilnehmer] ...    │ ← aktiver = kontextabhängig, weißer Text
├──────────────────────────────────────────────────────┤
│ Content-Bereich:                                     │
│   Tabellen / Formulare / Cards                       │
└──────────────────────────────────────────────────────┘
```

### 6.2 Kontext-Farben pro Haupt-Tab

| Haupt-Tab | Aktiver Sub-Tab | Inaktive Sub-Tabs |
|-----------|-----------------|--------------------|
| 🏆 Spielplanmanagement | `#0d6efd` (Blau) + weißer Text | `#e9ecef` Hintergrund, schwarzer Text |
| 📋 Organisationsmanagement | `#198754` (Grün) + weißer Text | `#e9ecef` Hintergrund, schwarzer Text |
| ⚙️ Stammdaten | `#6c757d` (Grau) + weißer Text | `#e9ecef` Hintergrund, schwarzer Text |

### 6.3 Admin-Komponenten-Standards (`shared.ts`)

```typescript
// Tabellen-Zelle
export const tdStyle = { padding: '12px 16px', border: '1px solid #e9ecef' };

// Tabellen-Header
export const thStyle = { ...tdStyle, background: '#f8f9fa', fontWeight: '600', fontSize: 13, color: '#495057' };

// Primär-Button (Speichern, Erstellen)
export const btnStyle = { padding: '12px 20px', cursor: 'pointer', border: 'none', borderRadius: 8, background: '#f8f9fa', fontSize: 14, fontWeight: 600, minHeight: 44 };

// Sekundär-Button (Abbrechen, Zurück)
export const btnStyleSecondary = { ...btnStyle, fontWeight: 500 };

// Input-Feld
export const inputStyle = { padding: '10px 14px', border: '1px solid #dee2e6', borderRadius: 10, fontSize: 14, outline: 'none', background: '#fff' };
```

> ⚠️ **Regel:** Alle Admin-Komponenten müssen diese Konstanten verwenden. Keine inline-Styles für Buttons/Inputs/Tabellen-Zellen in Admin-Komponenten!

### 6.4 Modal-System (`Modal.tsx`)

Drei Dialog-Typen, alle mit `backdropFilter: blur(4px)` und `background: rgba(0,0,0,0.5)`:

| Typ | Verwendung | Akzentfarbe |
|-----|------------|-------------|
| **confirm** | Bestätigungsdialog (Löschen etc.) | Variant-spezifisch: danger=`#dc3545`, warning=`#ffc107`, info=`#0d6efd` |
| **alert** | Info-Dialog | Immer `#0d6efd` (Blau) |
| **form** | Formular-Dialog | Immer `#0d6efd` (Blau) für Submit-Button |

**Modal-Regeln:**
- Max-Width: 420px (confirm/alert), 480px (form)
- Border-radius: 16px
- Padding: `28px 32px 24px`
- Shadow: `0 20px 60px rgba(0,0,0,0.3)`
- **Nie** browser-native `alert()` oder `confirm()` verwenden!

### 6.5 EditModal (`EditModal.tsx`)

Wiederverwendbare Modal-Komponente für CRUD-Operationen:
- Dynamische Felder (text, number, select)
- Header mit Titel + Schließen-Button
- Formular-Felder mit Labels
- Footer mit Abbrechen/Speichern-Buttons
- **Keine** `adminPrimary`-Prop mehr – verwendet stattdessen die Kontext-Farbe des übergeordneten Tabs

---

## 7. Komponenten-Katalog & Zuordnung

### 7.1 SelfServiceView (`SelfServiceView.tsx`)

| Bereich | Beschreibung | Design-Merkmal |
|---------|-------------|----------------|
| Login / Registrierung | Auth-Overlays | Gradient-Hintergrund, weiße Card (16px radius), große Inputs |
| PIN-Eingabe | Helfer-PIN Bestätigung | Dashed Border Box (#adb5bd) |
| Header | Turniername + Hamburger-Menü | Gradient-Hintergrund, weißer Text |
| Tab-Switcher | Jobs / Verpflegung | 2 Buttons, aktiver = secondaryColor |
| Push-Banner | Hinweis auf PWA-Push | Gelber Warn-Banner (#fff3cd) |
| Schicht-Karten | Meine Schichten / Offene Jobs | Weiße Cards mit linkem Farbrand (4px) |
| Fortschrittsbalken | Spenden-Fortschritt | Dynamische Farbe je % |
| Rating-Modal | ⭐ Schicht bewerten | Stern-Rating, Textarea für Kommentar |

### 7.2 AdminView (`App.tsx`)

| Bereich | Beschreibung | Design-Merkmal |
|---------|-------------|----------------|
| Header | Logo + Titel + Rollen-Badge | Rollen-Badge: Admin=`#dc3545`, Organizer=`#198754` |
| Haupt-Navigation | 3 Tabs (Spielplan/Org/Stammdaten) | Aktiver Tab = primaryColor, weißer Text |
| Kontext-Leiste | Turnier-Auswahl + Jahrgang | Hellgrauer Hintergrund (#f8f9fa), border |
| Sub-Navigation | Icon-Buttons pro Haupt-Tab | Aktiver = kontextabhängige Farbe |
| Content-Bereich | Tabellen / Formulare | `tdStyle`, `thStyle`, `btnStyle` aus shared.ts |

### 7.3 Admin-Stammdaten (`stammdaten/`)

| Komponente | adminPrimary | Design-Hinweis |
|-----------|--------------|----------------|
| Vereine | `#6c757d` (Grau) | Logo-Upload → Farbanalyse → 2-Farben-Auswahl |
| Turniere | `#6c757d` | Status-Badges: 🟢 aktiv, 🟡 beendet, ⚪ archiviert |
| Arbeitsbereiche | `#6c757d` | Farbauswahl mit Pipette (Color-Picker) |
| Tagesvorlagen | `#6c757d` | Zeitachsen-Visualisierung |
| Verpflegung | `#6c757d` | Kategorien + Items CRUD |
| Jahrgänge | `#6c757d` | Geburtsjahr-Bereiche |
| Benutzer | `#6c757d` | Nur für Admins sichtbar |
| DB-Management | — (keine Prop) | Export/Import SQLite DB als Base64 |

### 7.4 Admin-Organisation (`organisation/`)

| Komponente | adminPrimary | Design-Hinweis |
|-----------|--------------|----------------|
| Dienstplan (Uebersicht) | `#198754` (Grün) | Akkordeon pro Tag, Tabellen-Layout |
| Verpflegung | `#198754` | Matrix: Jahrgang × Lebensmittel |
| Einkaufsliste | — | Barcode-Scan mit OFF-Hierarchie Mapping |
| Push-Nachrichten | — | Broadcast-Tool für alle Helfer |

---

## 8. Vereinsbranding (Club Theming)

### 8.1 Farbwirkung

Die zwei Vereinsfarben (`primaryColor`, `secondaryColor`) steuern das gesamte SelfService-Erlebnis:

| Element | Beeinflusst durch |
|---------|-------------------|
| Header-Gradient | `primaryColor` + shade(-20%) |
| Tab-Switcher aktiv | `secondaryColor` |
| Primär-Buttons (Anmelden, Registrieren) | `primaryColor` |
| Sekundär-Buttons (Zusagen) | `secondaryColor` |
| Section-Titel | `primaryColor` |
| Fortschrittsbalken | `primaryColor` / Status-Farben |

### 8.2 Logo & Farbanalyse

In **Vereine.tsx** wird das hochgeladene Logo analysiert, um die Vereinsfarben automatisch vorzuschlagen:

1. Canvas-basierte Pixel-Analyse des Logos
2. 4 Strategien (Grob/Fein/Kontrast/Standard) – durch Klick wechseln
3. Extrahierte Farben werden live in den Color-Pickern angezeigt
4. "✓ Übernehmen" kopiert die Werte in das Formular

**Reihenfolge im Modal:** Name/City → Logo-Upload → **Farben erscheinen erst nach Upload** (verhindert Pipette-Overlap).

### 8.3 Kontrast-Berechnung

Für Text auf Vereinsfarben wird automatisch helle/dunkle Farbe berechnet:

```typescript
const luminance = (r*0.299 + g*0.587 + b*0.114);
const textColor = luminance > 186 ? '#000' : '#fff';
```

---

## 9. Responsive-Verhalten

### 9.1 SelfServiceView

| Breakpoint | Verhalten |
|------------|-----------|
| `< 768px` (mobil) | `maxWidth: 480px`, kleinere Padding-Werte, kompaktere Cards |
| `≥ 768px` (tablet/desktop) | Größere Padding-Werte, mehr Whitespace |

**Prinzip:** Mobile-first. Alle Styles funktionieren auf schmalen Bildschirmen. Desktop ist "bonus".

### 9.2 AdminView

| Breakpoint | Verhalten |
|------------|-----------|
| `< 1024px` | Navigation wrappt, Kontext-Leiste wird gestapelt |
| `≥ 1024px` | Volles Layout mit horizontaler Navigation |

**Prinzip:** Desktop-first. Mobile-Nutzung ist nicht priorisiert (Admin-Bereich = Organisationstool).

---

## 10. Emoji-Icons

Emojis werden als visuelle Anker in beiden Welten verwendet:

| Kontext | Regel |
|---------|-------|
| **Navigation-Tabs** | Immer Emoji + Label (`🏆 Spielplanmanagement`) |
| **Sub-Navigation** | Immer Emoji + Label (`📅 Turniertage`) |
| **Buttons mit Aktion** | Emoji vor Text (`✓ Zusagen`, `✕ Abmelden`) |
| **Status-Badges** | Emoji als Indikator (`🟢 aktiv`, `⚠️ Warnung`) |
| **Section-Titel** | Emoji vor Titel (`📋 Meine Schichten`) |

> ⚠️ **Regel:** Emojis sind dekorativ, nicht essentiell. Die Komponente muss auch ohne Emoji funktionieren (Screenreader, fehlende Rendering).

---

## 11. Best Practices für neue Komponenten

### 11.1 Checkliste vor der Implementierung

- [ ] Gehört die Komponente zur **SelfService-** oder **Admin-Welt**?
- [ ] Welche **Kontext-Farbe** wird aktiviert? (Blau/Grün/Grau)
- [ ] Werden `btnStyle` / `btnStyleSecondary` / `inputStyle` aus `shared.ts` verwendet?
- [ ] Sind Touch-TTargets ≥ 40×40px (SelfService)?
- [ ] Wird das **Modal-System** statt browser-native Dialoge verwendet?
- [ ] Werden Vereinsfarben dynamisch angewendet (SelfService) oder statisch (Admin)?

### 11.2 Neue Farben hinzufügen

Wenn eine neue Farbe benötigt wird:
1. Prüfen, ob eine der bestehenden Status-Farben passt (`#198754`, `#ffc107`, `#dc3545`, `#0d6efd`)
2. Wenn nicht: Neue Farbe in beide Welten dokumentieren (SelfService + Admin)
3. **Nie** eine dritte Vereinsfarbe einführen – nur 2 Farben pro Club

### 11.3 Konsistenz-Regeln

| Element | SelfService | Admin |
|---------|-------------|-------|
| Card-Radius | 16px | 12–16px |
| Button-Radius | 8–10px | 8px |
| Input-Border | `2px solid #e9ecef` | `1px solid #dee2e6` (inputStyle) |
| Shadow Cards | `0 20px 60px rgba(0,0,0,0.3)` | `0 4px 12px rgba(0,0,0,0.05)` |
| Gradient-Richtung | `135deg` (immer) | Keine Gradients (außer Header) |

---

## 12. Anhang: Hilfsfunktionen

### 12.1 `shadeColor(color, percent)` in `shared.ts`

```typescript
// Hellt oder dunkelt eine HEX-Farbe um einen Prozentsatz
shadeColor('#0d6efd', -30) → '#0947a8'  // dunkler
shadeColor('#0d6efd', 30)  → '#5ba4f5'  // heller
```

**Verwendung:** Gradient-Hintergründe im SelfService-Header.

### 12.2 `statusBadge(status)` in `shared.ts`

```typescript
statusBadge('aktiv')   → '🟢'
statusBadge('beendet') → '🟡'
statusBadge('archiviert') → '⚪'
```

**Verwendung:** Status-Anzeige in Admin-Tabellen.

### 12.3 `minToTime(min)` / `timeToMin(t)` in `shared.ts`

```typescript
minToTime(540)   → '09:00'
timeToMin('14:30') → 870
```

**Verwendung:** Zeitkonvertierung im Dienstplan.

---

*Dieses Dokument ist die verbindliche Quelle für Design-Entscheidungen. Bei Unklarheiten oder Konflikten zwischen Komponenten gilt diese Spezifikation vor jeder impliziten Konvention.*
