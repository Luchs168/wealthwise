# WealthWise – Datenschutz- und Haftungsreview
## Gutachten aus juristischer Perspektive (DSG / DSGVO / FIDLEG)

**Verfasst:** Mai 2026  
**Kontext:** Prototyp im Rahmen einer Hochschularbeit  
**Rechtsstand:** nDSG (1.9.2023), DSGVO, FIDLEG/FINIG (2020), BVG, IVG

---

## 0. Executive Summary

| Dimension | Risiko | Begründung |
|---|---|---|
| **DSG / Datenschutz** | 🟡 **Mittel** | localStorage-Behauptungen irreführend; keine CSP-Header; Drittanbieter unvollständig dokumentiert |
| **FIDLEG / Regulierung** | 🟢 **Tief** | Kein Finanzinstrument-Bezug; kein Robo-Advisory; gut abgegrenzt |
| **Haftung (Berechnungen)** | 🟡 **Mittel** | Disclaimer vorhanden aber Standort und Formulierung unzureichend |
| **Haftung (Empfehlungen)** | 🟡 **Mittel** | Handlungsempfehlungen ohne kontextbezogenen Hinweis |
| **Impressum / Transparenz** | 🔴 **Hoch** | Fehlende Identität der Betreiberperson; keine Rechtsform; irreführende Angaben |
| **Drittanbieter** | 🟡 **Mittel** | openplzapi.org nicht dokumentiert; Plausible-Script-Tag unklar; Netlify-USA-Transfer unvollständig |

**Gesamturteil:** WealthWise ist als Thesis-Prototyp **rechtlich vertretbar**, wenn sechs Sofortmassnahmen umgesetzt werden (→ Abschnitt 11). In der aktuellen Form bestehen **handhabbare, aber reale** Risiken — primär nicht durch die Technologie, sondern durch irreführende Selbstdarstellung (Zero-Storage-Versprechen, Schweizer Server-Behauptung) und ein unvollständiges Impressum.

---

## 1. Anwendbares Recht

### 1.1 Schweizer DSG (nDSG)

**Anwendbar: Ja, zweifelsfrei.**

Das revidierte Datenschutzgesetz (nDSG, SR 235.1, in Kraft seit 1.9.2023) gilt für alle natürlichen Personen und privaten Unternehmen, die Personendaten in der Schweiz bearbeiten — unabhängig davon, ob die Verarbeitung server- oder client-seitig erfolgt. WealthWise:

- Betreiber laut Impressum: Adresse Pfäffikon SZ → Schweizer Nexus eindeutig
- Verarbeitet Personendaten (Geburtsdatum, Einkommen, Vermögen) im Browser der Nutzenden
- Richtet sich an Schweizer Nutzende (Inhalte auf Deutsch, CHF, Schweizer Vorsorgesystem)

**Wichtig:** Das DSG definiert "Bearbeiten" weit (Art. 5 lit. d DSG): jede Verarbeitung von Personendaten, unabhängig der Mittel und des Ortes. Auch client-side OCR im Browser des Users ist "Bearbeiten" im Rechtssinne — WealthWise stellt das Werkzeug zur Verfügung.

### 1.2 DSGVO (EU)

**Anwendbar: Teilweise / situationsabhängig.**

Das Marktortprinzip (Art. 3 Abs. 2 DSGVO) gilt, wenn WealthWise Personen in der EU Waren/Dienstleistungen anbietet. Da:
- Kein explizites EU-Targeting (kein EU-Sprachpfad, keine EUR-Angaben)
- Jedoch: offene URL, keine Geo-Blockierung, keine Einschränkung auf Schweizer Nutzende
- Die Datenschutzerklärung referenziert bereits DSGVO → implizites Eingeständnis der Anwendbarkeit

**Empfehlung:** Da die Datenschutzerklärung die DSGVO bereits erwähnt, sollte sie auch compliant mit DSGVO sein. Die relevanten DSGVO-Anforderungen sind grösstenteils identisch mit dem nDSG. Kein separater Handlungsbedarf — aber die SCCs für Netlify müssen korrekt dokumentiert sein (→ Abschnitt 8).

### 1.3 FIDLEG (Finanzdienstleistungsgesetz)

**Detailanalyse → Abschnitt 7.**

### 1.4 Sektorspezifische Gesetze

| Gesetz | Relevant? | Begründung |
|---|---|---|
| **FINIG** (Finanzinstitutsgesetz) | Nein | Kein Vermögensverwaltungsmandat, keine Verwahrung |
| **BEHG / FinfraG** | Nein | Keine Handelstätigkeit, keine Finanzmarktinfrastruktur |
| **BVG** | Informationell | Als Rechtsquelle für Berechnungen; kein Aufsichtsrecht |
| **AHV-Gesetz / AHVG** | Informationell | AHV-Berechnungen müssen korrekt sein (Haftungsrisiko) |
| **VStG** (Verrechnungssteuer) | Nein | Keine Steuerberatung i.e.S. |
| **StHG / DBG** | Haftungsbezug | Steuerberechnungen können falsch sein → Disclaimer nötig |

---

## 2. Datenkategorien und Sensitivität

### 2.1 Klassifikation der verarbeiteten Daten

| Datenkategorie | Konkretes Datum | DSG-Kategorie | Sensitivität |
|---|---|---|---|
| Geburtsdatum | Ja (Pflichtfeld) | Personendaten | Mittel |
| Wohnort / Kanton | Ja | Personendaten | Tief |
| Zivilstand | Ja | Personendaten | Mittel |
| Kinderzahl / Geburtsjahr | Ja | Personendaten | Mittel |
| Brutto-Jahreseinkommen | Ja | Personendaten → Finanzdaten | **Hoch** |
| PK-Guthaben | Ja | Personendaten → Finanzdaten | **Hoch** |
| Umwandlungssatz, Sparbeitrag | Ja | Finanzdaten | **Hoch** |
| AHV-Beitragsjahre / Lücken | Ja | Sozialversicherungsdaten | **Hoch** |
| IK-Auszug (komplette Erwerbshistorie) | Via Upload | **Besonders schützenswert** (s.u.) | **Sehr hoch** |
| 3a-Guthaben | Ja | Finanzdaten | **Hoch** |
| Freies Vermögen / Wertschriften | Ja | Finanzdaten | **Hoch** |
| Immobilienwert / Hypothek | Ja | Finanzdaten | **Hoch** |
| Monatliches Budget / Ausgaben | Ja | Verhaltensdaten | Mittel |
| KK-Prämie / Franchise | Ja | Gesundheitsbezogene Daten | **Hoch** |
| Pensionierungswunsch | Ja | Personendaten | Tief-Mittel |
| Risikoprofil | Ja | Finanzdaten | **Hoch** |

