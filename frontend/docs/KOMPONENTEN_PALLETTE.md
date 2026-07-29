# 🧩 Komponenten-Palette – Bausteine mit Props & Styles

**machdasturnier** · v1.12.0  
*Jede Komponente als wiederverwendbarer Baustein mit explizitem Interface.*

---

## 1. Admin-Bereich (`shared.ts`)

### 1.1 Button-Komponenten

#### `AdminButton` (Primär)
```typescript
interface AdminButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'danger';  // danger = roter Hintergrund
  disabled?: boolean;
  icon?: string;                  // Emoji vor Text, z.B. "➕"
}
```

Diese Komponente verwendet nun saubere CSS-Klassen (`btn btn-primary` oder `btn btn-outline`) aus `shared.css`.

// danger variant: background: '#fde8e8', color: '#dc3545'

#### `AdminButtonSecondary` (Sekundär)
```typescript
interface AdminButtonSecondaryProps extends Omit<AdminButtonProps, 'variant'> {}

Diese Komponente verwendet nun CSS-Klassen aus dem Design System.  // IMMER 500 für Sekundär!
```

**Verwendungsregeln:**
| Aktionstyp | Komponente | Beispiel |
|------------|-----------|----------|
| Speichern, Erstellen, Hinzufügen | `AdminButton` (primary) | "Speichern", "+ Arbeitsbereich" |
| Abbrechen, Zurück, Schließen | `AdminButtonSecondary` | "Abbrechen", "Zurück" |
| Löschen | `AdminButton` (danger) | "🗑️ Löschen" |

---

### 1.2 Input-Felder

#### `AdminInput`
```typescript
interface AdminInputProps {
  value: string | number;
  onChange: (val: string) => void;
  type?: 'text' | 'number' | 'email' | 'password';
  placeholder?: string;
  label?: string;                 // Optionaler Label-Text über dem Input
  error?: string;                 // Fehlermeldung unter dem Input
  disabled?: boolean;
}

// Style (inputStyle):
{
  padding: '10px 14px',
  border: '1px solid #dee2e6',
  borderRadius: 10,
  fontSize: 14,
  outline: 'none',
  background: '#fff'
}

// Fokus-Zustand (wenn benötigt):
{ borderColor: '#0d6efd', boxShadow: '0 0 0 3px rgba(13,110,253,0.1)' }
```

#### `AdminSelect`
```typescript
interface AdminSelectProps {
  value: number | string;
  onChange: (val: number) => void;
  options: Array<{ label: string; value: number | string }>;
  placeholder?: string;
  disabled?: boolean;
}

// Style: identisch zu inputStyle + padding-right für Dropdown-Pfeil
```

---

### 1.3 Tabellen-Komponenten

#### `AdminTable`
```typescript
interface AdminTableProps<T> {
  columns: Array<{
    key: keyof T | string;
    label: string;
    width?: number;               // Optional: feste Spaltenbreite in px
    render?: (value: any, row: T) => React.ReactNode;  // Custom Renderer
  }>;
  data: T[];
  onRowClick?: (row: T) => void;
  sortable?: boolean;             // Standard: true
}

// thStyle (Header):
{
  padding: '12px 16px',
  border: '1px solid #e9ecef',
  background: '#f8f9fa',
  fontWeight: '600',
  fontSize: 13,
  color: '#495057'
}

// tdStyle (Zelle):
{
  padding: '12px 16px',
  border: '1px solid #e9ecef',
  verticalAlign: 'top'
}
```

**Verwendung:**
```tsx
<AdminTable
  columns={[
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'E-Mail' },
    { 
      key: 'status', 
      label: 'Status',
      render: (val) => <span>{statusBadge(val)}</span>  // Custom Renderer
    }
  ]}
  data={volunteers}
  onRowClick={(row) => openEditModal(row)}
/>
```

---

### 1.4 Modal-Komponenten (`Modal.tsx`)

