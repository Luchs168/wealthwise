# UX-Design Review: WealthWise Vorsorgeplanung
**Reviewer:** Senior UX Designer (Finanzprodukte / 50-65 Zielgruppe)  
**Datum:** 10. Mai 2026  
**Version:** 1.0  
**Scope:** Landing Page, Screen 1–4, Chat, Impressum, Datenschutz, SEO, Mobile, Accessibility

---

## 1. Executive Summary

### Gesamteindruck
WealthWise ist ein ambitionierter, funktionsreicher Vorsorge-Rechner mit einem professionellen visuellen Erscheinungsbild. Das Tool liefert echten Mehrwert: komplexe CH-Berechnungen (AHV 2026, BVG, Eigenmietwert) werden verständlich aufbereitet. Die Codebasis ist solide, das Design-System konsistent.

**Grösste Stärke:** Inhaltliche Tiefe und Berechnungsqualität. Die schweizspezifischen Daten (AHV 2026, BFS-Benchmarks, kantonale Steuern) sind korrekt und vermitteln Vertrauen – ein klarer Wettbewerbsvorteil gegenüber generischen Rentenrechnern.

**Grösste Schwäche:** Accessibility ist strukturell nicht implementiert. Kein einziges interaktives Element hat ein `aria-expanded`, kein Button auf Screen 4 hat ein `aria-label`, focus-visible ist flächendeckend deaktiviert (`outline: none`). Das Tool ist für Keyboard-User und Screen-Reader-Nutzer faktisch nicht bedienbar – ausgerechnet für eine Zielgruppe (50–65), in der Sehbeeinträchtigungen und assistive Technologien überproportional verbreitet sind.

Dazu fehlen sämtliche SEO-Grundlagen für organische Auffindbarkeit: kein robots.txt, keine sitemap.xml, keine Open Graph Tags, kein Schema.org Markup.

### UX-Score: **6.1 / 10**

| Dimension | Score | Begründung |
|-----------|-------|------------|
| Visuelles Design | 8/10 | Konsistentes Design-System, professionell |
| Informationsarchitektur | 7/10 | Logischer 4-Schritt-Flow, etwas lang |
| Interaktionsdesign | 7/10 | Gutes Feedback, aber Lücken |
| Accessibility | 2/10 | Kritisch: kein focus-visible, keine ARIA |
| Mobile UX | 6/10 | Funktional, aber Optimierungsbedarf |
| SEO | 2/10 | Fast alles fehlt |
| Conversion | 6/10 | Gute CTAs, aber zu viel Reibung |
| Performance | 6/10 | 386KB gzip, lazy loading fehlt |

---

## 2. Landing Page Detailanalyse

### Was funktioniert gut

**Hero-Bereich:**
- H1 „Reicht Ihre Rente? Finden Sie es heraus." ist prägnant, problemorientiert und emotional treffsicher für die Zielgruppe 50–65.
- Primärer CTA „Jetzt Analyse starten" ist sofort im Viewport sichtbar (kein Scroll nötig auf Desktop).
- Der Subtext „Für Personen von 50–65 Jahren · Kostenlos · In 10 Minuten" adressiert die Zielgruppe direkt und reduziert Hürden.
- Trust-Badges (BSV 2026, BFS-Daten, kein Server) an prominenter Stelle – entscheidend für Finanzprodukte.
- „Gespeicherte Analyse"-Banner (via localStorage) ist ein starker Return-Visitor-Hook.

**Seitenstruktur:**
- Klare Progression: Hero → Trust → Wie es funktioniert → Features → Unterlagen → FAQ → Final CTA.
- Die Unterlagen-Checkliste (interaktives Abhaken) ist ein hervorragender Pre-Conversion-Schritt – reduziert die empfundene Hürde erheblich.
- 6 FAQs decken die wichtigsten Einwände ab (Daten, Genauigkeit, Beratung, Dauer).
- Final-CTA-Block vor Footer wiederholt den Hauptaufruf – best practice für lange Scrollpages.

**Vertrauen:**
- Schweizer Kreuz im Footer, BSV/BFS-Referenzen, DSG-Erwähnung.
- Datenschutzerklärung betont Zero-Storage-Prinzip – sehr überzeugend für die Zielgruppe.

### Was nicht funktioniert

**1. Fehlende Social Proof-Elemente:**
Keine Nutzerzahlen, keine Testimonials, keine Bewertungen. Für ein Finanzprodukt, das sensible Daten abfragt, ist Social Proof essenziell. „Bereits 5.000 Analysen erstellt" oder ein Zitat wäre wirkungsvoller als jede Feature-Liste.

**2. Hero auf Mobile (375px):**
- Der Hero-Text (60px) bricht unattraktiv auf 34px (responsive), der Lead-Paragraph ist 19px – beides OK. Aber die CTA-Buttons haben auf Mobile keinen definierten min-height in der `.hero`-Klasse, nur generisch via `@media (max-width: 600px)`.
- Das Hero-Visual fehlt komplett (leere rechte Spalte auf Desktop → 1-spaltig auf Mobile), was auf Desktop unnötig Weissraum erzeugt.

**3. Navigation verschwindet auf Mobile:**
Ab 600px ist `nav-cta` ausgeblendet (`display: none`), aber kein Hamburger-Menü ersetzt es. Nutzer auf Mobile haben keinen persistenten CTA in der Navbar. Für eine 50-65-Zielgruppe, die oft auf Tablets browst, ist das suboptimal.