### 2.2 Besonders schützenswerte Personendaten (DSG Art. 5 lit. c)

Das DSG Art. 5 lit. c definiert besonders schützenswerte Personendaten als Daten über u.a.:
- Gesundheit und Intimsphäre
- Soziale Hilfe
- **Massnahmen der sozialen Sicherheit** ← AHV-Daten fallen hierunter

**Rechtliche Einordnung:**
- **AHV-Beitragsjahre und IK-Auszug**: Die AHV ist eine gesetzliche Sozialversicherung (Art. 111 ff. BV). Daten aus dem individuellen AHV-Konto (IK-Auszug) sind Daten über "Massnahmen der sozialen Sicherheit" → **besonders schützenswert gemäss Art. 5 lit. c Ziff. 4 DSG**.
- **Gesundheitsdaten** (KK-Prämie, Franchise): Indirekt gesundheitsbezogen; argumentierbar aber nicht eindeutig "besonders schützenswert" solange keine Diagnosen/Gesundheitszustand explizit erfasst werden.
- **Finanzdaten allgemein**: Das DSG zählt Finanzdaten (ohne Kontonummern) nicht explizit zu den besonders schützenswerten Kategorien — anders als die DSGVO. Dennoch erhöhte Sorgfaltspflicht aufgrund des Schadenpotentials.

### 2.3 Profiling mit hohem Risiko (DSG Art. 5 lit. f/g)

Das DSG unterscheidet zwischen Profiling (Art. 5 lit. f) und Profiling mit hohem Risiko (Art. 5 lit. g). WealthWise erstellt eine umfassende Vorsorgeanalyse aus multiplen Datenkategorien — dies könnte als Profiling qualifizieren. Ein "hohes Risiko" im DSG-Sinne setzt voraus, dass das Profiling eine wesentliche Beeinträchtigung der betroffenen Person ermöglichen könnte.

**Einschätzung:** Da WealthWise keine Daten an Dritte übermittelt, ist das Risiko eines Dritten-induzierten Schadens (z.B. Kreditverweigerung durch Scoring-Profil) nicht gegeben. Die Profiling-Kategorisierung ist daher **akademisch diskutierbar, praktisch nicht haftungsrelevant** — solange die Daten wirklich nur im Browser bleiben.

**Caveat:** Sollte ein zukünftiger Betrieb Daten serverseitig speichern oder an Versicherungen/Banken weiterleiten, wäre "Profiling mit hohem Risiko" klar erfüllt und eine DSFA (Datenschutz-Folgenabschätzung) nach DSG Art. 22 zwingend.

---

## 3. localStorage — Rechtliche Bewertung

### 3.1 Was ist localStorage technisch?

localStorage ist eine Browser-API, die Daten persistent im Browser speichert:
- Bleibt nach Browser-Schliessung erhalten (kein Session-Timeout)
- Bleibt nach Rechner-Neustart erhalten
- Ist namespaced per Ursprung (Origin), aber:
  - Browser-Extensions können es lesen
  - Shared Computers: nächste Person am selben Browser sieht alle Daten
  - XSS-Angriffe können localStorage lesen (→ Abschnitt 3.4)

### 3.2 Analyse der aktuellen Aussagen

**Aussage 1 — Datenschutzerklärung:**
> *"WealthWise speichert keine deiner persönlichen Daten auf einem Server. Alle Eingaben werden ausschliesslich in deinem Browser (localStorage) verarbeitet und **nach dem Schliessen der Seite vollständig verworfen**."*

**Rechtliche Bewertung: ⚠️ Irreführend / Falsch**

Die Aussage "nach dem Schliessen der Seite vollständig verworfen" ist technisch **falsch**. localStorage persistiert explizit über Seiteninteraktionen hinaus — das ist sein primärer Zweck und unterscheidet es von sessionStorage. Diese Falschaussage erfüllt den Tatbestand irreführender Information nach Art. 19 DSG (Informationspflicht) und könnte als Verletzung von Art. 3 UWG (unlautere Geschäftspraktiken) qualifizieren.

**Aussage 2 — Landing Page:**
> *"Keine Daten gespeichert"* (als Feature-Badge)

**Rechtliche Bewertung: ⚠️ Irreführend**

Daten werden sehr wohl gespeichert — in localStorage. Die Aussage ist nur dann korrekt, wenn "gespeichert" ausschliesslich als "Server-seitig gespeichert" interpretiert wird, was für einen durchschnittlichen Nutzer nicht selbstverständlich ist. Nach dem Verständnis einer normalen Person bedeutet "keine Daten gespeichert" → man gibt Daten ein und sie sind danach weg. Das Gegenteil ist der Fall.

**Aussage 3 — Landing Page:**
> *"Schweizer Server"*

**Rechtliche Bewertung: 🔴 Falsch**

Hosting erfolgt via **Netlify Inc., San Francisco, USA**. "Schweizer Server" ist **objektiv falsch** und gleichzeitig das vertrauensbildendste Versprechen der Landing Page. Diese Aussage muss **sofort entfernt** werden — sie ist irreführend i.S.v. Art. 3 UWG und verletzt die Informationspflichten nach DSG Art. 19.

**Aussage 4 — Datenschutzerklärung (korrekt):**
> *"Die Daten werden im localStorage deines Browsers gespeichert, damit du den Fragebogen unterbrechen und später fortsetzen kannst."*