#### `modal.confirm` (Bestätigungsdialog)
```typescript
interface ConfirmOptions {
  title: string;                  // Dialog-Titel
  message: string;                // Haupttext (unterstützt \n für Zeilenumbrüche)
  variant?: 'danger' | 'warning' | 'info';  // Standard: info
  confirmText?: string;           // Standard: "Bestätigen"
  cancelText?: string;            // Standard: "Abbrechen"
}

// Style:
{
  maxWidth: 420,
  borderRadius: 16,
  padding: '28px 32px 24px',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  backdropFilter: 'blur(4px)',
  background: 'rgba(0,0,0,0.5)'
}

// variant Farben:
// danger → #dc3545 (rot)
// warning → #ffc107 (gelb)
// info → #0d6efd (blau)
```

#### `modal.alert` (Info-Dialog)
```typescript
interface AlertOptions {
  title: string;
  message: string;
}
// Immer variant='info' (#0d6efd), keine Konfiguration nötig
```

#### `modal.form` (Formular-Dialog)
```typescript
interface FormOptions {
  title: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'select';
    options?: Array<{ label: string; value: any }>;  // nur für select
    required?: boolean;
  }>;
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
}
// maxWidth: 480px, Submit-Button immer variant='info' (#0d6efd)
```

**Regel:** **Nie** browser-native `alert()` oder `confirm()` verwenden!

---

### 1.5 EditModal (`EditModal.tsx`) – Wiederverwendbar

#### `EditModal` Props
```typescript
interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'color';
    options?: Array<{ label: string; value: any }>;
    required?: boolean;
    defaultValue?: any;
  }>;
  onSubmit: (values: Record<string, any>) => Promise<void>;
}

// Layout:
// ┌──────────────────────────────┐
// │ Titel              [✕]       │ ← Header mit Schließen-Button
// ├──────────────────────────────┤
// │ Feld 1: Input                │
// │ Feld 2: Select               │
// │ ...                          │
// ├──────────────────────────────┤
// │ [Abbrechen]    [Speichern]   │ ← Footer mit Buttons
// └──────────────────────────────┘

// Keine adminPrimary-Prop mehr – verwendet Kontext-Farbe des übergeordneten Tabs
```

---

### 1.6 Status-Badges

#### `statusBadge(status)`
```typescript
function statusBadge(status: string): string {
  // Gibt Emoji zurück, keine React-Komponente!
}

// Mapping:
// 'aktiv'   → '🟢'
// 'beendet' → '🟡'
// sonst     → '⚪'
```

**Verwendung:** `<span>{statusBadge(row.status)}</span>`

---

### 1.7 Hilfsfunktionen (Hooks & Utils)

#### `useSortableData<T>(items, config?)`
```typescript
interface SortConfig { key: string; direction: 'asc' | 'desc'; }

function useSortableData<T>(
  items: T[],
  config?: SortConfig | null
): {
  items: T[];                    // sortierte Items
  requestSort: (key: keyof T | string) => void;
  sortConfig: SortConfig | null;
  getSortIndicator: (key: string) => ' 🔼' | ' 🔽' | null;
}

// Verwendung:
const { items, requestSort, getSortIndicator } = useSortableData(volunteers);
<th onClick={() => requestSort('name')}>Name{getSortIndicator('name')}</th>
```

#### `confirmWithImpact(type, id, entityName)`
```typescript
async function confirmWithImpact(
  type: string,           // z.B. 'volunteer', 'workArea'
  id: number,             // zu löschende ID
  entityName: string      // "Helfer", "Arbeitsbereich" etc.
): Promise<boolean>

// Zeigt Impact-Dialog wenn verknüpfte Daten existieren, sonst einfachen Confirm
```

#### `shadeColor(color, percent)`
```typescript
function shadeColor(color: string, percent: number): string;
// Beispiel: shadeColor('#0d6efd', -30) → '#0947a8' (dunkler)
//           shadeColor('#0d6efd', 30)  → '#5ba4f5' (heller)
```

#### `minToTime(min)` / `timeToMin(t)`
```typescript
function minToTime(min: number): string;   // 540 → '09:00'
function timeToMin(t: string): number;     // '14:30' → 870
```

---

## 2. SelfServiceView (`SelfServiceView.tsx`)

