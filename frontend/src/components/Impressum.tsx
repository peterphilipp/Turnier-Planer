export default function Impressum() {
  return (
    <div style={{ maxWidth: 800, margin: '40px auto', padding: 20 }}>
      <h1 style={{ color: '#333', borderBottom: '2px solid #0d6efd', paddingBottom: 12 }}>Impressum</h1>

      <p style={{ color: '#666', fontSize: 14, marginBottom: 24 }}>
        Angaben gemäß § 5 DDG (Digitale-Dienste-Gesetz)
      </p>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, color: '#333', marginBottom: 8 }}>Verantwortlich für den Inhalt</h3>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          Peter Philipp<br />
          Pestalozzistr. 30<br />
          22880 Wedel
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, color: '#333', marginBottom: 8 }}>Kontakt</h3>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7, margin: 0 }}>
          E-Mail: <a href="mailto:machtdasturnier@posteo.de" style={{ color: '#0d6efd' }}>machtdasturnier@posteo.de</a>
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, color: '#333', marginBottom: 8 }}>Haftungsausschluss</h3>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7 }}>
          Die Inhalte dieser Anwendung wurden mit größtmöglicher Sorgfalt erstellt. Für die Richtigkeit,
          Vollständigkeit und Aktualität der Inhalte kann jedoch keine Gewähr übernommen werden.
        </p>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7 }}>
          Diese Anwendung kann Verweise (Links) zu externen Websites Dritter enthalten, auf deren Inhalte
          kein Einfluss besteht. Für diese fremden Inhalte kann daher keine Verantwortung übernommen werden;
          verantwortlich ist stets der jeweilige Anbieter der verlinkten Seite.
        </p>
      </div>

      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, color: '#333', marginBottom: 8 }}>Urheberrecht</h3>
        <p style={{ color: '#555', fontSize: 14, lineHeight: 1.7 }}>
          Der Anwendungs-Code sowie das Layout und Design dieser Anwendung unterliegen dem deutschen
          Urheberrecht. Vereins- und Sponsoren-Logos sowie sonstige von Nutzern eingestellte Inhalte
          verbleiben im Eigentum der jeweiligen Rechteinhaber und werden hiervon nicht erfasst.
        </p>
      </div>

      <p style={{ marginTop: 32, padding: 16, background: '#f8f9fa', borderRadius: 8, fontSize: 13, color: '#666' }}>
        Siehe auch: <a href="?view=privacy" style={{ color: '#0d6efd' }}>Datenschutzerklärung</a>
      </p>
    </div>
  );
}
