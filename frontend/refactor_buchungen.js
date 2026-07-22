import fs from 'fs';

const path = 'src/components/admin/organisation/Buchungen.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Change function signature
content = content.replace(
  `export default function SchedulerView() {`,
  `export default function Buchungen({ selectedTournament, adminPrimary }: { selectedTournament: number | null, adminPrimary: string }) {`
);

// 2. Remove state for activeTab and selectedTournament
content = content.replace(`const [activeTab, setActiveTab] = useState<SchedulerTab>('dienstplan');\n`, '');
content = content.replace(`const [selectedTournament, setSelectedTournament] = useState<number | null>(null);\n`, '');

// 3. Remove useEffect for selectedTournament
content = content.replace(
  `  useEffect(() => {
    const active = tournaments.find(t => t.status === 'aktiv');
    if (active && !selectedTournament) {
      setSelectedTournament(active.id);
    }
  }, [tournaments, selectedTournament]);`,
  ``
);

// 4. Remove tabs type
content = content.replace(`type SchedulerTab = 'dienstplan' | 'helfer';\n`, '');

// 5. Remove Turnier-Auswahl & Tabs in JSX
// Find start of Turnier-Auswahl
const startAuswahl = content.indexOf(`{/* Turnier-Auswahl */}`);
const startTabs = content.indexOf(`{/* Tabs */}`);
const endTabs = content.indexOf(`{activeTab === 'dienstplan' && selectedTournament && (`);

if (startAuswahl !== -1 && endTabs !== -1) {
  content = content.substring(0, startAuswahl) + content.substring(endTabs);
}

// 6. Replace `{activeTab === 'dienstplan' && selectedTournament && (` with `if (!selectedTournament) return <div style={{ padding: 24, background: '#fff', borderRadius: 16 }}>Bitte wähle ein Turnier aus.</div>; return (`
content = content.replace(`{activeTab === 'dienstplan' && selectedTournament && (`, `{!selectedTournament ? <div style={{ padding: 24, background: '#fff', borderRadius: 16 }}>Bitte wähle zunächst oben ein Turnier aus.</div> : (`);

// 7. Remove the helfer tab section
const startHelfer = content.indexOf(`{activeTab === 'helfer' && (`);
const startEditModal = content.indexOf(`{/* Edit Modal */}`);

if (startHelfer !== -1 && startEditModal !== -1) {
  content = content.substring(0, startHelfer) + content.substring(startEditModal);
}

// Add the AdminView shared types
content = content.replace(`interface Tournament { id: number; name: string; startDate: string; endDate: string; status: string; }`, `import { Tournament, Shift, Zeitslot, VolunteerShift, Volunteer, Arbeitsbereich } from '../shared';`);
content = content.replace(/interface Volunteer \{[^}]+\}\n?/g, '');
content = content.replace(/interface Shift \{[^}]+\}\n?/g, '');
content = content.replace(/interface VolunteerShift \{[^}]+\}\n?/g, '');
content = content.replace(/interface Arbeitsbereich \{[^}]+\}\n?/g, '');
content = content.replace(/interface Zeitslot \{[^}]+\}\n?/g, '');

// Also loadedArbeitsbereiche is called arbeitsbereiche in AdminView
content = content.replace(/loadedArbeitsbereiche/g, 'arbeitsbereiche');

// Add getArbeitsbereiche to api import
content = content.replace(`getVolunteerShifts, apiPost,`, `getVolunteerShifts, getArbeitsbereiche, apiPost,`);
content = content.replace(
  `const { data: zeitSlots = [] } = useQuery<Zeitslot[]>({ queryKey: ['zeitSlots'], queryFn: getZeitSlots });`,
  `const { data: zeitSlots = [] } = useQuery<Zeitslot[]>({ queryKey: ['zeitSlots'], queryFn: getZeitSlots });\n  const { data: arbeitsbereiche = [] } = useQuery<Arbeitsbereich[]>({ queryKey: ['arbeitsbereiche'], queryFn: getArbeitsbereiche });`
);

fs.writeFileSync(path, content);
console.log('Done refactoring Buchungen.');