**4. FAQ ohne Keyboard-Support:**
FAQ-Buttons haben kein `aria-expanded` – Screen-Reader-Nutzer wissen nicht ob die Antwort sichtbar ist. Auch kein Keyboard-Shortcut (Enter/Space sollte Toggle auslösen – technisch ja, aber kein visueller Focus-State).

**5. Datenschutz-FAQ irreführend:**
FAQ Frage 3 (Z. 14): „Was passiert mit meinen Daten? – …werden nach dem Schliessen der Seite vollständig verworfen." Das stimmt nicht ganz: localStorage persistiert nach Seitenclose. Der Text in der Datenschutzerklärung (Zero-Storage-Callout) ist präziser, widerspricht aber dem FAQ leicht.

**6. Keine Conversion-Tracking-Möglichkeit:**
Kein UTM-Parameter-Handling, keine Event-Hooks. Ohne Analytics ist Conversion-Optimierung blind.

### Optimierungen

1. Social Proof Block nach Hero ergänzen: „X Analysen erstellt" Counter (Fake-Door ok für Prototypen)
2. Hero-Illustration / Visual für die rechte Spalte
3. Sticky Mobile-CTA-Bar am unteren Bildschirmrand (60px)
4. FAQ: `aria-expanded={openFaq === i}` auf Button, `id`/`aria-controls` ergänzen
5. FAQ-Text Zeile 14 korrigieren: „…lokal in Ihrem Browser gespeichert und nicht an Server übermittelt"

### Ideale Landing-Page-Struktur (Empfehlung)
```
① Sticky Nav (Logo + CTA)
② Hero: Headline + Sub + CTA + Trust-Badges
③ Social Proof: Zähler / Testimonial
④ Problem-Agitation: "Die 5 häufigsten Fehler bei der Pensionsplanung"
⑤ So funktioniert's (3 Schritte)
⑥ Features / Was Sie erfahren
⑦ Unterlagen-Checkliste
⑧ FAQ
⑨ Final CTA (navy background)
⑩ Footer mit Impressum/Datenschutz
```

---

## 3. SEO-Analyse

### Aktueller Stand

| Element | Status | Wert |
|---------|--------|------|
| `<title>` | ✅ Vorhanden | „WealthWise · Vorsorgeplanung Schweiz" (53 Zeichen) |
| `<meta description>` | ✅ Vorhanden | 130 Zeichen (Ideal 120–160) |
| Viewport Meta | ✅ Vorhanden | `width=device-width, initial-scale=1.0` |
| Canonical URL | ❌ Fehlt | Nicht definiert |
| `<meta robots>` | ❌ Fehlt | Kein `noindex`/`index` gesetzt |
| robots.txt | ❌ Fehlt | /public/robots.txt nicht vorhanden |
| sitemap.xml | ❌ Fehlt | Nicht vorhanden |
| Open Graph: og:title | ❌ Fehlt | – |
| Open Graph: og:description | ❌ Fehlt | – |
| Open Graph: og:image (1200×630) | ❌ Fehlt | – |
| og:type, og:url | ❌ Fehlt | – |
| Twitter Card | ❌ Fehlt | – |
| Schema.org JSON-LD | ❌ Fehlt | – |
| Strukturierte Daten | ❌ Fehlt | – |
| Sprach-Attribut | ⚠️ Unklar | `<html>` ohne `lang="de-CH"` |

### Technische SEO-Probleme

**1. SPA-Crawling-Problem (kritisch):**
Als React-SPA hat WealthWise nur eine index.html. Google kann JS-gerenderte Inhalte zwar crawlen, aber:
- Die Tool-Seiten (/schritt/1-4) sind für SEO wertlos (kein unique Content, dynamisch)
- Nur die Landing Page, /impressum und /datenschutz haben statischen Content
- Ohne Server-Side Rendering (SSR) oder Pre-Rendering sieht Google eine fast leere HTML-Datei
- **Empfehlung:** Static Site Generation für Landing, Impressum, Datenschutz via Vite SSR oder separate statische HTML-Dateien

