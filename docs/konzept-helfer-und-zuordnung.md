# Konzept: Niedrigschwellige Hilfe, App-Nutzung & richtige Zuordnung

> Status: Konzept / Entscheidungsdokument
> Datum: 2026-07-24
> Kontext: Strukturierung der To-dos rund um (1) Hilfe ohne E-Mail-Pflicht,
> (2) installierbare App (PWA), (3) Turnier-Zuordnung pro Nutzer und
> (4) Jahrgangs-Präzision im Turnier.

Dieses Dokument hält den kompletten Diskussionsstand fest — inkl. der
**erwogenen, aber nicht gewählten** Alternativen, damit die Begründungen
nachvollziehbar bleiben. Es ist bewusst als lebendes Konzept angelegt,
nicht als fertige Spezifikation.

---

## 0. Leitprinzip

- **Lieber ein Helfer mehr als ein Absprung** wegen einer Pflichtangabe.
- **E-Mail ist optional** und darf den Kern („Ich will helfen / etwas
  mitbringen") **nie blockieren**.
- Weniger Pflichtdaten passen zur **DSGVO-Datenminimierung**; Einwilligung
  bleibt erhalten.
- Reihenfolge der Prioritäten: erst das Fundament (App-Nutzbarkeit + Kanäle +
  geteilte Zuordnungs-Logik), dann Onboarding/Identifikation, dann
  Darstellung.

---

## 1. Ist-Zustand (aus dem Code, als Ausgangsbasis)

Damit spätere Arbeit nicht bei null beginnt — was heute schon existiert:

**Identität / E-Mail**
- `User.email` und `User.password` sind im Prisma-Schema **bereits optional**
  (`email String?`, `password String?`).
- Die Registrier-/Volunteer-Validierung behandelt E-Mail schon als optional
  (`z.string().email().optional().or(z.literal(''))`).
- Login läuft aktuell über **E-Mail + Passwort**
  (`/api/auth/login`, Frontend übergibt `loginEmail`/`loginPassword`).
- **Passwort-Reset** existiert per E-Mail über **Resend**
  (`PasswordResetToken`-Modell, maskierte Reset-Token-Logs).
- **Admin-seitiger Passwort-Reset** existiert bereits:
  `updateVolunteerPassword` (`volunteer.controller.ts`).
- DSGVO: Einwilligungs-Checkbox in der Registrierung, `/privacy`,
  Datenexport (Art. 15) und Konto-Löschung/Widerruf sind vorbereitet.

**Turnier-Auswahl** (`self.controller.ts` → `getAvailable`)
1. Wenn `user.tournamentId` gesetzt → dieses Turnier.
2. Sonst: **neuestes aktives** Turnier (`status: 'aktiv'`,
   `orderBy: { startDate: 'desc' }`) …
3. … und dieses wird anschließend **fest am User gespeichert** (sticky).

> ⚠️ **Haken für Mehr-Turnier-Betrieb:** Durch das feste Speichern hängt ein
> Helfer nach dem ersten Login dauerhaft an *einem* Turnier. Startet später
> ein neues, sieht er es nicht automatisch. Genau das bricht bei „mehrere
> Turniere in kurzer Zeit".

**Jahrgangs-Filter** (heute nur bei Verpflegung, inline in `SelfServiceView.tsx`)
- Ein Verpflegungs-Slot wird angezeigt, wenn ein Kind-Jahrgang in
  `[yearGroup.birthYearStart … birthYearEnd]` fällt
  (plus Fallback „`yearGroup.name` == Jahr").
- Gruppierung/Anzeige „Verpflegung für deine Kinder" nach Jahrgang.

**Roadmap-Bezug**
- Phase 2: Benachrichtigungen (E-Mail/SMS), Massen-E-Mails, QR-Codes.
- Phase 3: PWA (installierbar, offline), Push-Benachrichtigungen, Foto-Upload.

---

## 2. Thema A — Hilfe ohne E-Mail-Pflicht

### 2.1 Kernerkenntnis
Die eigentliche Frage ist **nicht** „E-Mail ja/nein", sondern:
**Wie findet ein Helfer ohne E-Mail seine Sachen wieder** (Schichten,
Spenden) — und **was verliert er** dabei? E-Mail ist nur *einer* von mehreren
möglichen Rückkanälen.

### 2.2 Wofür E-Mail heute wirklich gebraucht wird

| Zweck | Braucht zwingend E-Mail? | Alternative |
|---|---|---|
| Wiederanmelden / eigene Schichten sehen | nein | Passwort, Handy, PIN/QR, Gerät, Push |
| Passwort selbst zurücksetzen | ja (ein Kanal nötig) | SMS, WhatsApp, Push, oder Admin-Reset |
| Benachrichtigung bei Schichtänderung | ja (ein Kanal) | SMS / WhatsApp / **Web Push** |
| Erinnerung vor dem Turnier | ja (ein Kanal) | SMS / WhatsApp / **Web Push** |
| Massen-Nachricht vom Organisator | ja (ein Kanal) | SMS / WhatsApp / **Web Push** |
| Konto auf neuem Gerät wiederherstellen | ja (ein Kanal) | SMS / WhatsApp / QR-Pass |

→ **Die Kernnutzung braucht keine E-Mail.** Ein Kanal (egal welcher) schaltet
vor allem den *Rückkanal* frei: Reset, Benachrichtigung, Erinnerung.

### 2.3 Feature-Matrix, die dem Helfer bei der Entscheidung gezeigt wird
- **Immer möglich (ohne Kanal):** Schicht buchen, Spende zusagen,
  Kind/Jahrgang zuordnen, Spielplan/Tabelle sehen.
- **Nur mit Kanal (E-Mail/SMS/WhatsApp/Push):**
  - 🔑 Passwort selbst zurücksetzen (sonst: Orga setzt zurück)
  - 🔔 automatische Benachrichtigung bei Änderung/Absage
  - ⏰ Erinnerung vor dem Einsatz
  - 📧 Nachrichten vom Organisator
  - 📱 Zugriff von einem neuen Gerät wiederherstellen

### 2.4 Erwogene Identifikationswege (vollständig)

- **A) Name + selbst gesetztes Passwort** — kein Versandkanal nötig;
  Nachteil: bei Verlust nur Admin-Reset. **→ gewählt (Basis).**
- **B) Handynummer + SMS-Code** — Rückkanal wie E-Mail, niedrigschwellig;
  Nachteil: SMS-Provider + laufende Kosten. **→ nicht als Basis gewählt**
  (bleibt optionaler Kanal, siehe Kanal-Modul).
