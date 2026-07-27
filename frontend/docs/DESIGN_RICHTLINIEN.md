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

## 13. Stammdaten-Konsistenzstandards (verbindlich ab v1.10.27)

Alle Stammdaten-Komponenten (`stammdaten/`) müssen folgende Regeln einheitlich umsetzen.

### 13.1 Input-Felder → Immer Label mit Emoji **oben drüber**

**Regel:** Jedes Input-Feld in einem Modal und im „Neu hinzufügen"-Bereich bekommt ein **sichtbares Label oben drüber** (nicht daneben!) **mit vorangestelltem Emoji**. Der Placeholder wird zum **Hilfetext**, nicht zur einzigen Beschriftung.

```tsx
// ✅ GÜLTIGES MUSTER (immer anwenden):
<div>
  <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>
    📝 Name
  </label>
  <input 
    placeholder="Optionaler Zusatzhinweis" 
    value={form.name} 
    onChange={...} 
    style={{ ... }}
  />
</div>

// ❌ NICHT MEHR ERLAUBT – Kein Emoji:
<label>Name</label>  ← FALSCH! Immer Emoji voran!

// ❌ NICHT MEHR ERLAUBT – Label daneben:
<div style={{ display: 'flex', alignItems: 'center' }}>
  <span>👤 Name:</span>  ← FALSCH! Immer oben drüber!
  <input placeholder="z.B. Sommerturnier" />
</div>

// ❌ NICHT MEHR ERLAUBT – Kein Label:
<input placeholder="Name" value={form.name} onChange={...} />

```tsx
// ✅ GÜLTIGES MUSTER (immer anwenden):
<div>
  <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>
    Feldname
  </label>
  <input 
    placeholder="Optionaler Zusatzhinweis" 
    value={form.name} 
    onChange={...} 
    style={{ ... }}
  />
</div>

// ❌ NICHT MEHR ERLAUBT – Label daneben:
<div style={{ display: 'flex', alignItems: 'center' }}>
  <span>Name:</span>  ← FALSCH! Immer oben drüber!
  <input placeholder="z.B. Sommerturnier" />
</div>

// ❌ NICHT MEHR ERLAUBT – Kein Label:
<input placeholder="Name" value={form.name} onChange={...} />
```

**Begründung:** Sobald man in ein Feld tippt, verschwindet der Placeholder. Ohne Label ist nicht mehr erkennbar, was das Feld beschreibt.

**Emoji-Regel:** Jedes Label bekommt **immer ein vorangestelltes Emoji**, das den **Feld-Typ** visuell unterstützt – **nicht die Entität**. Pro Feld-Typ gibt es **exakt ein festes Emoji**, das in allen Komponenten identisch ist:

| Feld-Typ | Emoji | Beispiel |
|---|---|---|
| **Name** (jeder Art) | 📝 | `📝 Name` |
| E-Mail | 📧 | `📧 E-Mail` |
| Telefon | 📞 | `📞 Telefon` |
| Datum/Zeitraum | 📅 | `📅 Von`, `📅 Bis`, `📅 Zeitraum` |
| Ort/Stadt | 🏙️ | `🏙️ Stadt` |
| Verein | 🏅 | `🏅 Verein` |
| Kategorie | 📂 | `📂 Kategorie` |
| Icon/Emoji-Auswahl | 😀 | `😀 Icon` |
| Farbe | 🎨 | `🎨 Farbe` |
| Preis/Währung | 💰 | `💰 Preis` |
| Einheit/Maß | 📏 | `📏 Einheit` |
| Rolle/Position | 🎭 | `🎭 Rolle` |
| Status | 📊 | `📊 Status` |
| Logo/Bild | 🖼️ | `🖼️ Logo` |
| Kinder/Kind | 👶 | `👶 Kinder` |
| Helfer-Anzahl | 👥 | `👥 Min`, `👥 Max` |
| Sponsor | 🤝 | `🤝 Hat Sponsor?` |
| Jahrgänge | 📅 | `📅 Jahrgänge` |

**Wichtig:** Das Emoji beschreibt den **Feld-Typ**, nicht die Entität. Ein Name-Feld heißt **immer** `📝 Name`, egal ob es sich um einen Vereinsnamen, Turniername oder Artikelname handelt.

**Ausnahmen:** Checkbox-Labels (z.B. "Aktiv") und kurze Labels wie "Min"/"Max" bei Zahlenfeldern können ein passendes Emoji haben, müssen aber nicht zwingend.

### 13.2 Modal-Footer → Immer fixiert sichtbar

**Regel:** Der Footer mit **Speichern/Abbrechen** ist **niemals** scrollbar. Nur der Feldinhalt scrollt. Modal-Höhe max `80vh`.

```tsx
// ✅ GÜLTIGES MUSTER:
<div style={{ 
  display: 'flex', 
  flexDirection: 'column', 
  maxHeight: '80vh'           // Gesamte Modal-Höhe begrenzen
}}>
  {/* Scrollbarer Inhalt */}
  <div style={{ 
    flex: 1, 
    overflowY: 'auto',          // Nur Inhalt scrollt
    paddingRight: 8             // Scrollbar nicht überdecken
  }}>
    {fields...}
  </div>
  
  {/* Fixierter Footer – IMMER sichtbar */}
  <div style={{ 
    display: 'flex', 
    gap: 8, 
    justifyContent: 'flex-end', 
    paddingTop: 12, 
    borderTop: '1px solid #e9ecef'
  }}>
    <button onClick={closeEdit}>Abbrechen</button>
    <button onClick={save} style={{ fontWeight: 600 }}>💾 Speichern</button>
  </div>