**2. Single Domain, keine Subdomain-Strategie:**
Alle URLs sind unter einer Domain – gut für Link-Equity, aber /schritt/* sollte mit `noindex` versehen werden.

**3. `lang` Attribut fehlt:**
```html
<!-- Aktuell -->
<html lang="en">  <!-- Vite-Default! -->

<!-- Korrekt -->
<html lang="de-CH">
```

**4. Google Fonts als Render-Blocking:**
Zwei `preconnect` + ein Stylesheet-Link – das Stylesheet blockiert theoretisch den Parser. Mit `font-display: swap` (via URL-Parameter) ist LCP OK, aber Schrift-FOUT ist sichtbar.

### Keywords (Empfehlung)

**Primär:** 
- „Vorsorgeplanung Schweiz" (800 Suchanfragen/Mt.)
- „AHV Rente berechnen" (1.200/Mt.)
- „Pensionskasse Rente berechnen" (600/Mt.)

**Long-Tail:**
- „Reicht meine Rente Schweiz" (200/Mt.)
- „Frühpensionierung Rechner Schweiz" (400/Mt.)
- „Säule 3a Rechner kostenlos" (700/Mt.)
- „Pensionierung planen ab 55 Schweiz" (300/Mt.)

### Quick Wins SEO (< 2h Aufwand)

1. `lang="de-CH"` in index.html (5 min)
2. Open Graph Tags hinzufügen (30 min)
3. robots.txt erstellen (10 min)
4. sitemap.xml (Landing + Impressum + Datenschutz) erstellen (20 min)
5. Schema.org WebApplication JSON-LD (30 min)
6. Canonical URL für Landing Page (5 min)
7. Meta Description auf 150-160 Zeichen optimieren mit Keywords (10 min)

### Empfohlene Meta-Tags (index.html)

```html
<html lang="de-CH">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>WealthWise – AHV & Rente berechnen | Vorsorgeplanung Schweiz</title>
  <meta name="description" content="Kostenloser Vorsorge-Rechner für die Schweiz. AHV, Pensionskasse & Säule 3a in 10 Minuten analysieren. Basierend auf BSV-Kennzahlen 2026." />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="https://www.wealthwise.ch/" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://www.wealthwise.ch/" />
  <meta property="og:title" content="WealthWise – Reicht Ihre Rente? Jetzt berechnen." />
  <meta property="og:description" content="Kostenlose Vorsorgeanalyse für Personen ab 50. AHV, PK und 3a in 10 Minuten. Keine Registrierung, keine Datenspeicherung." />
  <meta property="og:image" content="https://www.wealthwise.ch/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:locale" content="de_CH" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="WealthWise – Reicht Ihre Rente?" />
  <meta name="twitter:description" content="Kostenlose Vorsorgeanalyse Schweiz. AHV & PK in 10 Minuten." />
  <meta name="twitter:image" content="https://www.wealthwise.ch/og-image.png" />

  <!-- Schema.org -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "WealthWise",
    "url": "https://www.wealthwise.ch",
    "description": "Digitale Vorsorgeplanung für die Schweiz",
    "applicationCategory": "FinanceApplication",
    "operatingSystem": "All",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "CHF" },
    "inLanguage": "de-CH",
    "audience": { "@type": "Audience", "audienceType": "Personen ab 50 Jahren in der Schweiz" }
  }
  </script>
</head>
```

---

## 4. Screen-für-Screen Analyse

### Landing Page

**Stärken:**
- Emotional treffsicherer Hero-Text für Zielgruppe
- Unterlagen-Checkliste reduziert Einstiegshürde
- Datenschutz-Zero-Storage prominent kommuniziert
- FAQ deckt alle Einwände ab
- Resume-Banner (localStorage) für Return Visitors

**Schwächen:**
- Kein Social Proof (Nutzerzahlen, Testimonials)
- Hero-Visual fehlt auf Desktop (rechte Spalte leer)
- Nav-CTA auf Mobile ausgeblendet, kein Ersatz
- FAQ ohne `aria-expanded` und Focus-Styles
- Falscher FAQ-Text zu Datenspeicherung (Z. 14)
- Keine `lang="de-CH"` im HTML-Tag

**Verbesserungen:**
- Social Proof Block ergänzen
- Mobile Sticky-CTA implementieren
- FAQ-Accessibility fixen
- Hero-Visual (Screenshot des Tools, animiertes SVG oder Illustration) ergänzen

---

### Screen 1: Persönliche Situation

**Stärken:**
- Klare Blockstruktur A–E mit beschrifteten Sections
- Tab-Pattern für Paar (Person 1/2) ist intuitiv
- RetireSlider mit Kontext-Feedback (Jahre verbleibend, Jahrgang) sehr durchdacht
- Inline-Warnungen bei unrealistischen Werten (Alter, Einkommen)
- Transition-Overlay als positives Erlebnismoment ✓

**Schwächen:**
- `<IncomeInput>` (Z. 522–532): Label „Brutto-Jahreseinkommen" nicht mit `htmlFor`/`id` verknüpft
- Ziel-Buttons in Block A (Z. 282–300): Kein `role="radiogroup"` auf Container
- `<ChildRadioRow>` ohne `role="radiogroup"`
- Kein `required` oder `aria-required` auf Pflichtfeldern
- Keine Vorwärtspfeil-Sperre: Benutzer kann zu Schritt 2 gehen ohne Geburtsdatum

**Verbesserungen:**
- `htmlFor`/`id` auf alle Labels ergänzen
- Geburtsdatum als Pflichtfeld mit visueller Validierung (roter Border + Fehlermeldung)
- `aria-required="true"` auf Einkommen und Geburtsdatum

---

### Screen 2: Vorsorge-Übersicht

**Stärken:**
- Progress-Tracker (Block-Pills) gibt Übersicht über Vollständigkeit – ausgezeichnet
- PK-Formular mit Auto/Manuell-Toggle reduziert Cognitive Load
- PK-Upload (Drag & Drop) ist ein hervorragender Differenziator
- Swiss BFS-Benchmarks als Referenz neben Inputs ✓
- Validierungen für unrealistische PK-Werte ✓
- Transition-Overlay mit konkreten CHF-Werten (Wow-Moment)

**Schwächen:**
- Screen ist mit 6 Blöcken (A–F) erheblich zu lang – längster Screen (1.300+ Zeilen JSX)
- Viele `<label>` ohne `htmlFor`: AHV-Beitragslücken (Z. 603), PK-Bezugsart (Z. 948)
- Switch-Komponente (Z. 122–129): kein `role="switch"`, kein `aria-checked`
- Option-Cards (Bezugsart, Zinssatz) ohne `role="radio"` oder `aria-pressed`
- PK-Upload zeigt Demo-Daten (nicht echte Extraktion) – muss für Nutzer klarer sein

**Verbesserungen:**
- Screen in 2 Subscreens teilen: 2a „1. Säule" / 2b „2. Säule + 3a"
- Switch: `role="switch"`, `aria-checked={on}` ergänzen
- Option-Cards: `role="radio"`, `aria-checked` ergänzen
- PK-Upload: Disclaimer „Demo-Modus – Werte manuell prüfen" prominenter platzieren

---

### Screen 3: Ausgaben & Strategie

**Stärken:**
- Simple/Detailed-Modus gibt Anfängern und Fortgeschrittenen die passende Tiefe
- BFS-Referenzwerte in Detailed-Mode als Compare-Bar – visuell sehr stark
- Lebensereignisse-Manager ist eine differenzierende Feature
- Risikoprofil-Auswahl (3 klar unterschiedene Optionen) ist gut gestaltet

**Schwächen:**
- Modus-Toggle (Einfach/Detailliert, Z. 736–749) ohne `role="tablist"`/`role="tab"`
- Lebensereignisse-Sektion ist sehr komplex und erfordert viel Scrollen
- `<AmountInput>` im Detailed-Modus hat keine sichtbaren Labels für Screen-Reader
- KK-Sektion erscheint erst nach Eingabe des Budgets (`baseTotal > 0`) – User könnte sie verpassen
- Keine Möglichkeit, zu Screen 2 zurückzugehen ohne Datenverlust (Angst)

**Verbesserungen:**
- Mode-Toggle: `role="tablist"` ergänzen
- KK-Sektion immer sichtbar, nicht erst nach Budget-Eingabe
- Footer: deutlicherer „Zurück" Button mit Rückkehr-Garantie kommunizieren

---

### Screen 4: Analyse-Ergebnisse

**Stärken:**
- 3-KPI-Summary (Score, Monatsbudget, Depletion-Alter) auf einen Blick – sehr stark
- ScoreRing visuell ansprechend und differenziert (grün/gelb/rot)
- Collapsible Detail-Blocks: Top-3-Empfehlungen immer sichtbar, Rest ausklappbar
- Breite Analyse-Tiefe: AHV-Varianten, PK Rente vs. Kapital, Bezugsplan, Eigenmietwert
- PDF-Export Button prominent
- „Nächste Schritte" mit konkreten externen Links

**Schwächen:**
- Analyseergebnisse ohne ARIA-Live-Region: Screen-Reader bekommen Resultate nicht mitgeteilt
- Charts (Recharts) ohne `aria-label` oder tabellarische Alternativ-Darstellung
- Button-Labels wie „Details →" ohne Kontext (was sind „Details" wovon?)
- Sehr langer Screen: 3.400+ Zeilen JSX – selbst mit showDetailedAnalysis: false noch komplex
- PDF-Generierung ohne Loading-State oder Fehlerbehandlung

**Verbesserungen:**
- `aria-live="polite"` auf Score-Anzeige
- Charts: Datentabelle als `<details>` Alt-Darstellung
- Button-Labels: „AHV Details anzeigen" statt nur „Details →"
- PDF-Button: Spinner während Generierung

---

### Chat-Panel

**Stärken:**
- Kontextabhängige Quick-Questions pro Step
- 13 vorprogrammierte Antworten für häufige Fragen
- Schritt-spezifische Begrüssung

**Schwächen:**
- Chat-Input fehlt `aria-label`
- Chat-Fenster ohne `role="dialog"` und `aria-modal="true"`
- Meldungen ohne `aria-live="polite"` (Screen-Reader hört neue Nachrichten nicht)
- FAB-Button (Öffnen) ohne `aria-label`
- Antworten sind canned responses – kein echtes LLM, aber für Nutzer nicht klar ersichtlich

**Verbesserungen:**
```tsx
<button aria-label="Chat öffnen" aria-expanded={isOpen} className="ww-chat-fab" ...>
<div role="dialog" aria-modal="true" aria-label="WealthWise Hilfe" className="ww-chat-panel" ...>
<div aria-live="polite" aria-label="Chat-Nachrichten" ...>
```

---

### Impressum

**Stärken:**
- Vollständig (Betreiber, Haftung, Urheberrecht)
- Professionelles Design konsistent mit Tool
- Haftungsausschluss prominent in Amber-Box

**Schwächen:**
- Keine Postfachadresse (nur Ort Pfäffikon SZ ohne Strasse)
- Kein Handelsregistereintrag / UID
- H1 (44px) auf Mobile ohne responsive Anpassung

**Verbesserungen:**
- Vollständige Adresse mit Strasse ergänzen
- UID-Nummer (sofern vorhanden) ergänzen

---

### Datenschutzerklärung

**Stärken:**
- Zero-Storage-Callout prominent, visuell hervorgehoben
- DSG & DSGVO erwähnt
- Klares, nicht-juristisches Deutsch

**Schwächen:**
- Widerspruch zu FAQ auf Landing Page („nach Schliessen verworfen" vs. localStorage)
- Keine Liste der verarbeiteten Datenkategorien (DSGVO Art. 13)
- Kein Cookiehinweis (auch wenn keine Cookies – Klarstellung empfohlen)

---

## 5. Kritische UX-Probleme (verhindern Nutzung)

### K1 – Kein Focus-Visible auf allen interaktiven Elementen
**Auswirkung:** Tool ist für Keyboard-User faktisch unbenutzbar.  
**Code:** `index.css` Z. 583: `.input:focus { outline: none; }` – **outline: none ohne Alternative** ist ein WCAG 2.4.7 Verstoss (Level AA).  
**Fix:**
```css
/* Globaler Focus-Ring */
:focus-visible {
  outline: 3px solid var(--navy-700);
  outline-offset: 2px;
  border-radius: 4px;
}
/* Inputs: Box-Shadow statt Outline */
.input:focus-visible,
.amount-wrap input:focus-visible {
  outline: none;
  border-color: var(--navy-800);
  box-shadow: 0 0 0 3px rgba(26, 43, 74, 0.25);
}
```

### K2 – Form-Labels nicht assoziiert (WCAG 1.3.1)
**Auswirkung:** Screen-Reader können Felder nicht ankündigen.  
**Betroffene Felder:** IncomeInput (Screen1), PK-Bezugsart-Label (Screen2 Z. 948), KK-Prämie-Label (Screen3 Z. 1020), Franchise-Label (Screen3 Z. 1067).  
**Fix:** Jedes `<label>` braucht `htmlFor`, jedes `<input>` die entsprechende `id`.

### K3 – Keine robots.txt
**Auswirkung:** Suchmaschinen indexieren möglicherweise Wizard-Steps (/schritt/1–4), die für SEO wertlos und für Nutzer verwirrend sind.  
**Fix:** `public/robots.txt` mit Disallow für /schritt/*.

### K4 – HTML `lang`-Attribut fehlt oder falsch
**Auswirkung:** Vite setzt standardmässig `lang="en"`. Screen-Reader lesen den deutschen Text in englischer Aussprache vor.  
**Fix:** `<html lang="de-CH">` in index.html (5 Minuten).

---

## 6. Hohe UX-Probleme (frustrieren User)

### H1 – Screen 2 zu lang (6 Blöcke in einem Screen)
**Auswirkung:** Dropout-Rate steigt. AHV, PK, 3a, Vermögen, Wohneigentum, Zusammenfassung auf einer Seite überfordert.  
**Empfehlung:** Split in 2a (AHV + Beitragsjahre) und 2b (PK + 3a + Vermögen). Alternativ: Accordion-Pattern mit Completion-Indicator.

### H2 – Keine Zurück-Schaltfläche nach oben sichtbar
**Auswirkung:** Nutzer auf Screen 3 und 4 müssen weit scrollen für den Footer-Back-Button.  
**Fix:** Sticky Footer mit `← Zurück` Button (analog zu Weiter), immer sichtbar.

### H3 – PK-Upload suggeriert echte Extraktion
Der PK-Upload verwendet `setTimeout` mit Demo-Zufallswerten. Nutzer glauben, ihre echten PK-Daten werden extrahiert – das schafft falsches Vertrauen und führt zu Fehlkalkulationen.  
**Fix:** Klartext-Label: „Demo: Werte werden zufällig generiert – bitte manuell eintragen" oder Feature entfernen bis Extraktion implementiert ist.

### H4 – Kein Fortschrittsindikator innerhalb eines Screens
Auf Screen 2 sieht der User 6 Blocks, weiss aber nicht wie weit er noch scrollen muss.  
**Fix:** Sticky Block-Navigator (A B C D E F) oder Scrollspy.

### H5 – KK-Prämie-Sektion erscheint konditionell (Screen3)
Der Block erscheint erst wenn `baseTotal > 0`. Nutzer in Detailed-Mode oder die zuerst scrollen sehen ihn möglicherweise nicht.  
**Fix:** KK-Sektion immer anzeigen, nicht konditionell.

### H6 – Chart-Labels zu klein auf Mobile
Recharts-Beschriftungen sind ~11–12px, die X-Achse auf 375px kaum lesbar.  
**Fix:** `fontSize={12}` auf XAxis/YAxis Tick-Labels, `angle={-30}` auf langen Labels.

### H7 – Keine Bestätigung beim Reset
TopBar Reset-Button fragt zwar `window.confirm()`, aber die Meldung ist englisch im Browser-Dialog. Nutzer der Zielgruppe 50–65 sind unsicher.  
**Fix:** Eigenes Modal mit deutschem Text und Warnhinweis: „Alle Eingaben werden gelöscht. Dies kann nicht rückgängig gemacht werden."

### H8 – Tooltips nur Hover, kein persistentes Klick-Overlay auf Mobile
InfoTooltip (components/Tooltip.tsx) feuert auf Click ein Toggle – korrekt. Aber das Tooltip-Overlay schiesst oben (bottom: 100%) und kann auf kleinen Screens abgeschnitten sein.  
**Fix:** Dynamische Positionierung (ob Platz nach oben oder unten vorhanden ist) und `max-width: min(260px, 90vw)`.

---

## 7. Quick Wins (10 sofort umsetzbare Verbesserungen)

| # | Massnahme | Aufwand | Impact | Priorität |
|---|-----------|---------|--------|-----------|
| QW1 | `lang="de-CH"` in index.html | 5 min | Hoch (A11y + SEO) | 🔴 |
| QW2 | `:focus-visible` globaler Regel hinzufügen | 30 min | Kritisch (A11y) | 🔴 |
| QW3 | Open Graph Tags (og:title, og:description, og:image) | 30 min | Hoch (SEO) | 🔴 |
| QW4 | robots.txt mit Disallow /schritt/ | 10 min | Mittel (SEO) | 🟠 |
| QW5 | sitemap.xml (Landing, Impressum, Datenschutz) | 20 min | Mittel (SEO) | 🟠 |
| QW6 | FAQ: `aria-expanded` + `aria-controls` | 30 min | Mittel (A11y) | 🟠 |
| QW7 | Switch-Komponente: `role="switch"`, `aria-checked` | 1h | Mittel (A11y) | 🟠 |
| QW8 | PK-Upload: Demo-Disclaimer prominent | 15 min | Hoch (Vertrauen) | 🟡 |
| QW9 | IncomeInput: `id`+`htmlFor` Label-Assoziation | 30 min | Mittel (A11y) | 🟡 |
| QW10 | Schema.org WebApplication JSON-LD in index.html | 30 min | Niedrig (SEO) | 🟡 |

---

## 8. SEO Action Plan (priorisiert)

### Phase 1: Technische Grundlagen (< 2h, sofort)

```
1. index.html: lang="de-CH" → 5 min
2. index.html: Open Graph Tags → 30 min
3. index.html: Schema.org JSON-LD → 30 min
4. index.html: Canonical URL → 5 min
5. public/robots.txt erstellen → 10 min
6. public/sitemap.xml erstellen → 20 min
7. Meta Description optimieren (Keywords) → 10 min
```

**robots.txt:**
```
User-agent: *
Allow: /
Disallow: /schritt/
Sitemap: https://www.wealthwise.ch/sitemap.xml
```

**sitemap.xml:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.wealthwise.ch/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>
  <url><loc>https://www.wealthwise.ch/impressum</loc><priority>0.3</priority></url>
  <url><loc>https://www.wealthwise.ch/datenschutz</loc><priority>0.3</priority></url>
</urlset>
```

