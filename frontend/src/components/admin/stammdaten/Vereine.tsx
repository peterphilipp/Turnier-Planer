import { useState, useRef } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getClubs, apiPost, apiPut, apiDelete } from '../../../api';
import { btnStyleSecondary, Club } from '../shared';
import EditModal from '../EditModal';

interface GroupedClub { city: string; clubs: Club[]; }

export default function Vereine({ adminPrimary }: { adminPrimary: string }) {
  const queryClient = useQueryClient();
  const { data: clubs = [] } = useQuery<Club[]>({ queryKey: ['clubs'], queryFn: getClubs });
  
  const groupedClubs = ((): GroupedClub[] => {
    const groups = new Map<string, Club[]>();
    for (const club of clubs) {
      const city = club.city || 'Ohne Stadt';
      if (!groups.has(city)) groups.set(city, []);
      groups.get(city)!.push(club);
    }
    return Array.from(groups.entries())
      .map(([city, clubs]) => ({ city, clubs }))
      .sort((a, b) => {
        if (a.city === 'Ohne Stadt') return 1;
        if (b.city === 'Ohne Stadt') return -1;
        return a.city.localeCompare(b.city);
      });
  })();

  // Form state
  const [clubForm, setClubForm] = useState({ name: '', city: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' });
  const [editingClub, setEditingClub] = useState<number | null>(null);
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<{ primary: string; secondary: string; accent: string } | null>(null);
  const [colorOrder, setColorOrder] = useState<('primary' | 'secondary' | 'accent')[]>(['primary', 'secondary', 'accent']);
  const [colorStrategyIndex, setColorStrategyIndex] = useState(0);
  const [analysisCount, setAnalysisCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync extractedColors → clubForm
  if (extractedColors) {
    setClubForm(prev => ({ ...prev, primaryColor: extractedColors.primary, secondaryColor: extractedColors.secondary, accentColor: extractedColors.accent }));
  }

  const swapColors = (posA: number, posB: number) => {
    setColorOrder(prev => { const next = [...prev]; [next[posA], next[posB]] = [next[posB], next[posA]]; return next; });
  };

  const resetAnalysis = () => { setColorStrategyIndex(0); setExtractedColors(null); };

  const saveClub = async () => {
    if (!clubForm.name.trim()) return await modal.alert({ title: 'Hinweis', message: 'Name erforderlich!' });
    const data: { name: string; city?: string | null; primaryColor: string; secondaryColor: string; accentColor: string; logo?: string } = {
      name: clubForm.name, city: clubForm.city || undefined, primaryColor: clubForm.primaryColor, secondaryColor: clubForm.secondaryColor, accentColor: clubForm.accentColor
    };
    if (clubForm.logo) data.logo = clubForm.logo;
    await apiPut(`/api/clubs/${editingClub}`, data);
    queryClient.invalidateQueries({ queryKey: ['clubs'] });
    resetAnalysis(); setClubForm({ name: '', city: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' });
    setClubLogo(null); setEditingClub(null);
  };

  const deleteClub = async (id: number) => {
    if (!(await modal.confirm({ title: 'Verein löschen', message: 'Möchtest du diesen Verein wirklich löschen?', variant: 'danger' }))) return;
    await apiDelete(`/api/clubs/${id}`);
    queryClient.invalidateQueries({ queryKey: ['clubs'] });
  };

  const extractColors = (imgSrc: string, strategyIndex?: number) => {
    try {
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = 100; canvas.height = 100; ctx.drawImage(img, 0, 0, 100, 100);
        const imageData = ctx.getImageData(0, 0, 100, 100).data;
        const strategies = [{ step: 32, skip: 8, minBrightness: 50 }, { step: 64, skip: 16, minBrightness: 80 }, { step: 16, skip: 4, minBrightness: 20 }, { step: 48, skip: 32, minBrightness: 100 }];
        const s = strategyIndex !== undefined ? strategies[strategyIndex % strategies.length] : strategies[0];
        const colorMap: Record<string, number> = {}; let totalPixels = 0;
        for (let i = 0; i < imageData.length; i += s.skip * 4) {
          const r = imageData[i], g = imageData[i + 1], b = imageData[i + 2]; totalPixels++;
          if (r < s.minBrightness && g < s.minBrightness && b < s.minBrightness) continue;
          let qr = Math.round(r / s.step) * s.step, qg = Math.round(g / s.step) * s.step, qb = Math.round(b / s.step) * s.step;
          qr = Math.min(qr, 255); qg = Math.min(qg, 255); qb = Math.min(qb, 255);
          colorMap[`${qr},${qg},${qb}`] = (colorMap[`${qr},${qg},${qb}`] || 0) + 1;
        }
        const sorted = Object.entries(colorMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
        if (sorted.length >= 3) {
          const toHex = (rgb: string) => '#' + rgb.split(',').map(c => parseInt(c).toString(16).padStart(2, '0')).join('');
          setExtractedColors({ primary: toHex(sorted[0][0]), secondary: toHex(sorted[1][0]), accent: toHex(sorted[2][0]) });
          setAnalysisCount(prev => prev + 1);
        } else { modal.alert({ title: 'Hinweis', message: 'Das Logo hat nicht genug verschiedene Farben.' }).catch(() => {}); }
      };
      img.src = imgSrc;
    } catch (err) { modal.alert({ title: 'Fehler', message: 'Farbanalyse fehlgeschlagen: ' + (err as Error).message }).catch(() => {}); }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => { const base64 = reader.result as string; setClubLogo(base64); setColorStrategyIndex(0); setExtractedColors(null); setAnalysisCount(0); setClubForm({ ...clubForm, logo: base64 }); setTimeout(() => extractColors(base64), 100); };
    reader.readAsDataURL(file);
  };

  const openEdit = (club: Club) => {
    resetAnalysis(); setEditingClub(club.id);
    setClubForm({ name: club.name, city: club.city || '', primaryColor: club.primaryColor, secondaryColor: club.secondaryColor, accentColor: club.accentColor, logo: club.logo || '' });
    setClubLogo(club.logo); setColorStrategyIndex(0); setAnalysisCount(0);
  };

  const closeEdit = () => { resetAnalysis(); setEditingClub(null); setClubForm({ name: '', city: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' }); setClubLogo(null); };

  const ColorPicker = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{label}</div>
      <input type="color" value={value} onChange={e => onChange(e.target.value)} style={{ width: 48, height: 36, padding: 0, border: '2px solid #dee2e6', borderRadius: 6, cursor: 'pointer' }} />
    </div>
  );

  return (
    <>
      <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
        <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>🛡️ Vereine & Clubs</h3>
        
        {/* Neue Verein Form */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <input value={clubForm.name} onChange={e => setClubForm({ ...clubForm, name: e.target.value })} placeholder="Vereinsname" style={{ flex: 1, minWidth: 200, padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
          <input value={clubForm.city} onChange={e => setClubForm({ ...clubForm, city: e.target.value })} placeholder="Stadt" style={{ width: 150, padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
          <button onClick={() => { apiPost('/api/clubs', clubForm); queryClient.invalidateQueries({ queryKey: ['clubs'] }); setClubForm({ name: '', city: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' }); }} style={{ padding: '14px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, minHeight: 44, minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 15 }}>
            <span>➕</span><span>Hinzufügen</span>
          </button>
        </div>
      </div>

      {/* Vereinsliste */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {groupedClubs.map(group => (
          <div key={group.city}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: '600', color: '#495057' }}>📍 {group.city} ({group.clubs.length})</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
              {group.clubs.map(club => (
                <div key={club.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: '#fff', border: '1px solid #dee2e6', borderRadius: 10 }}>
                  {club.logo ? <img src={club.logo} alt={club.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'contain' }} /> : <div style={{ width: 48, height: 48, borderRadius: 10, background: club.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>{club.name.charAt(0)}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club.name}</h4>
                    {club.city && <div style={{ fontSize: 12, color: '#6c757d' }}>📍 {club.city}</div>}
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: club.primaryColor }} />
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: club.secondaryColor }} />
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: club.accentColor }} />
                    </div>
                  </div>
                  <button onClick={() => openEdit(club)} style={{ width: 40, height: 40, border: 'none', background: '#fff3cd', color: '#856404', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>✏️</button>
                  <button onClick={() => deleteClub(club.id)} style={{ width: 40, height: 40, border: 'none', background: '#ffe3e3', color: '#dc3545', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🗑️</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingClub && (
        <EditModal title="Verein bearbeiten" onClose={closeEdit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input value={clubForm.name} onChange={e => setClubForm({ ...clubForm, name: e.target.value })} placeholder="Vereinsname" style={{ padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
            <input value={clubForm.city} onChange={e => setClubForm({ ...clubForm, city: e.target.value })} placeholder="Stadt" style={{ padding: '14px 14px', border: '1px solid #dee2e6', borderRadius: 8, fontSize: 16, minHeight: 44 }} />
            
            {/* Farben */}
            <div>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>🎨 Farben</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <ColorPicker label="Pos. 1" value={extractedColors ? extractedColors[colorOrder[0]] : clubForm.primaryColor} onChange={v => { if (extractedColors) setExtractedColors({ ...extractedColors, [colorOrder[0]]: v }); else setClubForm({ ...clubForm, primaryColor: v }); }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button onClick={() => swapColors(0, 1)} title="⇅" style={{ width: 36, height: 28, border: '1px solid #dee2e6', background: '#f8f9fa', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>⇅</button>
                  <button onClick={() => swapColors(0, 2)} title="⇅" style={{ width: 36, height: 28, border: '1px solid #dee2e6', background: '#f8f9fa', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>⇅</button>
                </div>
                <ColorPicker label="Pos. 2" value={extractedColors ? extractedColors[colorOrder[1]] : clubForm.secondaryColor} onChange={v => { if (extractedColors) setExtractedColors({ ...extractedColors, [colorOrder[1]]: v }); else setClubForm({ ...clubForm, secondaryColor: v }); }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <button onClick={() => swapColors(1, 0)} title="⇅" style={{ width: 36, height: 28, border: '1px solid #dee2e6', background: '#f8f9fa', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>⇅</button>
                  <button onClick={() => swapColors(1, 2)} title="⇅" style={{ width: 36, height: 28, border: '1px solid #dee2e6', background: '#f8f9fa', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>⇅</button>
                </div>
                <ColorPicker label="Pos. 3" value={extractedColors ? extractedColors[colorOrder[2]] : clubForm.accentColor} onChange={v => { if (extractedColors) setExtractedColors({ ...extractedColors, [colorOrder[2]]: v }); else setClubForm({ ...clubForm, accentColor: v }); }} />
              </div>
            </div>

            {/* Logo */}
            <div>
              <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Logo</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                {clubLogo ? <img src={clubLogo} alt="Preview" style={{ width: 48, height: 48, borderRadius: 8 }} /> : <div style={{ width: 48, height: 48, background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🛡️</div>}
                <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoUpload} style={{ display: 'none' }} />
                <button onClick={() => fileInputRef.current?.click()} style={{ padding: '12px 16px', border: '1px solid #dee2e6', background: '#fff', borderRadius: 8, cursor: 'pointer', minHeight: 40, minWidth: 100, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 15 }}>
                  <span>📷</span><span>Bild wählen</span>
                </button>
                {clubLogo && <button onClick={() => { setClubLogo(null); setExtractedColors(null); setColorOrder(['primary', 'secondary', 'accent']); }} style={{ padding: '12px 16px', border: 'none', background: '#ffe3e3', color: '#dc3545', borderRadius: 8, cursor: 'pointer', minHeight: 40, minWidth: 60, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 15 }}>✕</button>}
              </div>
            </div>

            {/* Analyse */}
            {clubLogo && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {extractedColors && <button onClick={() => setClubForm({ ...clubForm, primaryColor: extractedColors.primary, secondaryColor: extractedColors.secondary, accentColor: extractedColors.accent })} style={{ padding: '12px 16px', background: '#e7f3ff', color: '#0d6efd', border: 'none', borderRadius: 8, cursor: 'pointer', minHeight: 40, minWidth: 100, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 15 }}>
                  <span>✓</span><span>Übernehmen</span>
                </button>}
                <button onClick={() => { setColorStrategyIndex(prev => prev + 1); extractColors(clubLogo, analysisCount); }} style={{ padding: '12px 16px', background: '#fff3cd', color: '#856404', border: 'none', borderRadius: 8, cursor: 'pointer', minHeight: 40, minWidth: 120, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 15 }}>
                  <span>🔄</span><span>Neu analysieren</span>
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 12, borderTop: '1px solid #e9ecef' }}>
              <button onClick={closeEdit} style={{ ...btnStyleSecondary, border: '1px solid #dee2e6', background: '#fff' }}>Abbrechen</button>
              <button onClick={saveClub} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>💾 Speichern</button>
            </div>
          </div>
        </EditModal>
      )}
    </>
  );
}