- **C) Helfer-PIN / QR-Pass** — beim Anlegen einmalig erzeugter Code/QR,
  druckbar, kanalloser Wiedereinstieg; Nachteil: Verlust ⇒ Orga erzeugt neu.
  **→ gewählt (Wiedereinstieg).**
- **D) Ganz ohne Account** — Helfer nennt nur den Namen, Orga trägt ein;
  maximal niedrigschwellig, aber kein SelfService/Profil.
  **→ nicht gewählt** (kein SelfService), bleibt als Notfall-/Offline-Option
  denkbar.
- **E) Geräte-Token (localStorage / installierte PWA)** — auf demselben Gerät
  automatisch eingeloggt; fragil bei Gerätewechsel/Cache-Löschung.
  **→ als Komfort-Ergänzung** (besonders stark in Kombination mit der PWA).

### 2.5 WhatsApp als Rückkanal — technische Einordnung
Vom Nutzer aufgeworfen: „Wäre ein Rückkanal über WhatsApp möglich?"

- **Machbar, aber deutlich aufwändiger als E-Mail/SMS.** WhatsApp lässt kein
  freies Senden zu wie SMS.
- Voraussetzung: **WhatsApp Business Platform (Cloud API)** von Meta —
  direkt oder über einen Dienstleister (Twilio, MessageBird, 360dialog).
