import { useState } from 'react';
import { modal } from '../Modal';

interface DumpResponse {
  success: boolean;
  databaseSize: number;
  timestamp: string;
  database: string;
}

export default function DbManagement() {
  const [loading, setLoading] = useState(false);
  const [dumpInfo, setDumpInfo] = useState<{ size: number; timestamp: string } | null>(null);
  const [importing, setImporting] = useState(false);

  /** Datenbank exportieren (Download als .db file) */
  const handleExport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/db/dump', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data: DumpResponse = await response.json();

      if (!data.success || !data.database) {
        throw new Error('Export fehlgeschlagen');
      }

      // Base64 → Blob → Download
      const byteCharacters = atob(data.database);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `turnier-planer-db-${new Date().toISOString().split('T')[0]}.db`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setDumpInfo({ size: data.databaseSize, timestamp: data.timestamp });
      await modal.alert({
        title: 'Export erfolgreich',
        message: `Datenbank exportiert (${(data.databaseSize / 1024).toFixed(1)} KB) am ${new Date(data.timestamp).toLocaleString('de-DE')}`
      });
    } catch (error) {
      await modal.alert({
        title: 'Export fehlgeschlagen',
        message: String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  /** Datenbank importieren (Upload .db file) */
  const handleImport = async (file: File) => {
    setImporting(true);
    try {
      // Datei als Base64 lesen
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Data URL entfernen (nur Base64 behalten)
      const base64Data = base64.split(',')[1];

      const response = await fetch('/api/admin/db/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ database: base64Data })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      await modal.alert({
        title: 'Import erfolgreich',
        message: `Datenbank importiert (${(result.databaseSize / 1024).toFixed(1)} KB).\n\nEin Backup wurde erstellt unter:\n${result.backupPath || '(siehe Logs)'}`
      });

      // Seite neu laden um neue DB zu aktivieren
      window.location.reload();
    } catch (error) {
      await modal.alert({
        title: 'Import fehlgeschlagen',
        message: String(error)
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 24 }}>
      <h2 style={{ marginBottom: 24, color: '#333' }}>🗄️ Datenbank-Management</h2>

      {/* EXPORT */}
      <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 20, marginBottom: 24, border: '1px solid #dee2e6' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#495057' }}>📤 Datenbank exportieren</h3>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
          Erstellt einen vollständigen Dump der SQLite-Datenbank als Download.
          <br />Nützlich für Backups oder Sync mit Testumgebungen.
        </p>

        {dumpInfo && (
          <div style={{ background: '#d1e7dd', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
            ✅ Letzter Export: {(dumpInfo.size / 1024).toFixed(1)} KB am {new Date(dumpInfo.timestamp).toLocaleString('de-DE')}
          </div>
        )}

        <button
          onClick={handleExport}
          disabled={loading}
          style={{
            padding: '12px 24px',
            background: loading ? '#6c757d' : '#0d6efd',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: 14,
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? 'Exportiere...' : '📥 Datenbank herunterladen'}
        </button>
      </div>

      {/* IMPORT */}
      <div style={{ background: '#fff3cd', borderRadius: 12, padding: 20, border: '1px solid #ffc107' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16, color: '#664d03' }}>📥 Datenbank importieren</h3>
        <p style={{ fontSize: 14, color: '#664d03', marginBottom: 16 }}>
          ⚠️ Achtung: Die aktuelle Datenbank wird durch den Import überschrieben!
          <br />Ein Backup wird automatisch erstellt.
        </p>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="file"
            accept=".db,.sqlite"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) {
                const confirmed = await modal.confirm({
                  title: 'Import bestätigen',
                  message: `Möchtest du "${file.name}" importieren?\n\nDie aktuelle Datenbank wird überschrieben!`,
                  variant: 'warning'
                });

                if (confirmed) {
                  await handleImport(file);
                }
              }
            }}
            disabled={importing}
            style={{ flex: 1, padding: 10, border: '2px dashed #ffc107', borderRadius: 8, cursor: importing ? 'not-allowed' : 'pointer' }}
          />
          {importing && (
            <span style={{ fontSize: 14, color: '#664d03' }}>Importiere...</span>
          )}
        </div>
      </div>

      {/* HINWEIS */}
      <div style={{ marginTop: 24, padding: 16, background: '#e7f3ff', borderRadius: 8, fontSize: 13, color: '#004085' }}>
        💡 <strong>Tipp:</strong> Für regelmäßige Syncs zwischen Produktion und Test kannst du den Export herunterladen und die Datei manuell in die Testumgebung kopieren.
      </div>
    </div>
  );
}
