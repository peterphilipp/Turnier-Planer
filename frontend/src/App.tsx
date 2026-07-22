import { useState } from 'react'
import TournamentView from './components/TournamentView'
import SchedulerView from './components/SchedulerView'
import AdminView from './components/AdminView'
import SelfServiceView from './components/SelfServiceView'

type View = 'admin' | 'selfservice'
type AdminTab = 'turnier' | 'admin' | 'dienstplan'

export default function App() {
  const [view, setView] = useState<View>('selfservice')
  const [activeTab, setActiveTab] = useState<AdminTab>('turnier')

  if (view === 'selfservice') {
    return (
      <div>
        <SelfServiceView />
        <div style={{ textAlign: 'center', padding: 20 }}>
          <button
            onClick={() => setView('admin')}
            style={{
              padding: '8px 16px',
              background: '#e9ecef',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              color: '#666'
            }}
          >
            ⚙️ Admin-Bereich
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0 }}>⚽ Turnierplaner – Admin</h1>
        <button
          onClick={() => setView('selfservice')}
          style={{
            padding: '8px 16px',
            background: '#6c757d',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 13
          }}
        >
          ← Helfer-Bereich
        </button>
      </div>

      <nav style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {(['turnier', 'admin', 'dienstplan'] as AdminTab[]).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            style={{ padding: '8px 16px', cursor: 'pointer', background: activeTab===t ? '#0d6efd' : '#e9ecef', color: activeTab===t ? '#fff' : '#000', border: 'none', borderRadius: 6 }}>
            {t === 'turnier' ? '🏆 Turnier & Spielplan'
             : t === 'admin' ? '⚙️ Admin – Stamm Daten'
             : '📋 Job-Slots'}
          </button>
        ))}
      </nav>

      <main>
        {activeTab === 'turnier' && <TournamentView />}
        {activeTab === 'admin' && <AdminView />}
        {activeTab === 'dienstplan' && <SchedulerView />}
      </main>
    </div>
  )
}