### 2.1 Auth-Overlays (Login/Registrierung)

#### `AuthOverlay` Props
```typescript
interface AuthOverlayProps {
  mode: 'login' | 'register';
  onClose?: () => void;
  clubPrimary: string;    // Vereinsfarbe Header-Gradient
  clubSecondary: string;  // Vereinsfarbe Sekundär-Buttons
}

// Style-Spezifikation:
{
  position: 'fixed',
  inset: 0,
  background: `linear-gradient(135deg, ${clubPrimary}, shadeColor(clubPrimary, -20))`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

// Card-Box (weiße Box in der Mitte):
{
  maxWidth: 480,
  width: '90%',
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
  padding: '40px'
}

// Input-Felder (größere Touch-Targets):
{
  padding: '14px 18px',       // größer als Admin!
  border: '2px solid #e9ecef', // dickerer Border
  borderRadius: 10,
  fontSize: 16                 // größer für mobile Lesbarkeit
}

// Primär-Button (Anmelden/Registrieren):
{
  background: clubPrimary,
  color: '#fff',              // Immer weißer Text auf Vereinsfarbe!
  fontWeight: 600,
  padding: '14px 24px'        // größer als Admin
}

// Sekundär-Button (Zurück zum Login):
{
  background: 'transparent',
  color: '#666',
  fontWeight: 500,
  border: 'none',
  fontSize: 14
}
```

---

### 2.2 Header

#### `SelfServiceHeader` Props
```typescript
interface SelfServiceHeaderProps {
  tournamentName: string;
  userName?: string;         // Optional: "Hallo, Max!"
  clubPrimary: string;
  onMenuToggle?: () => void;
}

// Style:
{
  background: `linear-gradient(135deg, ${clubPrimary}, shadeColor(clubPrimary, -20))`,
  padding: '20px',
  color: '#fff'
}

// Hamburger-Menü (falls onMenuToggle):
{
  width: 40, height: 40,     // Touch-Target ≥ 40px
  cursor: 'pointer'
}
```

---

### 2.3 Tab-Switcher

#### `TabSwitcher` Props
```typescript
interface TabSwitcherProps {
  tabs: Array<{ key: string; label: string }>;
  activeKey: string;
  onChange: (key: string) => void;
  clubSecondary: string;      // Aktiver Tab Farbe
}

// Inaktiver Tab:
{
  background: '#fff',
  color: '#666',
  borderRadius: 8,
  padding: '10px 20px'
}

// Aktiver Tab:
{
  background: clubSecondary,
  color: getContrastColor(clubSecondary),  // hell oder dunkel je nach Kontrast
  fontWeight: 600
}
```

---

### 2.4 Push-Banner

#### `PushBanner` Props
```typescript
interface PushBannerProps {
  onDismiss?: () => void;    // localStorage: pushReminderLastShown
  onActivate?: () => void;   // PWA-Push aktivieren
}

// Style (gelber Warn-Banner):
{
  background: '#fff3cd',
  color: '#664d03',
  padding: '12px 20px',
  fontSize: 14,
  display: 'flex',
  alignItems: 'center',
  gap: 12
}

// Emoji: 🔔 (vor dem Text)
```

---

### 2.5 Schicht-Karten

#### `ShiftCard` Props
```typescript
interface ShiftCardProps {
  shift: Shift;              // aus API
  clubAccent?: string;       // Standard: '#198754'
  onAction?: (shift: Shift) => void;
}

// Container-Card:
{
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  marginBottom: 16,
  borderLeft: '4px solid ${clubAccent}'  // Linker Farbrand!
}

// Inhalt:
{
  padding: '16px'
}

// Zeit-Anzeige:
{
  fontSize: 18,
  fontWeight: 600,
  color: '#212529'
}

// Status-Badge (optional):
{
  background: '#f8f9fa',
  borderRadius: 12,     // pill
  padding: '4px 12px',
  fontSize: 12,
  fontWeight: 600
}
```

---

### 2.6 Fortschrittsbalken

