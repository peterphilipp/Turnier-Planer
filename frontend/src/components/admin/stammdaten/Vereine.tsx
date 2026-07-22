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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setClubForm({ name: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' });
    setClubLogo(null);
    setEditingClub(null);
  };

  const deleteClub = async (id: number) => {
    if (!confirm('Verein löschen?')) return;
    await apiDelete(`/api/clubs/${id}`);
    queryClient.invalidateQueries({ queryKey: ['clubs'] });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setClubLogo(base64);
        setClubForm({ ...clubForm, logo: base64 });
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
            {clubLogo && <button onClick={() => { setClubLogo(null); setClubForm({ ...clubForm, logo: '' }); }} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}>X</button>}
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'flex-end', height: 64 }}>
          <button onClick={saveClub} style={{ padding: '10px 20px', background: adminPrimary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: '600', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.15)', height: 42 }}>
            {editingClub ? '💾 Speichern' : '➕ Verein anlegen'}
          </button>
          {editingClub && <button onClick={() => { setEditingClub(null); setClubForm({ name: '', primaryColor: '#0d6efd', secondaryColor: '#6c757d', accentColor: '#198754', logo: '' }); setClubLogo(null); }} style={{ ...btnStyle, background: '#e9ecef', height: 42, marginLeft: 8 }}>Abbrechen</button>}
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
              <button onClick={() => { setEditingClub(club.id); setClubForm({ name: club.name, primaryColor: club.primaryColor, secondaryColor: club.secondaryColor, accentColor: club.accentColor, logo: club.logo || '' }); setClubLogo(club.logo); }} style={{ ...btnStyle, background: '#fff3cd', color: '#856404', border: 'none' }}>✏️</button>
              <button onClick={() => deleteClub(club.id)} style={{ ...btnStyle, background: '#ffe3e3', color: '#dc3545', border: 'none' }}>🗑️</button>
            </div>
          </div>
        ))}
        {clubs.length === 0 && <div style={{ color: '#666', padding: 24 }}>Keine Vereine vorhanden.</div>}
      </div>
    </div>
  );
}