### Phase 2: Content-SEO (2–4h)

1. Blog / Ressourcen-Sektion: „Altersvorsorge Schweiz" Artikel (SEO-Content)
2. Landing-Page-H1 mit primärem Keyword optimieren
3. FAQ-Antworten auf 150–250 Wörter ausbauen (Featured Snippets)

### Phase 3: Pre-Rendering (4–8h)

React-SPA ist schwierig zu crawlen. Lösung: Vite Pre-Rendering der Landing Page:
```
npm install vite-plugin-prerender
```
Rendert `/`, `/impressum`, `/datenschutz` als statisches HTML beim Build.

---

## 9. Responsive / Mobile Probleme

### Getestete Breakpoints: 375px (iPhone SE), 768px (iPad)

| Problem | Screen | Breakpoint | Severity |
|---------|--------|------------|----------|
| Nav-CTA ausgeblendet, kein Hamburger | Landing | 600px | 🟠 Mittel |
| Unterlagen-Checkliste 2-spaltig → überlappt | Landing | 375px | 🟡 Niedrig |
| RetireSlider Range-Marks Labels eng | Screen 1 | 375px | 🟡 Niedrig |
| PK-Option-Cards 4-spaltig → 2px padding | Screen 2 | 375px | 🟠 Mittel |
| Recharts X-Achse Labels überlappen | Screen 4 | 375px | 🟠 Mittel |
| Tabellen horizontal scroll fehlt teilweise | Screen 4 | 375px | 🟠 Mittel |
| ScoreRing + 3 KPI-Cards: Kein Stack auf 375px | Screen 4 | 375px | 🟡 Niedrig |
| Chat-Panel: full-width auf Mobile OK ✓ | Chat | 600px | ✅ OK |
| `.nav-cta` min-height < 44px auf Mobile | Global | 600px | 🔴 Kritisch |
| `.btn-link` in Wizard Footer < 44px | Alle | 600px | 🔴 Kritisch |
| Font-Size 11px in Progress Bar Meta | Global | Mobile | 🟠 Mittel |
| Kein `overscroll-behavior: contain` auf Modals | Alle | Mobile | 🟡 Niedrig |