#### `ProgressBar` Props
```typescript
interface ProgressBarProps {
  current: number;       // z.B. gespendete Menge
  target: number;        // Ziel-Menge
  label?: string;        // Optionaler Label-Text
}

// Farbe dynamisch:
{
  color: current === 0 ? '#dc3545' :     // Rot wenn 0
          current < target ? '#ffc107' :   // Gelb wenn unvollständig
          '#198754',                        // Grün wenn fertig
  height: '8px',
  borderRadius: 4
}

// Container:
{
  background: '#e9ecef',
  borderRadius: 4,
  height: 8
}
```

---

### 2.7 Rating-Modal (Schicht bewerten)

#### `RatingModal` Props
```typescript
interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (ratings: { workload: number; organization: number; fun: number; comment: string }) => void;
}

// Stern-Rating:
{
  fontSize: 32,           // Große Sterne für Touch-Targets
  cursor: 'pointer',
  color: '#ffc107'        // Goldene Sterne
}

// Textarea (Kommentar):
{
  padding: '14px 18px',
  border: '2px solid #e9ecef',
  borderRadius: 10,
  fontSize: 16,
  minHeight: 100          // Größer als Admin-Inputs
}
```

---

## 3. Admin-Navigation (App.tsx)

### 3.1 Haupt-Navigation (Level 1)

#### `MainNav` Props
```typescript
interface MainNavProps {
  activeTab: 'spielplan' | 'organisation' | 'stammdaten';
  onChange: (tab: string) => void;
}

// Kontext-Farben pro Tab:
const tabColors = {
  spielplan: '#0d6efd',    // Blau
  organisation: '#198754', // Grün
  stammdaten: '#6c757d'    // Grau
};

// Aktiver Tab:
{
  background: tabColors[activeTab],
  color: '#fff',
  fontWeight: 600,
  padding: '12px 24px',
  borderRadius: 8
}

// Inaktive Tabs:
{
  background: 'transparent',
  color: '#333',
  fontWeight: 500,
  padding: '12px 24px'
}
```

---

### 3.2 Sub-Navigation (Level 2)

#### `SubNav` Props
```typescript
interface SubNavProps {
  items: Array<{ key: string; label: string; icon?: string }>;
  activeKey: string;
  onChange: (key: string) => void;
  contextColor: string;     // Kontext-Farbe des übergeordneten Tabs
}

// Aktiver Sub-Tab:
{
  background: contextColor,
  color: '#fff',
  fontWeight: 600,
  padding: '8px 16px',
  borderRadius: 8
}

// Inaktive Sub-Tabs:
{
  background: '#e9ecef',
  color: '#333',
  fontWeight: 500,
  padding: '8px 16px',
  borderRadius: 8
}
```

---

### 3.3 Kontext-Leiste (Level 1.5)

#### `ContextBar` Props
```typescript
interface ContextBarProps {
  tournament?: Tournament;
  yearGroup?: YearGroup | null;
  onTournamentChange?: (id: number) => void;
  onYearGroupChange?: (id: number | null) => void;
}

// Style:
{
  background: '#f8f9fa',
  padding: '12px 20px',
  borderBottom: '1px solid #e9ecef'
}
```

---

## 4. Admin-Stammdaten-Komponenten (`stammdaten/`)

### 4.1 Vereine-Editor (`Vereine.tsx`)

#### `ClubEditor` Props
```typescript
interface ClubEditorProps {
  club?: Club | null;
  onSave: (data: { name: string; city: string; primaryColor: string; secondaryColor: string }) => void;
  onLogoUpload: (base64: string) => Promise<void>;
}

// Modal-Layout-Reihenfolge (verbindlich!):
// 1. Name/City Inputs
// 2. Logo-Upload-Bereich
// 3. Farbauswahl (NUR wenn Logo hochgeladen → conditional rendering!)

// Logo-Upload:
{
  border: '2px dashed #adb5bd',
  borderRadius: 12,
  padding: '40px',
  textAlign: 'center',
  cursor: 'pointer'
}

// Color-Picker (Pipette):
{
  width: 48, height: 48,   // Größer als Standard-Input
  borderRadius: 12,
  border: 'none',
  cursor: 'pointer'
}
```

---