</div>
```

**Begründung:** Bei großen Modals (z.B. Turnier-Editor mit Jahrgängen/Sponsor) verschwindet der Footer – Nutzer können nicht mehr speichern.

### 13.3 Sortierung → Einheitlich Drag & Drop

| Kriterium | Regel |
|-----------|-------|
| **≤ 20 Einträge** | Drag & Drop in der Liste/Tabelle (Zeile ziehen) |
| **> 20 Einträge** | Nur sortierbare Tabellen-Spalte (kein `order`-Feld im Formular) |

**Das manuelle `order`-Eingabefeld im Edit-Modal wird nicht mehr verwendet.**

| Komponente | Aktueller Zustand | Soll-Zustand |
|-----------|-----------------|-------------|
| Arbeitsbereiche | ✅ Drag & Drop | Bleibt Drag & Drop |
| WorkAreaCategories | ✅ Drag & Drop | Bleibt Drag & Drop |
| Jahrgänge | ❌ `order`-Feld im Formular | → **Drag & Drop** (wie ArbBe) |
| Lebensmittel-Kategorien | ❌ Keine Sortierung | → **Drag & Drop** (wie ArbBe) |
| Lebensmittel-Artikel | ❌ Nur sortierbar | Bleibt nur sortierbar (> 20 Einträge möglich) |

### 13.4 Edit-Auslöser → Einheitlich ✏️ Button

**Regel:** Die einzige konsistente Edit-Aktion ist der **✏️ Button in der Aktion-Spalte**.

| Komponente | Soll-Zustand |
|-----------|-------------|
| WorkAreaCategories | ❌ Inline-Klick → ✅ **✏️ Button** (wie alle anderen) |
| Alle anderen | ✅ Bleibt ✏️ Button |
| Turniere | ❌ „⚙️ Edit" Text-Button → ✅ **✏️ Button** (einheitlich) |

### 13.5 Emoji-Referenz – Einheitliche Symbolik (verbindlich)

**Grundregel:** Emojis dienen der visuellen Orientierung. Pro **Kategorie** gibt es **exakt ein festes Emoji**, das in allen Komponenten identisch verwendet wird.

#### 13.5.1 Input-Felder → Label-Emojis

| Feld-Typ | Emoji | Beispiel |
|---|---|---|
| **Name** (jeder Art) | 📝 | `📝 Name` |
| E-Mail | 📧 | `📧 E-Mail` |
| Telefon | 📞 | `📞 Telefon` |
| Datum/Zeitraum | 📅 | `📅 Von`, `📅 Bis`, `📅 Zeitraum` |
| Ort/Stadt | 🏙️ | `🏙️ Stadt` |
| Verein | 🏅 | `🏅 Verein` |
| Kategorie | 📂 | `📂 Kategorie` |
| Icon/Emoji-Auswahl | 😀 | `😀 Icon` |
| Farbe | 🎨 | `🎨 Farbe` |
| Preis/Währung | 💰 | `💰 Preis` |
| Einheit/Maß | 📏 | `📏 Einheit` |
| Rolle/Position | 🎭 | `🎭 Rolle` |
| Status | 📊 | `📊 Status` |
| Logo/Bild | 🖼️ | `🖼️ Logo` |
| Kinder/Kind | 👶 | `👶 Kinder` |
| Helfer-Anzahl | 👥 | `👥 Min`, `👥 Max` |
| Sponsor | 🤝 | `🤝 Hat Sponsor?` |

> ⚠️ **Wichtig:** Das Emoji beschreibt den **Feld-Typ**, nicht die Entität. Ein Name-Feld heißt **immer** `📝 Name`, egal ob Vereinsname, Turniername oder Artikelname.

#### 13.5.2 Aktions-Emojis → Immer identisch

| Aktion | Emoji | Verwendung |
|---|---|---|
| Neu hinzufügen / Erstellen | ➕ | Alle „Neu hinzufügen"-Buttons |
| Bearbeiten | ✏️ | Edit-Modal-Titel + Edit-Button in Tabellen |
| Löschen | 🗑️ | Delete-Button in Tabellen |
| Drag & Drop Handle | ⋮⋮ | Sortier-Spalte links in Tabellen |

#### 13.5.3 Status-Emojis → Immer identisch

| Zustand | Emoji | Verwendung |
|---|---|---|
| ✅ Aktiv / Verfügbar / Erfolg | ✅ | Aktive Elemente, „Verfügbar", Bestätigungen |
| ⚠️ Warnung / Achtung | ⚠️ | Unvollständige Daten, unbesetzte Slots, Validierungswarnungen |
| ❌ Fehler / Inaktiv | ❌ | Fehlerzustände, inaktive Elemente |

#### 13.5.4 Modal-Titel → Emoji vor Titeltext

| Modal-Typ | Format |
|---|---|
| Neu hinzufügen | `➕ [Entität] hinzufügen` |
| Bearbeiten | `✏️ [Entität] bearbeiten` |
| Feedback / Übersicht | `📊 [Thema]` |

#### 13.5.6 Emoji-Picker → Immer inline, nie absolut positioniert

**Regel:** Der Emoji-Picker wird **immer inline** direkt unter dem Icon-Feld gerendert – **niemals mit `position: absolute`**. Er erscheint als hellgraue Box (`background: '#f8f9fa'`) mit abgerundeten Ecken.

| Eigenschaft | Wert |
|---|---|
| **Position** | Inline (natürlicher Document-Flow) |
| **Hintergrund** | `#f8f9fa` (hellgrau) |
| **Border-Radius** | `8px` |
| **Padding** | `8px` |
| **Gap zwischen Emojis** | `4px` |
| **Emoji-Größe** | `fontSize: 20`, `padding: '4px 6px'` |
| **Ausgewähltes Emoji** | `border: '2px solid #0d6efd'`, `background: '#e8f4fd'` |
| **Unausgewählt** | `border: '1px solid #dee2e6'`, `background: '#fff'` |