Dies ist eine korrekte und transparente Aussage, die aber im direkten Widerspruch zu "nach dem Schliessen der Seite vollständig verworfen" steht.

### 3.3 Einwilligung für localStorage

**Braucht es einen Cookie-Banner für localStorage?**

Streng genommen ist localStorage kein Cookie. Das DSG und die ePrivacy-Richtlinie (EU, noch nicht ratifiziert in CH) beziehen sich primär auf Cookies. Für die Schweiz gilt:
- Das DSG verlangt keine explizite Einwilligung für technisch notwendige Datenspeicherung
- localStorage für Sitzungsfortsetzung kann als "berechtigtes Interesse" qualifizieren
- **Kein Cookie-Banner zwingend** — aber transparente Information ist Pflicht

**Empfehlung:** Ein kurzer Hinweis beim ersten Aufruf ("Ihre Eingaben werden lokal in Ihrem Browser gespeichert. Sie können diese jederzeit löschen.") + sichtbarer Lösch-Button ist ausreichend und rechtlich sauber.

### 3.4 XSS-Risiko und Haftung

localStorage ist gegen Cross-Site-Scripting (XSS) gleich anfällig wie Cookies (ohne HttpOnly-Flag). Ein XSS-Angriff auf die WealthWise-Domain könnte:
- Alle Finanzdaten aus localStorage exfiltrieren
- Vollständige Vermögensübersicht inkl. PK-Guthaben, Einkommen übertragen

**Aktuelle Sicherheitslage:** Weder `netlify.toml` noch `vercel.json` konfigurieren Content-Security-Policy (CSP) Headers. Keine `_headers` Datei in public/. **Kritische Lücke.**

**Haftungsrelevanz:** Bei einem XSS-Datenleck ohne CSP-Schutz und mit hochsensiblen Finanzdaten wäre eine DSG-Verletzung (Verletzung von Datensicherheitspflichten, Art. 8 DSG) schwer zu bestreiten. Der Schaden für betroffene Personen kann erheblich sein (Identitätsdiebstahl, Betrug).

### 3.5 Anforderungen an den "Daten löschen" Button

**Aktueller Stand:** `resetStore()` Funktion existiert in TopBar.tsx — löscht alle Zustand-Daten und triggert localStorage-Clear via Zustand-Persist-Middleware. ✓ Vorhanden.

**Problem:** Der Reset-Button ist in der Topbar versteckt (Modal-basiert) und nicht auf der Landing Page oder als permanentes Element sichtbar. Nach DSG Art. 32 muss das Löschungsrecht einfach ausübbar sein.

**Anforderung:** Lösch-Button muss:
- Auf der Datenschutzseite direkt auffindbar sein (nicht nur über Browser-Cache-Leeren)
- Die vollständige Wirkung beschreiben ("löscht alle Ihre Daten aus dem Browser")
- Bestätigungsdialog zeigen (irreversibel)

---

## 4. Dokument-Upload — Rechtliche Anforderungen

### 4.1 Technische Verarbeitungsprüfung (Audit-Ergebnis)

Der Code-Audit zeigt:
- **PK-Ausweis (PDF):** Wird via pdfjs-dist lokal verarbeitet → nur extrahierte Zahlenwerte werden im Store gespeichert → Originaldokument **nicht** in localStorage gespeichert ✓
- **IK-Auszug (Bild/PDF):** Wird via Tesseract.js OCR lokal verarbeitet → nur Beitragsjahre und berechnetes MDJ gespeichert → Originaldatei **nicht** persistiert ✓
- **AHV-Nummer:** Erscheint im IK-Auszug, wird aber **nicht** als Feld im Store gespeichert ✓ (nur Beitragsjahre und -lücken)

**Befund:** Die technische Umsetzung des Dokument-Uploads ist datenschutzrechtlich **vorbildlich**: Verarbeitung in Memory, kein Server-Transfer, keine Persistierung des Originals.

### 4.2 Rechtliche Bewertung des IK-Auszugs

Der IK-Auszug (individuelle Kontoauskunft der AHV) enthält:
- AHV-Nummer (13-stellig, eindeutiger Identifier)
- Vollständige Erwerbshistorie seit Beginn des Erwerbslebens
- Alle Arbeitgeber mit Jahren
- Lohnentwicklung über Jahrzehnte

Dies sind **besonders schützenswerte Personendaten** (AHV = Massnahme der sozialen Sicherheit, DSG Art. 5 lit. c Ziff. 4). Die client-side Verarbeitung ist datenschutzrechtlich zulässig, da keine Übermittlung an Dritte erfolgt.

**Offene Frage: AHV-Nummer im OCR-Text**

Obwohl die AHV-Nummer nicht gespeichert wird, erscheint sie im temporären OCR-Output (JavaScript-Speicher). Sie verbleibt dort bis zur nächsten Garbage Collection. Das ist rechtlich tolerierbar (kein persistenter Speicher, kein Dritter-Zugriff), sollte aber in der Datenschutzerklärung erwähnt werden.

### 4.3 Informationspflichten beim Upload

Die aktuelle Datenschutzerklärung enthält einen kurzen Hinweis zum PK-Ausweis-Upload, aber:
- IK-Auszug wird nicht explizit erwähnt (obwohl dieser noch sensibler ist)
- Es fehlt: "Das Dokument wird nach Extraktion der Zahlen sofort aus dem Browser-Speicher entfernt"
- Es fehlt: Klartext-Info was extrahiert wird und was NICHT (AHV-Nummer wird NICHT gespeichert)

**Anforderung nach DSG Art. 19:** Information muss im Moment der Datenerhebung (Upload-Zeitpunkt) erfolgen, nicht nur in der Datenschutzerklärung. Ein kurzer Inline-Hinweis direkt beim Upload-Button ist Pflicht.

### 4.4 Kein Explizit-Einwilligungserfordernis für den Upload

Da keine Server-Übermittlung erfolgt und die Daten client-seitig verbleiben, besteht kein strenges Einwilligungserfordernis (Art. 6 DSG / Art. 6 DSGVO). Die informierte Nutzung (der User lädt bewusst hoch) reicht. Der Inline-Hinweis beim Upload-Button erfüllt die Informationspflicht.

