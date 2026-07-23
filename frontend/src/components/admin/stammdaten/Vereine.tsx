import { useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getClubs, apiPost, apiPut, apiDelete } from '../../../api';
import { tdStyle, thStyle, btnStyle, inputStyle, shadeColor, Club } from '../shared';

export default function Vereine({ adminPrimary }: { adminPrimary: string }) {
  const queryClient = useQueryClient();
  const { data: clubs = [] } = useQuery<Club[]>({ queryKey: ['clubs'], queryFn: getClubs });
  
  const [clubForm, setClubForm] = useState({ name: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' });
  const [editingClub, setEditingClub] = useState<number | null>(null);
  const [clubLogo, setClubLogo] = useState<string | null>(null);
  const [extractedColors, setExtractedColors] = useState<{ primary: string; secondary: string; accent: string } | null>(null);
  const [colorStrategyIndex, setColorStrategyIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset der Analyse-Strategie
  const resetAnalysis = () => {
    setColorStrategyIndex(0);
    setExtractedColors(null);
  };

  const saveClub = async () => {
    if (!clubForm.name.trim()) return alert('Name erforderlich!');
    const data: { name: string; primaryColor: string; secondaryColor: string; accentColor: string; logo?: string } = { name: clubForm.name, primaryColor: clubForm.primaryColor, secondaryColor: clubForm.secondaryColor, accentColor: clubForm.accentColor };
    if (clubForm.logo) data.logo = clubForm.logo;
    if (editingClub) {
      await apiPut(`/api/clubs/${editingClub}`, data);
    } else {
      await apiPost('/api/clubs', data);
    }
    queryClient.invalidateQueries({ queryKey: ['clubs'] });
    resetAnalysis();
    setClubForm({ name: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' });
    setClubLogo(null);
    setEditingClub(null);
  };

  const deleteClub = async (id: number) => {
    if (!confirm('Verein löschen?')) return;
    await apiDelete(`/api/clubs/${id}`);
    queryClient.invalidateQueries({ queryKey: ['clubs'] });
  };

  // Canvas-basierte Farbanalyse mit mehreren Strategien
  const extractColors = (imgSrc: string, strategy?: number) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = 100;
      canvas.height = 100;
      ctx.drawImage(img, 0, 0, 100, 100);
      const data = ctx.getImageData(0, 0, 100, 100).data;

      // Verschiedene Quantisierungs-Strategien für bessere Ergebnisse
      const strategies = [
        { step: 32, skip: 16, minBrightness: 40 },
        { step: 24, skip: 8, minBrightness: 30 },
        { step: 48, skip: 32, minBrightness: 50 },
        { step: 16, skip: 4, minBrightness: 20 },
      ];

      const s = strategy !== undefined ? strategies[strategy % strategies.length] : strategies[0];

      // Farben sammeln mit gewählter Strategie
      const colorMap: Record<string, number> = {};
      for (let i = 0; i < data.length; i += s.skip) {
        let r = Math.round(data[i] / s.step) * s.step;
        let g = Math.round(data[i + 1] / s.step) * s.step;
        let b = Math.round(data[i + 2] / s.step) * s.step;
        if (r < s.minBrightness && g < s.minBrightness && b < s.minBrightness) continue;
        r = Math.min(r, 255); g = Math.min(g, 255); b = Math.min(b, 255);
        const key = `${r},${g},${b}`;
        colorMap[key] = (colorMap[key] || 0) + 1;
      }

      // Sortiert nach Häufigkeit, Top 3
      const sorted = Object.entries(colorMap).sort((a, b) => b[1] - a[1]).slice(0, 3);
      if (sorted.length >= 3) {
        const toHex = (rgb: string) => '#' + rgb.split(',').map(c => parseInt(c).toString(16).padStart(2, '0')).join('');
        setExtractedColors({ primary: toHex(sorted[0][0]), secondary: toHex(sorted[1][0]), accent: toHex(sorted[2][0]) });
      }
    };
    img.src = imgSrc;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setClubLogo(base64);
        setColorStrategyIndex(0);
        setExtractedColors(null);
        setClubForm({ ...clubForm, logo: base64 });
        extractColors(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ background: '#fff', padding: 24, borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', border: '1px solid #e9ecef' }}>
      <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: '600', color: '#212529' }}>🛡️ Vereine & Clubs</h3>
      
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', background: '#f8f9fa', padding: 16, borderRadius: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 200 }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Vereinsname</label>
          <input value={clubForm.name} onChange={e => setClubForm({ ...clubForm, name: e.target.value })} placeholder="TSV Musterhausen" style={inputStyle} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Primärfarbe</label>
          <input type="color" value={clubForm.primaryColor} onChange={e => setClubForm({ ...clubForm, primaryColor: e.target.value, secondaryColor: shadeColor(e.target.value, -20) })} style={{ width: 60, height: 42, padding: 0, border: '1px solid #dee2e6', borderRadius: 8, cursor: 'pointer' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>Logo</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {clubLogo ? (
              <img src={clubLogo} alt="Preview" style={{ width: 42, height: 42, borderRadius: 8, objectFit: 'contain', border: '1px solid #dee2e6', background: '#fff' }} />
            ) : (
              <div style={{ width: 42, height: 42, borderRadius: 8, background: '#e9ecef', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: 20 }}>🛡️</div>
            )}
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleLogoUpload} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} style={{ ...btnStyle, background: '#fff' }}>Bild wählen</button>
            {clubLogo && <button onClick={() => { setClubLogo(null); setClubForm({ ...clubForm, logo: '' }); setExtractedColors(null); }} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}>X</button>}
          </div>
        </div>

        {/* Extrahierte Farben */}
        {extractedColors && clubLogo && (
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>🎨 Vorschlag (Logo-Analyse)</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
              {(['primary', 'secondary', 'accent'] as const).map(key => (
                <div key={key} style={{ textAlign: 'center' }}>
                  <input
                    type="color"
                    value={clubForm[key === 'primary' ? 'primaryColor' : key === 'secondary' ? 'secondaryColor' : 'accentColor']}
                    onChange={e => setClubForm({ ...clubForm, [key === 'primary' ? 'primaryColor' : key === 'secondary' ? 'secondaryColor' : 'accentColor']: e.target.value })}
                    style={{ width: 36, height: 28, padding: 0, border: '1px solid #dee2e6', borderRadius: 4, cursor: 'pointer' }}
                  />
                </div>
              ))}
              <button onClick={() => {
                setClubForm({ ...clubForm, primaryColor: extractedColors.primary, secondaryColor: extractedColors.secondary, accentColor: extractedColors.accent });
              }} style={{ ...btnStyle, background: '#e7f3ff', color: '#0d6efd', border: 'none', fontSize: 12, padding: '4px 10px' }}>
                ✓ Übernehmen
              </button>
              <button onClick={() => {
                if (clubLogo) {
                  const next = colorStrategyIndex + 1;
                  setColorStrategyIndex(next);
                  extractColors(clubLogo, next);
                }
              }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', border: 'none', fontSize: 12, padding: '4px 10px' }}>
                🔄 Neu analysieren
              </button>
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 64 }}>
          <button onClick={saveClub} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', height: 42 }}>
            {editingClub ? '💾 Speichern' : '➕ Verein anlegen'}
          </button>
          {editingClub && <button onClick={() => { resetAnalysis(); setEditingClub(null); setClubForm({ name: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' }); setClubLogo(null); }} style={{ ...btnStyle, background: '#e9ecef', height: 42, marginLeft: 8 }}>Abbrechen</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {clubs.map(club => (
          <div key={club.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 16, background: '#fff', border: '1px solid #dee2e6', borderRadius: 12 }}>
            {club.logo ? (
              <img src={club.logo} alt={club.name} style={{ width: 60, height: 60, borderRadius: 12, objectFit: 'contain', background: '#f8f9fa' }} />
            ) : (
              <div style={{ width: 60, height: 60, borderRadius: 12, background: club.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 'bold' }}>
                {club.name.charAt(0)}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 4px 0', fontSize: 16, color: '#212529' }}>{club.name}</h4>
              <div style={{ display: 'flex', gap: 6 }}>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: club.primaryColor, display: 'inline-block' }}></span>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: club.secondaryColor, display: 'inline-block' }}></span>
                <span style={{ width: 16, height: 16, borderRadius: '50%', background: club.accentColor, display: 'inline-block' }}></span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={() => { resetAnalysis(); setEditingClub(club.id); setClubForm({ name: club.name, primaryColor: club.primaryColor, secondaryColor: club.secondaryColor, accentColor: club.accentColor, logo: club.logo || '' }); setClubLogo(club.logo); if (club.logo) extractColors(club.logo); }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', border: 'none' }}>✏️</button>
              <button onClick={() => deleteClub(club.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}>🗑️</button>
            </div>
          </div>
        ))}
        {clubs.length === 0 && <div style={{ color: '#666', padding: 24 }}>Keine Vereine vorhanden.</div>}
      </div>
    </div>
  );
}