```tsx
// ✅ KORREKT – Inline unter dem Icon-Feld:
<div style={{ width: 70, display: 'flex', flexDirection: 'column' }}>
  <label>😀 Icon</label>
  <button onClick={() => setShowPicker(!showPicker)}>{currentIcon}</button>
  {showPicker && (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8,
      background: '#f8f9fa', borderRadius: 8, marginTop: 6
    }}>
      {emojis.map(e => (
        <button key={e} onClick={() => selectEmoji(e)}
          style={{ fontSize: 20, padding: '4px 6px',
            border: selected === e ? '2px solid #0d6efd' : '1px solid #dee2e6',
            background: selected === e ? '#e8f4fd' : '#fff',
            borderRadius: 6, cursor: 'pointer'
          }}>{e}</button>
      ))}
    </div>
  )}
</div>

// ❌ FALSCH – Absolut positioniert:
<div style={{ position: 'absolute', top: -5, left: 0 }}>...</div>
```

> ⚠️ **Wichtig:** Der Emoji-Picker muss **nicht** `position: absolute` oder `zIndex` verwenden. Er fließt natürlich im Document-Flow und erscheint direkt unter dem Icon-Feld.

#### 13.5.7 Zusammenfassung der verbindlichen Regeln

| Element | Regel | Quelle |
|---------|-------|--------|
| Input-Beschriftung | Immer Label + Emoji oben drüber | §13.1 |
| Modal-Footer | Fixiert sichtbar, max `80vh` | §13.2 |
| Sortierung ≤ 20 | Drag & Drop | §13.3 |
| Sortierung > 20 | Nur sortierbare Spalte | §13.3 |
| Edit-Aktion | ✏️ Button in Aktion-Spalte | §13.4 |
| Button-Gewicht | Primär `600`, Sekundär `500` | §3.3 |
| **Name-Felder** | **Immer 📝 Name** | **§13.5.1** |
| **Neu-Button** | **Immer ➕** | **§13.5.2** |
| **Edit-Button** | **Immer ✏️** | **§13.5.2** |
| **Delete-Button** | **Immer 🗑️** | **§13.5.2** |
| **Status aktiv** | **Immer ✅** | **§13.5.3** |
| **Warnung** | **Immer ⚠️** | **§13.5.3** |

---

*Dieses Dokument ist die verbindliche Quelle für Design-Entscheidungen. Bei Unklarheiten oder Konflikten zwischen Komponenten gilt diese Spezifikation vor jeder impliziten Konvention.*