- Nötig: **Meta-Business-Konto**, eigene Telefonnummer für den Kanal,
  **Business-Verifizierung**, und **von Meta vorab genehmigte Templates**
  (für OTP/Reset gibt es die Kategorie „Authentication").
- **Kosten:** pro Konversation (nicht pro Nachricht), plus ggf.
  Dienstleister-Grundgebühr.
- Ein **eingehender** Kontakt (Helfer schreibt zuerst, z. B. via `wa.me`-Link)
  öffnet ein 24-h-Fenster für freie Antworten ohne Template — der günstige,
  aber manuelle Weg.
- Einordnung: Für einen Verein ist der Verifizierungs-/Template-Aufwand
  spürbar. **SMS** ist leichtgewichtiger, ein **Telegram-Bot** technisch am
  einfachsten (aber weniger verbreitet).

**Konsequenz:** Rückkanal als **austauschbares Modul** bauen (dieselbe
Abstraktion für E-Mail / SMS / WhatsApp / Web Push). WhatsApp ist ein
**separater Spike**, blockiert nichts.

### 2.6 Entscheidungen (Thema A)
- **Basis-Identität:** Name + selbst gesetztes Passwort (kein Kanal nötig).
- **Wiedereinstieg:** PIN / QR-Pass (einmalig erzeugt, druckbar, kanallos).
- **Rückkanal:** optionales, austauschbares Modul für E-Mail / SMS /
  **WhatsApp** / **Web Push** — nicht Pflicht.
- **Komfort:** persistenter Gerätetoken (v. a. über die installierte PWA).

---

## 3. Thema B — Website als installierbare App (PWA)

> Vom Nutzer als frühes Fundament-Thema priorisiert: die Website auf
> Android **und** iOS als App nutzbar machen, **ohne** App-Store-Einreichung,
> um deren Vorteile (z. B. Push, ggf. Passwort-Reset) zu nutzen.

### 3.1 Was es bringt
- **Installierbar über den Browser** („Zum Homebildschirm") — **kein App
  Store**, keine Reviews, keine Gebühren, keine Developer-Accounts.
- Eigenes Icon, Vollbild — fühlt sich wie eine App an.
- **Web Push** → Benachrichtigungen/Erinnerungen **ohne** persönlichen Kanal
  (E-Mail/Telefon).
- **Offline** (Service Worker): Spielplan/Schichten auch bei schlechtem Netz
  am Sportplatz.
- **Persistenter Login auf dem Gerät** → Reset wird selten überhaupt nötig.

### 3.2 Ehrliche Einschränkungen (relevant fürs Konzept)
- **iOS:** Web Push funktioniert **nur, wenn die PWA zum Homebildschirm
  hinzugefügt** wurde (erst ab iOS 16.4). **Ohne Installation kein Push auf
  dem iPhone** → auf iOS ist der Install-Schritt Pflicht für Push.
- Nutzer muss Push **aktiv erlauben** (Permission-Prompt).
- Kein Auto-Install wie im Store — es braucht einen guten Hinweis:
  Android via `beforeinstallprompt`-Banner, iOS via kurze Anleitung
  „Teilen → Zum Homebildschirm".

### 3.3 Wie die PWA die anderen Themen verändert
- **Das Kanal-Modul bekommt `webpush` — als *bevorzugten* Kanal.**
  Reihenfolge: **Web Push** (wenn installiert + erlaubt) → sonst optional
  **E-Mail / SMS / WhatsApp** → sonst **keiner** (dann greifen PIN/QR +
  Admin-Reset).
- **Passwort-Reset „darüber":** Push ist der **Zustellweg**
  (Reset-Code/Link ans installierte Gerät), **nicht** der Reset selbst.
  Zusätzlich sinkt durch den persistenten Gerätetoken der Reset-Bedarf stark.
- Die PWA wird damit zum **Fundament**, an dem viele „Kanal"-To-dos hängen.

### 3.4 To-dos (PWA)
- [ ] PWA-Basis: `manifest.json` (Name, Icons, Theme-Farben,
      `display: standalone`) + Service Worker — am einfachsten via
      **Vite-PWA-Plugin**.
- [ ] Install-Hinweis: Android (`beforeinstallprompt`), iOS (manuelle
      Anleitung „Teilen → Zum Homebildschirm").
- [ ] Web Push: VAPID-Keys, Push-Subscription am `User`/Gerät speichern,
      Versand im Backend (`web-push`).
- [ ] `webpush` in die Kanal-Abstraktion einhängen (Vorrang vor
      E-Mail/SMS/WhatsApp).
- [ ] Offline-Caching für Spielplan/Schichten *(nice-to-have)*.
- [ ] Reset-/Magic-Flow über Push + persistenten Gerätetoken konzipieren.

---

## 4. Thema C — Turnier-Zuordnung (welches Turnier sieht ein Nutzer)

### 4.1 Ausgangslage & Bewertung
- „Nächstes/aktives Turnier zeigen" ist **für den Start völlig in Ordnung**.
- Problematisch ist v. a. die **sticky-Speicherung** (siehe Abschnitt 1):
  der Helfer hängt an einem Turnier fest.

### 4.2 Erwogene Optionen
- **Dynamisch + Merker** — immer relevantestes/zeitnächstes Turnier berechnen;
  letzte Auswahl nur als Präferenz merken, nie fest verankern; Umschalter bei
  mehreren. **→ gewählt.**
- **Sticky wie heute** — einfach, aber Helfer hängt fest. **→ nicht gewählt.**
- **Immer selbst wählen** — volle Kontrolle, aber ein Extra-Klick auch im
  Normalfall (nur ein Turnier). **→ nicht gewählt.**

### 4.3 Ziel-Logik
- Zentrale Funktion **`resolveTournamentForUser(user)`**, ersetzt die
  sticky-Persistierung in `getAvailable`.
- „Nächstes" = **läuft gerade; sonst das als nächstes beginnende**
  (Status `aktiv`; `beendet`/`archiviert` ausgeschlossen) — nicht schlicht
  „neuestes `startDate`".
- **Relevanz-Signal** (Kern): ein Helfer gehört zu einem Turnier, wenn eines
  zutrifft:
  - hat dort eine **Schicht** gebucht, **oder**
  - ein **Kind-Jahrgang** ist Teil des Turniers, **oder**
  - hat sich **dafür registriert**.
- **Bei Mehrdeutigkeit** (mehrere relevante/parallele Turniere): relevantestes
  + zeitnächstes als Default; **Umschalter** anbieten. Kein hartes Festnageln;
  letzte Wahl nur als Präferenz merken.

### 4.4 To-dos (Turnier-Zuordnung)
- [ ] `resolveTournamentForUser(user)` implementieren (Relevanz + Zeitnähe).
- [ ] Sticky-Persistierung in `getAvailable` entfernen.
- [ ] Turnier-**Umschalter** im SelfService (nur wenn > 1 relevant).

---

## 5. Thema D — Jahrgangs-Präzision im Turnier (Helfer mit mehreren Kindern)

### 5.1 Idee
Das bestehende **Verpflegungs-Konzept verallgemeinern**: eine gemeinsame
Funktion „welche Jahrgänge sind für diesen Helfer relevant" — einmal gebaut,
überall genutzt: **Verpflegung, Spielpläne, Ergebnisse, später Erinnerungen**.

### 5.2 Erwogene Darstellungs-Optionen (Helfer mit 2 Kindern in versch. Jg.)
- **Getrennte Abschnitte** — pro Kind/Jahrgang ein Block untereinander;
  alles auf einen Blick. **→ nicht gewählt.**
- **Tabs pro Kind** — umschaltbare Reiter je Kind; kompakter auf dem Handy,
  zeigt ein Kind zur Zeit. **→ gewählt.**
- **Ein gefilterter Mix** — alle passenden Jahrgänge zusammen (wie Verpflegung
  heute); einfachste Logik, aber Zuordnung Kind↔Spiel unklarer.
  **→ nicht gewählt.**

### 5.3 Ziel-Verhalten
- Geteilte Funktion **`relevantYearGroups(user, tournament)`** aus
  Kind-Jahrgängen (+ evtl. Schicht-Jahrgängen).
- Mehrere Kinder → **Reiter pro Kind** („Jonas · Jg 2015" / „Mia · Jg 2018");
  je Tab die passenden Spiele/Ergebnisse, nach Jahrgang gefiltert.
- **Sonderfälle:**
  - 1 Kind → keine Tabs nötig.
  - Keine Kinder → Turnier-Gesamtübersicht.
  - Kind ohne Jahrgang / mehrdeutiger Jahrgang / Jahrgang als reine Jahreszahl
    vs. Geburtsjahr-Range → definierter Fallback.

### 5.4 To-dos (Jahrgangs-Präzision)
- [ ] Kind-Jahr-Matching aus dem Inline-Verpflegungscode in `SelfServiceView`
      extrahieren und als `relevantYearGroups(user, tournament)`
      wiederverwendbar machen.
- [ ] Spielplan/Ergebnisse in **Tabs pro Kind**, nach Jahrgang gefiltert.
- [ ] Fallback „keine Kinder / kein Jahrgang" definieren.

---

## 6. Offene Entscheidungen

- **iOS-Onboarding & Push:** Auf iOS kostet Push zwingend einen Install-Schritt.
  - **Empfehlung:** Installation **optional** halten, aber **nach der ersten
    sinnvollen Aktion charmant anbieten** („Schicht gebucht → willst du
    Erinnerungen? Dann App installieren"). Alternative: Installation aktiv ins
    Onboarding nehmen (ein Schritt mehr, dafür der beste kostenlose Kanal).
  - *Noch zu entscheiden.*
- **Namens-Kollision bei „Name + Passwort":** wie zwei „Peter M."
  unterscheiden — z. B. über Klub/Jahrgang oder eine laufende Nummer.
  *Noch zu entscheiden.*

---

## 7. Konsolidiertes Backlog (grob priorisiert)

**Fundament (zuerst)**
1. [ ] PWA-Basis (`manifest.json` + Service Worker) + Install-Hinweis
       (Android/iOS).
2. [ ] Web Push + **Kanal-Abstraktion** `NotificationChannel`
       (`webpush | email | sms | whatsapp | none`), `webpush` als Default;
       Resend/E-Mail als erste zusätzliche Umsetzung.
3. [ ] Geteilte Funktionen: `resolveTournamentForUser`,
       `relevantYearGroups`; sticky-Persistierung entfernen.

**Identifikation & Onboarding**
4. [ ] Login um **Name + Passwort** erweitern (Namens-Kollision lösen).
5. [ ] **PIN/QR-Pass**: Feld am `User`, Erzeugung bei Registrierung,
       „Login per Code", QR-Anzeige + Druckansicht.
6. [ ] Persistenter **Gerätetoken** (v. a. via installierte PWA).
7. [ ] Registrierungs-UX: E-Mail **optional** + Feature-Vergleich
       („Was du ohne Kanal nicht bekommst") + „Weiter ohne E-Mail".
8. [ ] **Feature-Gating serverseitig** (Reset/Benachrichtigung nur mit Kanal).
9. [ ] Admin: manueller Passwort-Reset (Basis existiert:
       `updateVolunteerPassword`).

**Darstellung**
10. [ ] Turnier-**Umschalter** im SelfService (nur bei > 1 relevant).
11. [ ] Spielplan/Ergebnisse in **Tabs pro Kind**, nach Jahrgang gefiltert.
12. [ ] Fallback „keine Kinder / kein Jahrgang".

**Separat / später**
13. [ ] **WhatsApp-Spike** (Business-Konto/Template-Aufwand vs. SMS abwägen).
14. [ ] Offline-Caching für Spielplan/Schichten *(nice-to-have)*.

---

## 8. Zusammenfassung der Entscheidungen

| Thema | Entscheidung |
|---|---|
| Identität (Basis) | Name + selbst gesetztes Passwort, ohne Kanal-Zwang |
| Wiedereinstieg | PIN / QR-Pass (kanallos, druckbar) |
| Rückkanal | optionales, austauschbares Modul; **Web Push bevorzugt** |
| E-Mail | optional, nie Blocker; Feature-Vergleich an der Entscheidungsstelle |
| App-Nutzung | **PWA** (installierbar, kein App Store), früh im Fundament |
| Turnier-Wahl | **Dynamisch + Merker** (relevanteste/zeitnächste, Umschalter) |
| Mehr-Kind-Darstellung | **Tabs pro Kind**, nach Jahrgang gefiltert |
| WhatsApp | machbar, aber separater Spike (Aufwand > SMS) |
| iOS-Push | offen: optional anbieten vs. ins Onboarding nehmen (Empfehlung: optional, nach erster Aktion anbieten) |