---

## 5. Haftung

### 5.1 Haftungsgründe im Überblick

| Risikoszenario | Haftungsgrundlage | Wahrscheinlichkeit | Schwere |
|---|---|---|---|
| Falsche AHV-Rentenberechnung → falsche Planung | OR 41 (Sorgfaltspflichtverletzung) | Mittel | Mittel |
| Falsche Steuerberechnung → Falschabzug | OR 41, StHG | Mittel | Mittel |
| Falscher PK-Einkauf-Hinweis → Sperrfrist verletzt | OR 41, BVG | Tief | Hoch |
| XSS-Datenleck → Identitätsdiebstahl | DSG Art. 8, OR 41 | Tief | Hoch |
| EL-Anspruch suggeriert → kein Anspruch | OR 41, Irreführung | Tief | Mittel |
| "Schweizer Server"-Aussage → Datenschutzverletzung | DSG Art. 19, UWG Art. 3 | Mittel | Mittel |

### 5.2 Haftung für Berechnungen

**Schweizer Recht (OR 97 ff.):** Eine Haftung für fehlerhafte Berechnungen setzt voraus:
1. Schaden beim Nutzer
2. Widerrechtlichkeit oder Vertragsverletzung
3. Kausalzusammenhang
4. Verschulden

Da WealthWise kostenlos ist und keine vertragliche Beziehung (Auftrag, Werkvertrag) begründet wird, ist eine **vertragliche Haftung ausgeschlossen**. Es verbleibt:
- **Deliktische Haftung** (OR 41): Setzt widerrechtliches Verhalten voraus. Eine fehlerhafte Berechnung allein ist nicht widerrechtlich, wenn klar als Schätzung/Illustration kommuniziert.
- **Vertrauenshaftung** (culpa in contrahendo): Möglich wenn der Nutzer berechtigterweise auf die Richtigkeit vertraute. Der Disclaimer mildert dies erheblich.

**Kausalitätsproblem:** Zwischen der Nutzung von WealthWise und einem konkreten Finanzschaden fehlt in aller Regel die Adäquanz des Kausalzusammenhangs — insbesondere wenn der User professionellen Rat hätte konsultieren sollen (und darauf hingewiesen wurde).

### 5.3 Haftung für Handlungsempfehlungen

Screen 4 enthält spezifische Handlungsempfehlungen wie:
- "PK-Einkauf prüfen" (mit berechneten Beträgen)
- "Kapitalbezug statt Rente" (konkrete Break-even-Analyse)
- "3a maximieren" (mit Steuerersparnis-Berechnung)

**Risikofall: PK-Einkauf und 3-Jahres-Sperrfrist**

Tätigt ein Nutzer aufgrund der Empfehlung einen PK-Einkauf und bezieht innerhalb von 3 Jahren Kapital aus der PK (Art. 79b Abs. 3 BVG), wird der Einkaufsbetrag zu 100% nachbesteuert. Der konkrete Hinweis im Code auf die Sperrfrist mildert das Risiko — aber nur wenn er **kontextbezogen, nicht nur im Fussnotentext** erscheint.

**Stärker exponiert ist WealthWise bei:**
- Quantifizierten Empfehlungen ("Sie sparen CHF X Steuern") die falsch berechnet sind
- Fallspezifischen Empfehlungen die auf individuellen Eingaben basieren

**Aktueller Disclaimer im Code (Screen 4, Zeile 3471):**
> *"Diese Empfehlungen basieren auf Ihren Angaben und den AHV/BVG-Kennzahlen 2026. Individuelle steuerliche und rechtliche Aspekte erfordern eine persönliche Fachberatung."*

**Bewertung:** Vorhanden aber unzureichend — erscheint am Ende eines langen Screens, nicht kontextbezogen bei der Empfehlung selbst. Zur Haftungsminimierung muss jede quantifizierte Empfehlung einen **kurzen Inline-Disclaimer** tragen.

### 5.4 Wirksame Disclaimer: Was braucht es?

Ein Haftungsausschluss ist nach Schweizer Recht (OR 100) nur wirksam wenn:
1. Nicht für Vorsatz oder grobe Fahrlässigkeit (OR 100 Abs. 1 — zwingend, kein Ausschluss möglich)
2. Klar und verständlich formuliert
3. Dem Nutzer vor Inanspruchnahme des Dienstes zur Kenntnis gebracht
4. Nicht grobfahrlässig irreführend (sonst UWG-Verstoss)

**Bestehende Mängel:**
- Allgemeiner Haftungsausschluss nur im Impressum → zu versteckt
- Landing Page suggeriert Vertrauenswürdigkeit ohne entsprechende Nuancierung
- Kein Disclaimer beim Start des Tools (vor erster Eingabe)
- "Keine Finanzberatung im Sinne des FIDLEG" ist korrekt aber nicht ausreichend (fehlt: Fehler möglich, keine Gewähr für Richtigkeit)

---

## 6. Drittanbieter-Audit

### 6.1 Identifizierte externe Verbindungen

| Dienst | Anbieter / Land | Art der Datenübertragung | Dokumentiert? |
|---|---|---|---|
| **Netlify** (Hosting) | USA | IP-Adresse, User-Agent, Zeitstempel bei jedem Aufruf | Ja (Datenschutz §5) |
| **openplzapi.org** | DE/EU (unbekannt) | IP-Adresse + Postleitzahl bei PLZ-Eingabe | **Nein ⚠️** |
| **Plausible Analytics** | EU (Estland) | IP-Adresse (anonymisiert), Seitenaufrufe, Referrer | Ja (Datenschutz §4) — aber Script-Tag im Repo nicht gefunden |
| **Anthropic API** (Chatbot) | USA | Laut Datenschutzerklärung: Chatbot-Fragen | Ja — **aber Chat ist offline/preprogrammed, kein echter API-Call** ⚠️ |
| Google Fonts | USA | Keine — Self-hosted via @fontsource ✓ | n/a |
| pdfjs-dist Worker | Self-hosted | Keine — lokal ✓ | n/a |
| Tesseract.js Worker | Self-hosted | Keine — lokal nach Fix ✓ | n/a |

