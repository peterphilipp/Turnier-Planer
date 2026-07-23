import { useState, useRef, useEffect } from 'react';
import { modal } from '../Modal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getClubs, apiPost, apiPut, apiDelete } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, shadeColor, Club } from '../shared';

interface GroupedClub { city: string; clubs: Club[]; }

export default function Vereine({ adminPrimary }: { adminPrimary: string }) {
  const queryClient = useQueryClient();
  const { data: clubs = [] } = useQuery<Club[]>({ queryKey: ['clubs'], queryFn: getClubs });
  
  // Nach Stadt gruppieren und sortieren
  const groupedClubs = ((): GroupedClub[] => {
    const groups = new Map<string, Club[]>();
    for (const club of clubs) {
      const city = club.city || 'Ohne Stadt';
      if (!groups.has(city)) groups.set(city, []);
      groups.get(city)!.push(club);
    }
    // Sortieren: "Ohne Stadt" zuletzt, dann alphabetisch
    return Array.from(groups.entries())
      .map(([city, clubs]) => ({ city, clubs }))
      .sort((a, b) => {
        if (a.city === 'Ohne Stadt') return 1;
        if (b.city === 'Ohne Stadt') return -1;
        return a.city.localeCompare(b.city);
      });
  })();
  
  const [clubForm, setClubForm] = useState({ name: '', city: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' });
  const [editingClub, setEditingClub] = useState<number | null>(null);
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<{ primary: string; secondary: string; accent: string } | null>(null);
  // Temporäre Farbreihenfolge für Tausch-Funktion
  const [colorOrder, setColorOrder] = useState<('primary' | 'secondary' | 'accent')[]>(['primary', 'secondary', 'accent']);
  const [colorStrategyIndex, setColorStrategyIndex] = useState(0);
  const [analysisCount, setAnalysisCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Sync extractedColors → clubForm wenn sich Farben ändern
  useEffect(() => {
    if (extractedColors) {
      setClubForm(prev => ({
        ...prev,
        primaryColor: extractedColors.primary,
        secondaryColor: extractedColors.secondary,
        accentColor: extractedColors.accent
      }));
    }
  }, [extractedColors]);

  // Farben zwischen Positionen tauschen (1↔2, 2↔3, 1↔3)
  const swapColors = (posA: number, posB: number) => {
    setColorOrder(prev => {
      const next = [...prev];
      [next[posA], next[posB]] = [next[posB], next[posA]];
      return next;
    });
  };

  // Reset der Analyse-Strategie
  const resetAnalysis = () => {
    setColorStrategyIndex(0);
    setExtractedColors(null);
  };

  const saveClub = async () => {
    if (!clubForm.name.trim()) return await modal.alert({ title: 'Hinweis', message: 'Name erforderlich!' });
    
    const data: { name: string; city?: string | null; primaryColor: string; secondaryColor: string; accentColor: string; logo?: string } = {
      name: clubForm.name,
      city: clubForm.city || undefined,
      primaryColor: clubForm.primaryColor,
      secondaryColor: clubForm.secondaryColor,
      accentColor: clubForm.accentColor
    };
    if (clubForm.logo) data.logo = clubForm.logo;
    if (editingClub) {
      await apiPut(`/api/clubs/${editingClub}`, data);
    } else {
      await apiPost('/api/clubs', data);
    }
    queryClient.invalidateQueries({ queryKey: ['clubs'] });
    resetAnalysis();
    setClubForm({ name: '', city: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' });
    setClubLogo(null);
    setEditingClub(null);
  };

  const deleteClub = async (id: number) => {
    if (!(await modal.confirm({ title: 'Verein löschen', message: 'Möchtest du diesen Verein wirklich löschen?', variant: 'danger' }))) return;
    await apiDelete(`/api/clubs/${id}`);
    queryClient.invalidateQueries({ queryKey: ['clubs'] });
  };

  // Verschiedene Quantisierungs-Strategien für bessere Ergebnisse
  const strategies = [
    { step: 32, skip: 8, minBrightness: 50, name: 'Standard' },
    { step: 64, skip: 16, minBrightness: 80, name: 'Grob (weniger Farben)' },
    { step: 16, skip: 4, minBrightness: 20, name: 'Fein (mehr Nuancen)' },
    { step: 48, skip: 32, minBrightness: 100, name: 'Extrem grob' },
  ];

  // Canvas-basierte Farbanalyse mit mehreren Strategien
  const extractColors = (imgSrc: string, strategyIndex?: number) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { console.error('Kein Canvas Context'); return; }
        
        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(img, 0, 0, 100, 100);
        const imageData = ctx.getImageData(0, 0, 100, 100).data;

        // Verschiedene Quantisierungs-Strategien für bessere Ergebnisse
        const strategies = [
          { step: 32, skip: 8, minBrightness: 50, name: 'Standard' },
          { step: 64, skip: 16, minBrightness: 80, name: 'Grob (weniger Farben)' },
          { step: 16, skip: 4, minBrightness: 20, name: 'Fein (mehr Nuancen)' },
          { step: 48, skip: 32, minBrightness: 100, name: 'Extrem grob' },
        ];

        const s = strategyIndex !== undefined ? strategies[strategyIndex % strategies.length] : strategies[0];

        // Farben sammeln mit gewählter Strategie
        const colorMap: Record<string, number> = {};
        let totalPixels = 0;
        for (let i = 0; i < imageData.length; i += s.skip * 4) {
          const r = imageData[i];
          const g = imageData[i + 1];
          const b = imageData[i + 2];
          totalPixels++;
          
          // Helle Farben bevorzugen
          if (r < s.minBrightness && g < s.minBrightness && b < s.minBrightness) continue;
          
          let qr = Math.round(r / s.step) * s.step;
          let qg = Math.round(g / s.step) * s.step;
          let qb = Math.round(b / s.step) * s.step;
          qr = Math.min(qr, 255); qg = Math.min(qg, 255); qb = Math.min(qb, 255);
          
          const key = `${qr},${qg},${qb}`;
          colorMap[key] = (colorMap[key] || 0) + 1;
        }

        // Sortiert nach Häufigkeit, Top 3
        const sorted = Object.entries(colorMap).sort((a, b) => b[1] - a[1]).slice(0, 3);

        if (sorted.length >= 3) {
          const toHex = (rgb: string) => '#' + rgb.split(',').map(c => parseInt(c).toString(16).padStart(2, '0')).join('');
          const result = { primary: toHex(sorted[0][0]), secondary: toHex(sorted[1][0]), accent: toHex(sorted[2][0]) };
          setExtractedColors(result);
          setAnalysisCount(prev => prev + 1);
        } else {
          modal.alert({ title: 'Hinweis', message: 'Das Logo hat nicht genug verschiedene Farben für eine Analyse.' }).catch(() => {});
        }
      };

      img.onerror = () => {
        modal.alert({ title: 'Fehler', message: 'Bild konnte nicht verarbeitet werden.' }).catch(() => {});
      };
      
      img.src = imgSrc;
    } catch (err) {
      modal.alert({ title: 'Fehler', message: 'Farbanalyse konnte nicht durchgeführt werden: ' + (err as Error).message }).catch(() => {});
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setClubLogo(base64);
      setColorStrategyIndex(0);
      setExtractedColors(null);
      setAnalysisCount(0);
      setClubForm({ ...clubForm, logo: base64 });
      setTimeout(() => {
        extractColors(base64);
      }, 100);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      {/* Haupt-Container */}
      <div ref={formRef} style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>🛡️ Vereine & Clubs</h3>
      
      {/* Vereinsname + Stadt */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold', display: 'block', marginBottom: 4 }}>Vereinsname</label>
          <input value={clubForm.name} onChange={e => setClubForm({ ...clubForm, name: e.target.value })} placeholder="TSV Musterhausen" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold', display: 'block', marginBottom: 4 }}>Stadt</label>
          <input value={clubForm.city} onChange={e => setClubForm({ ...clubForm, city: e.target.value })} placeholder="Musterstadt" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* Alle 3 Farben mit Tausch-Funktion */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold', display: 'block', marginBottom: 8 }}>🎨 Farbkombination (Positionen tauschbar)</label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Position 1 */}
            <div style={{ textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Pos. 1</div>
              <input
                type="color"
                value={extractedColors ? extractedColors[colorOrder[0]] : clubForm.primaryColor}
                onChange={e => {
                  if (extractedColors) {
                    const key = colorOrder[0];
                    setExtractedColors({ ...extractedColors, [key]: e.target.value });
                  } else {
                    setClubForm(prev => ({ ...prev, primaryColor: e.target.value }));
                  }
                }}
                style={{ width: 48, height: 36, padding: 0, border: '2px solid #dee2e6', borderRadius: 6, cursor: 'pointer' }}
              />
            </div>

            {/* Tausch-Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={() => swapColors(0, 1)} title="Pos. 1 ↔ Pos. 2" style={{ ...btnStyle, background: '#f8f9fa', border: '1px solid #dee2e6', fontSize: 14, padding: '2px 6px', cursor: 'pointer' }}>⇅</button>
              <button onClick={() => swapColors(0, 2)} title="Pos. 1 ↔ Pos. 3" style={{ ...btnStyle, background: '#f8f9fa', border: '1px solid #dee2e6', fontSize: 14, padding: '2px 6px', cursor: 'pointer' }}>⇅</button>
            </div>

            {/* Position 2 */}
            <div style={{ textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Pos. 2</div>
              <input
                type="color"
                value={extractedColors ? extractedColors[colorOrder[1]] : clubForm.secondaryColor}
                onChange={e => {
                  if (extractedColors) {
                    const key = colorOrder[1];
                    setExtractedColors({ ...extractedColors, [key]: e.target.value });
                  } else {
                    setClubForm(prev => ({ ...prev, secondaryColor: e.target.value }));
                  }
                }}
                style={{ width: 48, height: 36, padding: 0, border: '2px solid #dee2e6', borderRadius: 6, cursor: 'pointer' }}
              />
            </div>

            {/* Tausch-Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <button onClick={() => swapColors(1, 0)} title="Pos. 2 ↔ Pos. 1" style={{ ...btnStyle, background: '#f8f9fa', border: '1px solid #dee2e6', fontSize: 14, padding: '2px 6px', cursor: 'pointer' }}>⇅</button>
              <button onClick={() => swapColors(1, 2)} title="Pos. 2 ↔ Pos. 3" style={{ ...btnStyle, background: '#f8f9fa', border: '1px solid #dee2e6', fontSize: 14, padding: '2px 6px', cursor: 'pointer' }}>⇅</button>
            </div>

            {/* Position 3 */}
            <div style={{ textAlign: 'center', minWidth: 70 }}>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Pos. 3</div>
              <input
                type="color"
                value={extractedColors ? extractedColors[colorOrder[2]] : clubForm.accentColor}
                onChange={e => {
                  if (extractedColors) {
                    const key = colorOrder[2];
                    setExtractedColors({ ...extractedColors, [key]: e.target.value });
                  } else {
                    setClubForm(prev => ({ ...prev, accentColor: e.target.value }));
                  }
                }}
                style={{ width: 48, height: 36, padding: 0, border: '2px solid #dee2e6', borderRadius: 6, cursor: 'pointer' }}
              />
            </div>

            {/* Analyse-Steuerung */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 8 }}>
              {extractedColors && (
                <button onClick={() => {
                  setClubForm({ ...clubForm, primaryColor: extractedColors.primary, secondaryColor: extractedColors.secondary, accentColor: extractedColors.accent });
                }} style={{ ...btnStyle, background: '#e7f3ff', color: '#0d6efd', border: 'none', fontSize: 12, padding: '4px 10px' }}>
                  ✓ Übernehmen
                </button>
              )}
              <button onClick={async () => {
                if (!clubLogo) { await modal.alert({ title: 'Hinweis', message: 'Bitte zuerst ein Logo hochladen!' }); return; }
                const next = analysisCount === 0 ? 0 : colorStrategyIndex + 1;
                setColorStrategyIndex(next);
                extractColors(clubLogo, next);
              }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', border: 'none', fontSize: 12, padding: '4px 10px' }}>
                {analysisCount === 0 ? '🔄 Logo analysieren' : `🔄 Strategie ${colorStrategyIndex + 1} → ${Math.min(colorStrategyIndex + 2, 4)}`}
              </button>
            </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Logo</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            {clubLogo ? (
              <img src={clubLogo} alt="Preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'contain', border: '1px solid #dee2e6', background: '#fff' }} />
            ) : (
              <div style={{ width: 48, height: 48, borderRadius: 8, background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 20 }}>🛡️</div>
            )}
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoUpload} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} style={{ ...btnStyle, background: '#fff' }}>Bild wählen</button>
            {clubLogo && <button onClick={() => { setClubLogo(null); setClubForm({ ...clubForm, logo: '' }); setExtractedColors(null); setColorOrder(['primary', 'secondary', 'accent']); }} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}>✕</button>}
        </div>
      </div>

      {/* Speichern/Abbrechen */}
      <div style={{ display: 'flex', gap: 10, marginTop: 16, paddingTop: 12, borderTop: '1px solid #dee2e6' }}>
        <button onClick={saveClub} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', height: 42 }}>
          {editingClub ? '💾 Speichern' : '➕ Verein anlegen'}
        </button>
        {editingClub && <button onClick={() => { resetAnalysis(); setEditingClub(null); setClubForm({ name: '', city: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' }); setClubLogo(null); }} style={{ ...btnStyle, background: '#e9ecef', height: 42 }}>Abbrechen</button>}
        {editingClub && <div style={{ fontSize: 13, color: '#6c757d', marginTop: 8 }}>✏️ Bearbeite: <strong>{clubForm.name}</strong></div>}
      </div>
    </div>

    {/* Vereinsliste nach Stadt gruppiert */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {groupedClubs.map(group => (
          <div key={group.city}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 16, fontWeight: '600', color: '#495057', borderBottom: '2px solid #dee2e6', paddingBottom: 8 }}>
              📍 {group.city} <span style={{ fontSize: 13, color: '#6c757d' }}>({group.clubs.length})</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {group.clubs.map(club => (
                <div key={club.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: '#fff', border: '1px solid #dee2e6', borderRadius: 10 }}>
                  {club.logo ? (
                    <img src={club.logo} alt={club.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'contain', background: '#f8f9fa' }} />
                  ) : (
                    <div style={{ width: 48, height: 48, borderRadius: 10, background: club.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
                      {club.name.charAt(0)}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: '0 0 2px 0', fontSize: 15, color: '#212529', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{club.name}</h4>
                    {club.city && <div style={{ fontSize: 12, color: '#6c757d' }}>📍 {club.city}</div>}
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: club.primaryColor, display: 'inline-block' }}></span>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: club.secondaryColor, display: 'inline-block' }}></span>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: club.accentColor, display: 'inline-block' }}></span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => {
                      resetAnalysis();
                      setEditingClub(club.id);
                      setClubForm({ name: club.name, city: club.city || '', primaryColor: club.primaryColor, secondaryColor: club.secondaryColor, accentColor: club.accentColor, logo: club.logo || '' });
                      setClubLogo(club.logo);
                      setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                    }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', border: 'none', padding: '4px 8px' }}>✏️</button>
                    <button onClick={() => deleteClub(club.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none', padding: '4px 8px' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {clubs.length === 0 && <div style={{ color: '#666', padding: 24 }}>Keine Vereine vorhanden.</div>}
      </div>
    </>
  );
}