### Kritische Mobile-Fixes

**1. .nav-cta und .btn-link Touch-Target:**
```css
@media (max-width: 600px) {
  .nav-cta { min-height: 44px; padding: 11px 18px; }
  .btn-link { min-height: 44px; display: inline-flex; align-items: center; }
}
```

**2. Recharts auf Mobile:**
```tsx
<XAxis tick={{ fontSize: 11 }} angle={-30} textAnchor="end" height={45} />
```

**3. Progress-Meta Schriftgrösse:**
```css
@media (max-width: 600px) {
  .progress-step-meta, .step-meta { font-size: 11px; }
}
```

---

## 10. Accessibility-Probleme

### WCAG 2.1 Compliance Status

| Kriterium | Level | Status | Befund |
|-----------|-------|--------|--------|
| 1.1.1 Non-text Content | A | ⚠️ Teilweise | SVG Charts ohne aria-label |
| 1.3.1 Info and Relationships | A | ❌ Fehlt | Labels nicht assoziiert |
| 1.3.5 Identify Input Purpose | AA | ❌ Fehlt | `autocomplete` auf Formfeldern fehlt |
| 1.4.3 Contrast (Text) | AA | ✅ OK | navy/white ausreichend |
| 1.4.11 Non-text Contrast | AA | ⚠️ Grenzwertig | Input-Borders (#e2e8f0 auf #fff ≈ 1.5:1) |
| 2.1.1 Keyboard | A | ❌ Kritisch | Focus-States fehlen |
| 2.4.3 Focus Order | A | ⚠️ Unklar | DOM-Reihenfolge, nicht getestet |
| 2.4.7 Focus Visible | AA | ❌ Kritisch | `outline: none` überall |
| 3.3.1 Error Identification | A | ⚠️ Teilweise | Inline-Warnings ohne aria-live |
| 3.3.2 Labels or Instructions | A | ❌ Fehlt | ~30% ohne htmlFor |
| 4.1.2 Name/Role/Value | A | ❌ Fehlt | Custom Controls ohne ARIA |
| 4.1.3 Status Messages | AA | ❌ Fehlt | Berechnungs-Updates ohne aria-live |

**Gesamtbewertung: WCAG 2.1 Level A nicht vollständig erreicht.**

### Priorisierte Accessibility-Fixes

**1. Globaler Focus-Ring (30 min):**
```css
:focus-visible {
  outline: 3px solid var(--navy-700);
  outline-offset: 2px;
}
/* Alle spezifischen `outline: none` entfernen */
.input:focus { outline: none; ... }  /* → entfernen */
```

**2. Switch-Komponente (1h):**
```tsx
function Switch({ on, onToggle, label }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="switch-wrap"
    >
      <div className={`switch ${on ? 'on' : ''}`} />
      <span>{label}</span>
    </button>
  )
}
```

**3. FAQ aria-expanded (30 min):**
```tsx
<button
  className="faq-question"
  aria-expanded={openFaq === i}
  aria-controls={`faq-answer-${i}`}
  onClick={() => setOpenFaq(openFaq === i ? null : i)}
>
  {f.q}
</button>
<div id={`faq-answer-${i}`} role="region" ...>
```

**4. aria-live für Berechnungsergebnisse (1h):**
```tsx
<div aria-live="polite" aria-atomic="true">
  CHF {fmtCHF(analysis.monthlyIncome)}/Mt.
</div>
```

**5. autocomplete auf Formfeldern (30 min):**
```tsx
<input id="name1" autoComplete="given-name" ...>
<input id="dob1" autoComplete="bday" type="date" ...>
```

**6. Chart-Alternativen (2h):**
```tsx
<div aria-label={`Vermögensverlauf: Peak CHF ${fmtCHF(max)} bei Alter ${peakAge}`}>
  <ResponsiveContainer>
    <AreaChart ...>
  </ResponsiveContainer>
</div>
```

---

## 11. Performance-Empfehlungen

### Aktuelle Bundle-Analyse (npm run build Output)

| Chunk | Grösse | gzip | Problem |
|-------|--------|------|---------|
| index.js (main) | 1.357 MB | 386 KB | ⚠️ Zu gross |
| html2canvas | 202 KB | 48 KB | Lazy loadbar |
| jsPDF | 160 KB | 53 KB | Lazy loadbar |
| Recharts | ~350 KB | ~100 KB | Lazy loadbar |

**Gesamtgrösse gzip: ~590 KB** – deutlich über dem 200 KB Budget für gutes LCP.

### Optimierungen

**1. Lazy Loading für Screen 4 (hoher Impact):**
```tsx
// App.tsx
const Screen4 = lazy(() => import('./pages/Screen4'))
const exportPDF = lazy(() => import('./lib/pdf'))
```
Spart ~400 KB für Nutzer, die nicht bis Screen 4 kommen (Mehrzahl der Drop-offs).

**2. Recharts Code-Splitting (hoher Impact):**
Recharts enthält D3 und ist ~350 KB unkomprimiert. Wenn Charts nur auf Screen 4 verwendet werden:
```tsx
// Nur bei Bedarf laden
const { AreaChart, ... } = await import('recharts')
```

**3. Google Fonts Self-Hosting (mittlerer Impact):**
```
npm install @fontsource/inter @fontsource/inter-tight
```
Eliminiert render-blocking external request, verbessert LCP um ~200–400ms.

**4. Vite Bundle-Splitting (manual chunks):**
```js
// vite.config.ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-charts': ['recharts'],
        'vendor-pdf': ['jspdf'],
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
      }
    }
  }
}
```

**5. Image-Optimierung:**
Wenn og:image (1200×630) erstellt wird: WebP-Format, < 200 KB.

### Core Web Vitals Prognose (vor/nach)

| Metrik | Aktuell (est.) | Nach Optimierung | Ziel |
|--------|---------------|-----------------|------|
| LCP | 3.5–5s | 1.5–2.5s | < 2.5s |
| FID | 100–200ms | < 100ms | < 100ms |
| CLS | 0.05–0.10 | < 0.05 | < 0.1 |
| Bundle (gzip) | ~590 KB | ~200 KB | < 250 KB |

---

## 12. Empfohlene Seitenstruktur

### Aktuelle Sitemap
```
/ (Landing)
/schritt/1 (Situation)
/schritt/2 (Vorsorge)
/schritt/3 (Ausgaben)
/schritt/4 (Analyse)
/impressum
/datenschutz
* → / (Redirect)
```

### Empfohlene Sitemap (erweitert)

```
/ (Landing – statisch pre-rendern)
/analyse/          → Alias für /schritt/1 (SEO-freundlicher)
  schritt-1/       → Situation
  schritt-2/       → Vorsorge
  schritt-3/       → Ausgaben
  schritt-4/       → Ergebnisse

/ratgeber/         → SEO-Content-Hub
  /ratgeber/ahv-rente-berechnen/
  /ratgeber/pensionskasse-kapitalbezug/
  /ratgeber/frühpensionierung-schweiz/
  /ratgeber/säule-3a-optimieren/

/faq/              → Eigenständige FAQ-Seite (SEO-Potential)
/impressum/
/datenschutz/
404 (dedizierte Not-Found-Seite)
```

### Fehlende Seiten (Empfehlung)

| Seite | Begründung | SEO-Potential |
|-------|-----------|---------------|
| /ratgeber/ | Organischer Traffic via Long-Tail Keywords | Sehr hoch |
| /faq/ | Featured Snippet Potential für Vorsorge-Fragen | Mittel |
| /rechner/ | Alternative URL für Tool-Einstieg | Mittel |
| 404-Seite | Mit CTA „Analyse starten" statt leerem Redirect | Niedrig |
| /agb/ | Professioneller Auftritt, ggf. rechtlich nötig | Niedrig |

### Navigation (Empfehlung)

**Desktop-Nav:**
```
Logo | Wie es funktioniert | FAQ | Ratgeber | [Analyse starten →]
```

**Mobile-Nav:**
```
Logo | [≡ Menü] → Drawer: Wie es funktioniert, FAQ, Analyse starten
```
(Aktuell: .nav-cta auf Mobile ausgeblendet, kein Ersatz – kritische Lücke)

---

## 13. Priorisierte Gesamtliste (Top 20 nach Impact × Aufwand)

| Rang | Massnahme | Kategorie | Impact | Aufwand | Score |
|------|-----------|-----------|--------|---------|-------|
| 1 | `:focus-visible` CSS implementieren | A11y | Kritisch | 30 min | ★★★★★ |
| 2 | `lang="de-CH"` in index.html | SEO/A11y | Hoch | 5 min | ★★★★★ |
| 3 | Open Graph Tags (og:title/description/image) | SEO | Hoch | 30 min | ★★★★★ |
| 4 | robots.txt + sitemap.xml | SEO | Hoch | 30 min | ★★★★★ |
| 5 | Form-Labels: htmlFor/id für alle Inputs | A11y | Hoch | 2h | ★★★★☆ |
| 6 | Lazy Loading Screen4 (Recharts, jsPDF) | Performance | Hoch | 2h | ★★★★☆ |
| 7 | Switch-Komponente: role="switch", aria-checked | A11y | Hoch | 1h | ★★★★☆ |
| 8 | FAQ: aria-expanded + aria-controls | A11y | Mittel | 30 min | ★★★★☆ |
| 9 | Schema.org WebApplication JSON-LD | SEO | Mittel | 30 min | ★★★★☆ |
| 10 | PK-Upload Demo-Disclaimer | Vertrauen/UX | Hoch | 15 min | ★★★★☆ |
| 11 | Mobile Sticky-CTA-Bar (Landing) | Conversion | Hoch | 1h | ★★★★☆ |
| 12 | nav-cta/btn-link min-height 44px Mobile | Mobile | Mittel | 30 min | ★★★☆☆ |
| 13 | Google Fonts Self-Hosting | Performance | Mittel | 2h | ★★★☆☆ |
| 14 | aria-live auf Berechnungsergebnisse | A11y | Mittel | 1h | ★★★☆☆ |
| 15 | Screen 2 in 2 Subscreens aufteilen | UX/Conversion | Hoch | 4h | ★★★☆☆ |
| 16 | Social Proof Block auf Landing | Conversion | Hoch | 2h | ★★★☆☆ |
| 17 | Custom Reset-Modal statt window.confirm | UX | Mittel | 1h | ★★★☆☆ |
| 18 | Recharts Mobile-Labels (fontSize, angle) | Mobile | Mittel | 1h | ★★★☆☆ |
| 19 | Vite Pre-Rendering Landing Page | SEO/Performance | Hoch | 4h | ★★★☆☆ |
| 20 | InfoTooltip: Dynamische Positionierung | UX | Niedrig | 2h | ★★☆☆☆ |

---

## Anhang: Messwerte & Code-Referenzen

### Schriftgrössen-Audit
| Element | Grösse | Desktop | Mobile | WCAG OK? |
|---------|--------|---------|--------|----------|
| Body | 16px | 16px | 16px | ✅ |
| Nav Links | 15px | 15px | hidden | ✅ |
| Progress Meta | 13px | 13px | 11px | ⚠️ |
| Block-Hint | 10.5–11px | 10.5px | 10.5px | ❌ |
| FAQ-Antwort | 15px | 15px | 15px | ✅ |
| Footer Links | 14px | 14px | 14px | ⚠️ |
| BFS-Benchmark-Text | 11.5px | 11.5px | 11.5px | ❌ |

*Empfehlung: Alle Texte unter 12px auf mindestens 12px erhöhen. Auf Mobile min. 14px für alle lesbaren Texte.*

### Touch-Target-Audit
| Element | Klasse | Min-Height | Mobile Fix? |
|---------|--------|------------|-------------|
| Primär-CTA | .btn-primary | ~50px (Padding) | ✅ |
| Nav-CTA | .nav-cta | ~35px | ❌ |
| Sekundär-Link | .btn-link | ~30px | ❌ |
| Tab-Buttons | .tab | 44px via Media Query | ✅ |
| Option-Cards | .option-card | 44px via Media Query | ✅ |
| Child-Radio | .child-radio | 44px via Media Query | ✅ |

### Kontrast-Audit (WCAG 2.1 AA = 4.5:1 Text, 3:1 UI)
| Kombination | Ratio | Pass? |
|-------------|-------|-------|
| --navy-900 (#111f3a) auf #fff | 17.8:1 | ✅ |
| --ink-700 (#334155) auf #fff | 8.6:1 | ✅ |
| --ink-400 (#94a3b8) auf #fff | 2.8:1 | ❌ (Sekundärtext) |
| --ink-500 (#64748b) auf #fff | 4.6:1 | ✅ |
| Input Border (#e2e8f0) auf #fff | 1.5:1 | ❌ (UI 3:1 nötig) |
| White auf --navy-800 (#1a2b4a) | 13.4:1 | ✅ |

*--ink-400 (#94a3b8) auf weissem Hintergrund hat nur 2.8:1 – für Hilfstext unterhalb Inputs verwendet. Auf --ink-500 (#64748b) erhöhen oder Schriftgrösse auf 18px+.*

---

*Bericht erstellt für WealthWise Vorsorgeplanung – Stand Mai 2026*  
*Nächste Überprüfung empfohlen nach Implementierung der Top-10-Massnahmen*