### 6.2 openplzapi.org — Handlungsbedarf

Die LocationField.tsx-Komponente sendet bei jeder PLZ-Eingabe die Postleitzahl **plus die IP-Adresse des Nutzers** an `openplzapi.org`. Dies ist ein Drittanbieter-Transfer der nicht dokumentiert ist.

**Rechtliche Anforderungen:**
- DSG Art. 19 Abs. 2: Information über Empfänger der Daten
- Nur Postleitzahl (keine Namen, keine Finanzdaten) → geringes Risiko
- Betreiber von openplzapi.org unklar → AGB/Datenschutz prüfen

**Sofortmassnahme:** openplzapi.org in Datenschutzerklärung unter "Drittanbieter" dokumentieren.

### 6.3 Plausible Analytics — Diskrepanz

Die Datenschutzerklärung erwähnt Plausible Analytics ausführlich — der Code enthält jedoch **keinen Plausible Script-Tag**. Es gibt keine `plausible.io`-Integration im Repo. Entweder:
a) Plausible wird über Netlify-Plugin/Deployment-Config eingebunden (nicht im Repo)
b) Plausible wurde entfernt aber die Datenschutzerklärung wurde nicht aktualisiert

**Rechtlich kritisch:** Eine Datenschutzerklärung die einen Dienst beschreibt der gar nicht läuft, ist zwar harmlos — aber sie kann auch Vertrauen in die Dokument-Aktualität insgesamt untergraben. **Klärung und Synchronisation nötig.**

### 6.4 Anthropic API — Falsche Dokumentation

Die Datenschutzerklärung warnt: *"Wenn du den KI-Assistenten verwendest, werden deine Fragen an die Anthropic API übermittelt."* Der Code-Audit zeigt: Das ist **nicht der Fall**. Der Chatbot verwendet preprogrammierte Antworten ohne API-Calls.

Dies ist ein seltener Fall einer **zu umfangreichen** Datenschutzerklärung. Zwar ist "zu viel Information" weniger kritisch als zu wenig, aber das Nennen eines Dienstes der nicht genutzt wird, ist faktisch falsch. **Entfernen oder korrekt dokumentieren.**

### 6.5 Netlify USA-Transfer

Der Datenschutz erwähnt SCCs (Standardvertragsklauseln) gemäss Art. 46 DSGVO. Für das Schweizer DSG gilt: Übermittlungen in die USA sind nur zulässig wenn ein angemessener Datenschutz gewährleistet ist (DSG Art. 16/17). SCCs (jetzt: "Standarddatenschutzklauseln" im CH-Recht) sind ein gültiger Mechanismus. **Dokumentation ist grundsätzlich korrekt.**

**Kleines Problem:** Die Datenschutzerklärung nennt "Art. 46 DSGVO" als Basis — für Schweizer Recht müsste es Art. 16 Abs. 2 lit. d nDSG heissen. Wer sich nur auf Schweizer DSG beruft, muss die Schweizer Rechtsgrundlage nennen.

---

## 7. FIDLEG-Einordnung: Finanzdienstleistung?

### 7.1 Analyse der FIDLEG-Tatbestände

FIDLEG Art. 3 lit. c definiert Finanzdienstleistungen (FS). Die relevanten Ziffern:

| FIDLEG-Tatbestand | Anwendbar auf WealthWise? |
|---|---|
| **Ziff. 1:** Erwerb/Veräusserung von Finanzinstrumenten | Nein — kein Handel |
| **Ziff. 2:** Annahme von Aufträgen zu Finanzinstrumenten | Nein — keine Auftragsannahme |
| **Ziff. 3:** Verwaltung von Finanzinstrumenten | Nein — keine Verwaltung |
| **Ziff. 4:** Persönliche Empfehlungen zu Finanzinstrumenten | **Prüfung erforderlich** |
| **Ziff. 5:** Kreditgewährung | Nein |

**Ziff. 4 im Detail:** "Abgabe von persönlichen Empfehlungen zu Transaktionen mit Finanzinstrumenten unter Berücksichtigung der persönlichen Verhältnisse des Kunden."

**Sind AHV/BVG/3a "Finanzinstrumente"?**

FIDLEG Art. 3 lit. a definiert Finanzinstrumente exhaustiv: Aktien, Schuldtitel, kollektive Kapitalanlagen, strukturierte Produkte, Derivate, Geldmarktinstrumente. **AHV-Renten, PK-Guthaben und Säule-3a-Guthaben sind keine Finanzinstrumente im FIDLEG-Sinne.** Sie sind gesetzliche oder vertragliche Sozialversicherungsleistungen.

**Konsequenz:** Die Analyse und Empfehlungen von WealthWise bezüglich AHV/BVG/3a begründen **keine FIDLEG-Finanzdienstleistung**.

**Grenzfall: "Kapitalbezug statt Rente" bei PK**

Die Empfehlung, PK-Kapital zu beziehen statt Rente zu beziehen, könnte als Empfehlung zu einem "Finanzinstrument" qualifiziert werden — wenn das PK-Kapital dann in Wertschriften investiert wird. Die Empfehlung zum PK-Kapitalbezug an sich ist aber keine Transaktionsempfehlung. **Kein FIDLEG-Tatbestand.**

### 7.2 Abgrenzung Robo-Advisory

Robo-Advisory ist FIDLEG-bewilligungspflichtig (Art. 10 FIDLEG → Vermögensverwalter nach FINIG). WealthWise ist kein Robo-Advisory weil:
- Keine Verwaltung von Kundenvermögen
- Keine Transaktionsempfehlungen zu Finanzinstrumenten
- Keine treuhänderische Beziehung
- Kein Auftrag des Kunden

**WealthWise ist als "Informations- und Berechnungstool" einzustufen, nicht als Finanzdienstleister.**

### 7.3 SRO-Mitgliedschaft und Ombudsman

Da WealthWise kein Finanzdienstleister i.S.d. FIDLEG ist:
- Keine SRO-Mitgliedschaft erforderlich
- Kein Ombudsmann nach FIDLEG Art. 74 ff. erforderlich

