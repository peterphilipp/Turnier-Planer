import { useState } from 'react';

export default function Privacy() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 20, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: '#333', borderBottom: '2px solid #0d6efd', paddingBottom: 12 }}>Datenschutzerklärung</h1>

      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
        Stand: Juli 2025 &nbsp;|&nbsp; Verantwortlicher: TSV Holm
      </p>

      {[
        {
          id: '1',
          title: '1. Verantwortlicher',
          content: `Verantwortlich für die Datenverarbeitung ist der TSV Holm. Bei Fragen zur Datenspeicherung kontaktieren Sie uns bitte über die Vereinsleitung.`
        },
        {
          id: '2',
          title: '2. Erhobene Daten und Zweck',
          content: `Die Anwendung verarbeitet folgende personenbezogene Daten:

• Name, E-Mail-Adresse, Telefonnummer – zur Erstellung des Helfer-Accounts und Koordination der Dienste (Art. 6 Abs. 1 lit. b DSGVO)
• Kindername und Geburtsjahr – zur zielgruppengerechten Zuweisung von Lebensmittel-Spenden (Art. 9 Abs. 2 lit. a DSGVO – ausdrückliche Einwilligung)
• Einsatzdaten (Datum, Schicht, Arbeitsbereich) – zur Dienstplanung und Dokumentation (Art. 6 Abs. 1 lit. b DSGVO)
• Spendenangaben (Artikel, Menge) – zur Koordination der Lebensmittel-Spenden (Art. 6 Abs. 1 lit. b DSGVO)
• Passwort-Hashes (bcrypt) – zur Authentifizierung (Art. 5 Abs. 1 lit. f DSGVO – Sicherheitsmaßnahme)
• JWT-Token und Reset-Tokens – zur Sitzungswahrung (Art. 5 Abs. 1 lit. f DSGVO)

Die Daten werden ausschließlich für die Turnierorganisation und den damit verbundenen Helfereinsatz verarbeitet.`
        },
        {
          id: '3',
          title: '3. Speicherdauer',
          content: `• Account-Daten: Bis zur Löschung auf Anfrage oder nach Beendigung der Vereinszugehörigkeit
• JWT-Token: 30 Tage (technisch notwendig)
• Passwort-Reset-Tokens: 1 Stunde (sicherheitsrelevant)
• Spenden-Daten: Bis zum Ende des Turniers + gesetzliche Aufbewahrungspflicht`
        },
        {
          id: '4',
          title: '4. Ihre Rechte',
          content: `Sie haben nach der DSGVO folgende Rechte:

• Recht auf Auskunft (Art. 15) – Sie können eine Kopie Ihrer gespeicherten Daten anfordern (Export-Funktion im Profil verfügbar)
• Recht auf Berichtigung (Art. 16) – Korrektur unrichtiger Daten
• Recht auf Löschung (Art. 17) – Löschung Ihrer Daten, sofern keine gesetzliche Aufbewahrungspflicht entgegensteht
• Recht auf Einschränkung der Verarbeitung (Art. 18)
• Widerspruchsrecht (Art. 21) – Widerspruch gegen die Verarbeitung
• Beschwerderecht bei einer Aufsichtsbehörde`
        },
        {
          id: '5',
          title: '5. Technische Sicherheit',
          content: `• Passwörter werden bcrypt-gehashet gespeichert
• Die Verbindung erfolgt über HTTPS (TLS-Verschlüsselung)
• JWT-Token sind signiert und ablaufend
• Reset-Tokens verfallen nach 1 Stunde`
        },
        {
          id: '6',
          title: '6. Kinderdaten – Besondere Vorsicht',
          content: `Die Erhebung von Daten Minderjähriger (Kindername, Geburtsjahr) erfolgt nur mit ausdrücklicher Einwilligung der Sorgeberechtigten. Diese Daten werden ausschließlich zur Altersgruppen-zuordnung bei Lebensmittel-Spenden verwendet und nicht an Dritte weitergegeben.`
        },
        {
          id: '7',
          title: '7. Kontakt',
          content: `Bei Fragen, Auskunftsersuchen oder Löschungsanträgen kontaktieren Sie uns bitte über die Vereinsleitung des TSV Holm.`
        }
      ].map(section => (
        <div key={section.id} style={{ marginBottom: 8, border: '1px solid #dee2e6', borderRadius: 8, overflow: 'hidden' }}>
          <button
            onClick={() => setExpanded(expanded === section.id ? null : section.id)}
            style={{
              width: '100%', padding: '14px 16px', textAlign: 'left', background: expanded === section.id ? '#f8f9fa' : '#fff',
              border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 'bold', color: '#333', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}
          >
            {section.title}
            <span style={{ fontSize: 18 }}>{expanded === section.id ? '▼' : '▶'}</span>
          </button>
          {expanded === section.id && (
            <div style={{ padding: '0 16px 16px', whiteSpace: 'pre-line', color: '#555', fontSize: 14, lineHeight: 1.7 }}>
              {section.content}
            </div>
          )}
        </div>
      ))}

      <p style={{ marginTop: 32, padding: 16, background: '#f8f9fa', borderRadius: 8, fontSize: 13, color: '#666' }}>
        Diese Datenschutzerklärung wird in der Anwendung bereitgestellt und ist jederzeit einsehbar. 
        Änderungen werden den Nutzern mitgeteilt.
      </p>
    </div>
  );
}