### 4.2 DB-Management (`DbManagement.tsx`)

#### `DbManagement` Props (keine!)
```typescript
// Keine Props – eigenständige Komponente im Admin-Bereich

// Export-Funktion:
async function exportDB(): Promise<string> {
  // Liest DB als Blob → Base64 → Download-Link
}

// Import-Funktion:
async function importDB(base64: string): Promise<void> {
  // Base64 → Blob → POST /api/admin/db/import
}
```

---

## 5. Admin-Organisation-Komponenten (`organisation/`)

### 5.1 Dienstplan-Akkordeon (`Uebersicht.tsx`)

#### `DienstplanAccordion` Props
```typescript
interface DienstplanAccordionProps {
  days: TournamentDay[];
  adminPrimary?: string;    // Standard: '#198754' (Grün)
}

// Akkordeon-Header pro Tag:
{
  background: '#f8f9fa',
  padding: '16px 20px',
  cursor: 'pointer',
  borderBottom: `3px solid ${adminPrimary}`
}

// Shift-Tabelle im expandierten Bereich:
{
  width: '100%',
  borderCollapse: 'collapse'
}
```

---

### 5.2 Verpflegung-Matrix (`FoodDonationSlots.tsx`)

#### `VerpflegungMatrix` Props
```typescript
interface VerpflegungMatrixProps {
  tournamentId: number;
  yearGroups: YearGroup[];
  foodItems: FoodItem[];
  adminPrimary?: string;    // Standard: '#198754' (Grün)
}

// Matrix-Zelle (wer hat gespendet):
{
  padding: '8px',
  border: '1px solid #e9ecef',
  cursor: 'pointer',
  textAlign: 'center',
  background: '#fff'
}

// Hover-Zustand:
{ background: '#f8f9fa' }
```

---

## 6. Design-Token als CSS-Variablen

**Pflicht:** Alle Magic Numbers/Colors liegen zentral in rontend/src/styles/design-tokens.css und werden nicht inline oder als TypeScript-Konstanten definiert.

`css
/* frontend/src/styles/design-tokens.css */
:root {
  /* Status-Farben */
  --color-success: #198754;
  --color-warning: #ffc107;
  --color-danger: #dc3545;
  --color-info: #0d6efd;

  /* Neutrale Farben */
  --bg-main: #f0f2f5;
  --bg-surface: #ffffff;
  --bg-surface-hover: #f8f9fa;
  --border-color: #e9ecef;
  --border-color-focus: #dee2e6;
  --text-main: #212529;
  --text-muted: #6c757d;

  /* Spacing */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  --spacing-6: 24px;
  --spacing-10: 40px;

  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-pill: 9999px;

  /* Typografie */
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 24px;
  
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

**Verwendung:**
Statt Inline-Styles wie `style={{ padding: '16px' }}` verwende Klassen (`className="btn btn-primary"`) oder in seltenen Fällen CSS-Variablen in Inline-Styles (`style={{ border: '1px solid var(--border-color)' }}`).

---

## 7. Checkliste für neue Komponenten

Bei jeder neuen Komponente prüfen:

| Punkt | Frage |
|-------|-------|
| **Welt-Zuordnung** | Gehört sie zur SelfService- oder Admin-Welt? |
| **Kontext-Farbe** | Welche Farbe aktiviert sie? (Blau/Grün/Grau) |
| **Button-Typ** | Primär (`fontWeight: 600`) oder Sekundär (`fontWeight: 500`)? |
| **Touch-Targets** | Sind alle interaktiven Elemente >= 40x40px? (SelfService!) |
| **Modal-System** | Wird `modal.confirm/alert/form` statt browser-native Dialoge verwendet? |
| **Design-Token** | Werden CSS-Variablen (`var(--spacing-4)`) statt Magic Numbers verwendet? |
| **Vereinsfarben** | Werden sie dynamisch angewendet (SelfService) oder statisch (Admin)? |

---

*Dieses Dokument ist die verbindliche Quelle für Komponenten-Spezifikationen. Bei Unklarheiten gilt diese Spezifikation vor jeder impliziten Konvention.*