**Empfehlung:** Diese Einschätzung sollte jedoch vor einem kommerziellen Launch durch einen qualifizierten Rechtsanwalt mit FINMA-Erfahrung verifiziert werden. Regulierungsrisiken ändern sich schnell.

### 7.4 Steuerberatung

Die Steuerberechnungen (Einkommenssteuer, Kapitalleistungssteuer, Eigenmietwert) könnten als "Steuerberatung" qualifizieren. Das Steuerberatungsrecht ist in der Schweiz jedoch **nicht reguliert** (kein Vorbehalt für bestimmte Berufsgruppen, keine Bewilligungspflicht). Einschränkung durch kantonale Anwaltsmono-pole nur für Rechtsdienstleistungen in Gerichtsverfahren.

**Fazit:** Keine regulatorischen Hürden für Steuerberechnungen, solange die Einschränkung auf "Schätzung / Illustration" klar kommuniziert wird.

---

## 8. Recht auf Löschung und Datenportabilität

### 8.1 Löschungsrecht (DSG Art. 32)

**Technisch vorhanden:** `resetStore()` via TopBar-Modal löscht alle Daten aus dem Zustand und damit aus localStorage.

**Rechtlich unzureichend:**
- Lösch-Button ist nicht auf der Datenschutzseite verlinkt
- Datenschutzseite sagt: *"gibt es keine Daten, die gelöscht ... wären"* — das ist formal zwar korrekt (kein Server), aber für den User verwirrend, da seine Browser-Daten sehr wohl löschbar sind
- Nutzer werden nicht darüber informiert, dass ein einfacher Reset-Button existiert

**Anforderung:** Datenschutzseite muss den Löschungspfad im Browser klar beschreiben, inkl. direktem Link/Button.

### 8.2 Datenportabilität (DSG Art. 28)

Das DSG sieht kein explizites Datenportabilitätsrecht vor (anders als DSGVO Art. 20). Das nDSG enthält kein entsprechendes Recht. WealthWise bietet keinen JSON/CSV-Export der Rohdaten an — das ist für das nDSG **kein Mangel**.

**Aber:** Der PDF-Export (Screen 4) bietet de facto eine Portabilität der Analyse-Ergebnisse, was positiv zu werten ist.

### 8.3 Auskunftsrecht (DSG Art. 25)

DSG Art. 25 gewährt das Recht auf Auskunft gegenüber dem Verantwortlichen über verarbeitete Daten. Da WealthWise keine Daten auf Servern speichert, kann der Verantwortliche legitimer-weise antworten: *"Wir verarbeiten Ihre Daten ausschliesslich client-seitig in Ihrem Browser. Wir haben keinen Zugriff auf Ihre Daten und können keine Auskunft über spezifische Inhalte erteilen."*

Dies ist rechtlich zulässig und korrekt. Die Datenschutzerklärung sollte jedoch erläutern, wie Auskunftsbegehren behandelt werden (auch wenn die Antwort "keine Daten vorhanden" ist).

---

## 9. Impressum — Pflichtangaben und Mängel

### 9.1 Aktueller Stand

Das Impressum enthält:
- Firma: "WealthWise" ✓
- Adresse: "8808 Pfäffikon SZ · Schweiz" ✓
- E-Mail: info@wealthwise.ch ✓

### 9.2 Fehlende Pflichtangaben

| Pflichtangabe | Vorhanden? | Rechtliche Grundlage |
|---|---|---|
| Name der natürlichen Person (Betreiber) | ❌ **Fehlt** | Art. 3 ZGB; UWG-Transparenzgebot |
| Rechtsform (Einzelfirma? GmbH? Verein? Privatperson?) | ❌ **Fehlt** | OR 944 (bei Einzelfirma) |
| UID-Nummer (falls im HR eingetragen) | N/A | Nur wenn eingetragen |
| Telefonnummer | Empfohlen | — |
| Bei Thesis: Hochschulzugehörigkeit | ❌ **Fehlt** | Transparenzgebot; keine Pflicht, aber wichtig |

**Kritisches Problem:** Die Bezeichnung "WealthWise" ohne dahinterstehende natürliche Person oder juristische Person ist rechtlich ungenügend. Jede im Wirtschaftsleben tätige Person muss erkennbar sein. Falls WealthWise eine Masterarbeit ist, muss dies klar kommuniziert werden:

- Für den Nutzer ist unklar, wer hinter dem Tool steht
- "info@wealthwise.ch" ist anonym — wer antwortet?
- Unklar ob es ein kommerzielles Produkt, ein Startup oder eine Hochschularbeit ist

**Rechtliche Einordnung:** Bei einem Prototyp/Thesis ohne kommerzielle Absicht gelten reduzierte Anforderungen, aber die Grundidentifikation (Name des Erstellers) ist unabdingbar.

### 9.3 Haftungsausschluss im Impressum

Der Haftungsausschluss ist vorhanden aber enthält eine Problematik:
> *"Haftungsansprüche ... werden ausgeschlossen."*

Diese pauschale Formulierung ist nach Schweizer Recht **nur teilweise wirksam** — Haftung für Vorsatz und grobe Fahrlässigkeit kann nach OR 100 Abs. 1 nicht ausgeschlossen werden. Die Formulierung sollte präzisiert werden.

---

## 10. Minderjährigenschutz und vulnerable Personen

### 10.1 Altersverifizierung

Das Tool richtet sich an Personen kurz vor der Pensionierung (50–65 Jahre). Eine Altersverifikation ist nicht implementiert. Da:
- Das Tool für Minderjährige nicht schädlich ist (keine Verträge, keine Transaktionen)
- Das Schweizer Recht keine allgemeine Alterspflicht für Informationsangebote kennt
- Die Eingabe falscher Daten zu nutzlosen (nicht schädlichen) Ergebnissen führt

**Risiko: Gering.** Keine regulatorische Anforderung.

### 10.2 Vulnerable Personen und Ergänzungsleistungen

Screen 4 enthält einen EL-Hinweis (Ergänzungsleistungen). Dieser ist heikel, da:
- EL-Anspruch setzt individuelle Berechnung durch AHV-Zweigstelle voraus
- Faktoren wie Vermögensfreibeträge, Miete, Gesundheitskosten variieren stark
- Ein "You might qualify" Hinweis ohne expliziten Disclaimer kann falsche Erwartungen wecken

**Aktuelle Disclaimer-Formulierung:** "EL-Berechnungen sind Schätzungen – die tatsächliche Berechnung erfolgt durch die zuständige AHV-Zweigstelle." → Ausreichend, aber sollte bei EL-Hinweis direkt erscheinen, nicht nur in einem allgemeinen Hinweiskasten.

---

## 11. Mängel im aktuellen Stand (Priorisiert)

### 🔴 KRITISCH — Sofortige Korrektur erforderlich

**M1: "Schweizer Server" Behauptung auf Landing Page**
- Hosting via Netlify USA ist dokumentiert
- Die Aussage "Schweizer Server" ist objektiv falsch
- **Aktion:** Sofortige Entfernung; ersetzen durch "Keine Daten auf unseren Servern"

**M2: "Daten nach Schliessung der Seite verworfen" — falsch**
- localStorage persistiert explizit
- **Aktion:** Formulierung in Datenschutzerklärung korrigieren

**M3: Impressum ohne Betreiber-Identität**
- Name der natürlichen Person fehlt
- Rechtsform fehlt
- Falls Thesis: Hochschulzugehörigkeit fehlt
- **Aktion:** Vollständige Angaben ergänzen

**M4: Keine CSP-Headers**
- XSS-Angriff auf localStorage mit hochsensiblen Finanzdaten möglich
- **Aktion:** Content-Security-Policy in netlify.toml / `public/_headers` implementieren

### 🟡 WICHTIG — Binnen 30 Tagen beheben

**M5: openplzapi.org nicht dokumentiert**
- Drittanbieter-Transfer ohne Information
- **Aktion:** In Datenschutzerklärung unter "Drittanbieter" ergänzen

**M6: Anthropic API — Datenschutzerklärung falsch**
- Chatbot ist preprogrammed, kein API-Call
- **Aktion:** Anthropic-Abschnitt aus Datenschutzerklärung entfernen oder korrigieren

**M7: Plausible Analytics — Diskrepanz Repo vs. Datenschutzerklärung**
- Script nicht im Repo gefunden
- **Aktion:** Klären ob Plausible aktiv ist; Datenschutzerklärung entsprechend aktualisieren

**M8: Haftungsausschluss-Formulierung pauschaler Ausschluss**
- OR 100 Abs. 1 schränkt Haftungsausschluss für Vorsatz/grobe Fahrlässigkeit ein
- **Aktion:** Formulierung präzisieren

**M9: Lösch-Button Sichtbarkeit**
- resetStore() vorhanden aber nicht prominent kommuniziert
- **Aktion:** Datenschutzseite mit direktem Hinweis + Link ergänzen

**M10: Disclaimer bei Empfehlungen fehlt inline**
- Handlungsempfehlungen wie "PK-Einkauf prüfen" ohne Kontext-Disclaimer
- **Aktion:** Kurzen Inline-Disclaimer bei jeder quantifizierten Empfehlung

### 🟢 EMPFOHLEN — Bei Gelegenheit verbessern

**M11:** DSG Art. 46 DSGVO-Referenz durch CH-Rechtsgrundlage (Art. 16 nDSG) ergänzen  
**M12:** Auskunftsbegehren-Prozess in Datenschutzerklärung beschreiben  
**M13:** Upload-Disclaimer für IK-Auszug (nicht nur PK-Ausweis) ergänzen  
**M14:** Hinweis beim ersten App-Aufruf: localStorage-Nutzung erklären  

---

## 12. Formulierungsvorschläge

### 12.1 Haupt-Disclaimer (Screen 4, vor Ergebnissen — sichtbar)

```
⚠️ Berechnungsgrundlagen und Haftung

Die folgenden Analysen basieren auf Ihren Angaben und den offiziellen 
AHV/BVG/Steuerdaten 2026. WealthWise ist ein Informationstool — 
keine Finanz-, Steuer- oder Rechtsberatung.

Die Berechnungen sind Schätzungen auf Basis vereinfachter Modelle. 
Tatsächliche Beträge können abweichen. Investitionsentscheidungen, 
PK-Einkäufe, Kapitalbezüge und Pensionierungszeitpunkte sollten 
stets mit Ihrer Pensionskasse, einem Steuerberater oder einem 
zugelassenen Finanzplaner besprochen werden.

WealthWise übernimmt keine Haftung für Entscheidungen, die auf 
Basis dieser Berechnungen getroffen werden.
```

### 12.2 Empfehlungs-Disclaimer (inline, bei jeder Handlungsempfehlung)

```
ℹ️ Diese Berechnung ist eine Orientierungshilfe — keine persönliche 
Empfehlung. Individuelle Umstände können das Ergebnis wesentlich 
verändern. Bitte konsultieren Sie eine Fachperson vor Entscheid.
```

### 12.3 Upload-Hinweis (direkt beim IK-Auszug/PK-Upload)

```
🔒 Ihr Dokument wird ausschliesslich lokal in Ihrem Browser 
verarbeitet. Es wird nicht auf einen Server übertragen, nicht 
gespeichert und nach Extraktion der Zahlen sofort verworfen. 
Gespeichert werden nur: [Beitragsjahre / PK-Kapital, Umwandlungssatz].
Die AHV-Nummer und Arbeitgeber-Angaben werden nicht gespeichert.
```

### 12.4 localStorage-Hinweis (Datenschutzerklärung — korrigierte Fassung)

```
Ihre Eingaben werden im lokalen Browserspeicher (localStorage) 
Ihres Geräts gespeichert, damit Sie die Analyse unterbrechen und 
später fortsetzen können. Diese Daten bleiben auf Ihrem Gerät 
gespeichert, bis Sie sie aktiv löschen — sie werden nicht automatisch 
gelöscht und verlassen Ihr Gerät nicht.

Sie können alle gespeicherten Daten jederzeit löschen:
→ In der App: Menü → "Neue Analyse starten" (löscht alle Eingaben)
→ Im Browser: Browser-Verlauf / Cookies und Cache löschen → 
   Eintrag "wealthwise.ch" entfernen

Hinweis: Auf gemeinsam genutzten Geräten (Bibliothek, Büro) empfehlen 
wir, die Daten nach der Nutzung aktiv zu löschen.
```

### 12.5 Datenschutzerklärung Mindestinhalt

Eine vollständige Datenschutzerklärung gemäss nDSG Art. 19 muss enthalten:

```
1. Identität und Kontakt der verantwortlichen Person [Name, Adresse]
2. Welche Daten verarbeitet werden [Liste]
3. Zweck der Verarbeitung [Vorsorgeanalyse, Sitzungsfortsetzung]
4. Empfänger der Daten [Netlify für Hosting, openplzapi.org für PLZ]
5. Dauer der Speicherung [bis zur Löschung durch den Nutzer]
6. Rechte der betroffenen Person [Information, Berichtigung, Löschung]
7. Übermittlungen ins Ausland [Netlify USA, mit SCC-Basis nach Art. 16 nDSG]
8. Wie Rechte ausgeübt werden können [Kontakt, Browser-Löschung]
```

### 12.6 Impressum Mindestinhalt (Thesis-Prototyp)

```
Betreiber / Verantwortlicher:

[Vorname Nachname]
[Strasse, PLZ Ort]
[E-Mail]

Hochschulkontext:
Dieses Tool wurde im Rahmen einer [Masterarbeit / Bachelorarbeit] an 
der [Hochschulname] entwickelt. Es handelt sich um einen Prototyp zu 
Forschungszwecken. Das Tool erhebt keinen Anspruch auf Vollständigkeit 
oder Richtigkeit.

Rechtsform: Privatperson (kein eingetragenes Unternehmen)
```

### 12.7 FIDLEG-Abgrenzungsformulierung

```
WealthWise ist ein digitales Berechnungs- und Informationswerkzeug 
für die persönliche Vorsorgeplanung. Es handelt sich ausdrücklich 
NICHT um:
• Eine Finanzdienstleistung im Sinne des FIDLEG
• Eine persönliche Anlage- oder Finanzempfehlung
• Eine Rechts- oder Steuerberatung
• Ein bewilligungspflichtiges Finanzinstitut (FINIG)

Die dargestellten Berechnungen und Szenarien dienen der allgemeinen 
Information und Illustration. Verbindliche Entscheidungen erfordern 
individuelle Fachberatung.
```

### 12.8 Cookie/localStorage Erstaufruf-Banner

```
Diese App speichert Ihre Eingaben lokal in Ihrem Browser 
(localStorage), damit Sie später weitermachen können.

• Keine Übertragung an Server
• Kein Tracking, keine Cookies
• Daten jederzeit löschbar

[Verstanden — Analyse starten]   [Datenschutz lesen]
```

### 12.9 EL-Hinweis (Ergänzungsleistungen)

```
Möglicher EL-Anspruch — Schätzung

Diese Berechnung basiert auf vereinfachten Annahmen. Der tatsächliche 
EL-Anspruch wird individuell durch Ihre zuständige AHV-Zweigstelle 
berechnet und hängt von Faktoren ab, die hier nicht erfasst werden 
(Mietkosten, Krankheitskosten, Vermögensfreibeträge nach ELG Art. 9).

Lassen Sie Ihren Anspruch kostenlos prüfen: 
→ AHV-Zweigstelle Ihres Wohnkantons
```

---

## 13. Gesamtempfehlung: Thesis-Prototyp

### Ist WealthWise in der aktuellen Form rechtlich vertretbar?

**Ja — mit sechs Sofortmassnahmen.**

WealthWise hat eine technisch solide Datenschutz-Architektur: client-side Verarbeitung, keine Server-Daten, kein Tracking, selbst-gehostete Bibliotheken. Das ist besser als 90% vergleichbarer Tools.

Die Risiken liegen nicht in der Technologie, sondern in der **Kommunikation**:

1. ✅ Entfernen: "Schweizer Server" Behauptung → **Heute**
2. ✅ Korrigieren: localStorage-Persistenz-Beschreibung → **Heute**
3. ✅ Ergänzen: Name des Betreibers im Impressum → **Heute**
4. ✅ Ergänzen: CSP-Headers in Deployment-Config → **Diese Woche**
5. ✅ Ergänzen: openplzapi.org in Datenschutzerklärung → **Diese Woche**
6. ✅ Ergänzen: Anthropic-Abschnitt korrigieren oder entfernen → **Diese Woche**

### Für den akademischen Kontext spezifisch:

Falls es sich um eine Masterarbeit handelt, empfehle ich explizit:
- Im Impressum und auf der Landing Page klar als "Forschungsprototyp" kennzeichnen
- Satz: *"Dieses Tool wurde im Rahmen einer Masterarbeit entwickelt und dient Forschungszwecken. Es erhebt keinen Anspruch auf Vollständigkeit oder kommerzielle Eignung."*
- Diese Transparenz **schützt** den Ersteller erheblich und ist bei Akademikern üblich

### Regulatorische Gesamtbewertung:

| Bereich | Status |
|---|---|
| FIDLEG | Nicht anwendbar — kein Finanzdienstleister ✓ |
| FINMA-Bewilligung | Nicht erforderlich ✓ |
| SRO-Mitgliedschaft | Nicht erforderlich ✓ |
| DSG-Konformität | Teilweise — 6 Korrekturen erforderlich |
| DSGVO-Konformität | Grundsätzlich gut — kleinere Korrekturen |
| UWG (Irreführung) | 2 falsche Aussagen korrigieren |

---

*Dieses Dokument wurde auf Basis einer Code-Analyse (Mai 2026) erstellt und ersetzt keine individuelle Rechtsberatung. Für einen kommerziellen Launch empfehle ich eine Prüfung durch einen auf Schweizer FinTech-Recht spezialisierten Rechtsanwalt.*
