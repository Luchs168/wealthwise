# WealthWise – Asset Manager Review: Rendite-Annahmen & Modellierungsqualität

**Reviewer:** Erfahrener Schweizer Asset Manager (CFA, 12 Jahre unabhängige Vermögensverwaltung)  
**Datum:** Mai 2026  
**Scope:** Vollständige Code-Prüfung aller Rendite-, Zins- und Wachstumsannahmen  
**Methode:** Manuelle Analyse aller relevanten Dateien: `calc.ts`, `cashflow.ts`, `pkCalculation.ts`, `wealthDepletionCalculation.ts`, `swissVorsorge2025.ts`, `store/index.ts`, `Screen2.tsx`, `Screen4.tsx`

---

## 1. Executive Summary

WealthWise ist für ein Privatkundentools solide strukturiert – die AHV- und BVG-Gesetzesparameter (Skalentabelle, Umwandlungssätze, Koordinationsabzüge) sind korrekt und aktuell. Die **kritische Schwachstelle liegt in den Rendite-Annahmen für das Privatvermögen und die Säule 3a**: Sie sind zu niedrig, undifferenziert und ignorieren die grösste Opportunitätslücke im Schweizer Vorsorgesystem – den Unterschied zwischen 3a-Sparkonto (≈0.75%) und 3a-Wertschriftenlösung (≈4-5%).

Weiter fehlen: Inflationsanpassung der AHV-Rente in Langfristprojektionen, Modellierung der realen Kaufkraftentwicklung der PK-Rente (nominal fix!), Glide-Path-Ansatz, Sequence-of-Returns-Risk und Vermögenssteuer. Dies führt zu einer **systematischen Unterschätzung des Vermögenspotenzials bei Wertschriften-Anlegern** und einer **Überschätzung der Kaufkraft der PK-Rente im Alter**.

**Gesamtnote Annahmen-Qualität: 5/10**  
(Gesetzesparameter: 9/10 · Rendite-Annahmen: 4/10 · Inflation/Real-Betrachtung: 3/10 · Entnahmestrategie: 5/10)

---

## 2. Alle verwendeten Rendite-Annahmen im Überblick

| # | Annahme | Wert im Code | Fundstelle | Realistisch? |
|---|---------|-------------|------------|-------------|
| 1 | Basis-Rendite konservativ | **1.0%** | `calc.ts:20` | ⚠ Zu tief (Obligationen CHF 2025: 1.5–2.5%) |
| 2 | Basis-Rendite ausgewogen | **2.5%** | `calc.ts:21` | ⚠ Grenzwertig (realistisch 3.0–4.0%) |
| 3 | Basis-Rendite Wachstum | **4.5%** | `calc.ts:22` | ✓ Akzeptabel (realistisch 4.5–6.0%) |
| 4 | Inflation (Basis) | **1.5%** | `calc.ts:18` | ✓ Korrekt für CH-Langfrist |
| 5 | PK-Zinssatz (Standard) | **2.0%** | `store/index.ts:210` | ⚠ Leicht hoch (BVG-Min 1.25%, gute PKs 2–3%) |
| 6 | PK-Zinssatz (BVG-Minimum) | **1.25%** | `swissVorsorge2025.ts:328` | ✓ Gesetzlich korrekt |
| 7 | 3a-Rendite (einheitlich) | **2.0%** | `calc.ts:258 (implizit)` | ✗ Falsch: Sparkonto 0.75%, Wertschriften 4–5% |
| 8 | Szenario optimistisch (balanced) | **3.5%** | `cashflow.ts:429` | ⚠ Zu tief (sollte ~5.0% sein) |
| 9 | Szenario pessimistisch | **0.0%** | `cashflow.ts:430` | ✓ Konservativ, aber kein negativer Return |
| 10 | Szenario optimistisch (inflation) | **1.0%** | `cashflow.ts:437` | ✓ Realistisch |
| 11 | Szenario pessimistisch (inflation) | **2.5%** | `cashflow.ts:439` | ✓ Konservativ, angemessen |
| 12 | Vermögensdepletion optimistisch | **4.0%** | `wealthDepletionCalculation.ts:170` | ✓ Angemessen |
| 13 | Vermögensdepletion realistisch | **2.0%** | `wealthDepletionCalculation.ts:171` | ⚠ Zu tief bei ausgewogenem Portfolio |
| 14 | Vermögensdepletion pessimistisch | **0.0%** | `wealthDepletionCalculation.ts:172` | ✓ |
| 15 | Safe Withdrawal Rate | **3.5%** | `wealthConstants.ts:2` | ✓ Korrekt für CH (4% zu hoch für 30+ Jahre) |
| 16 | Hypothek (Tragbarkeit) | **5.0%** (kalkulatorisch) | `Screen4.tsx:1544` | ✓ FINMA-Standard korrekt |
| 17 | Hypothek (Default) | **1.5%** | `store/index.ts:236` | ✓ Aktuell korrekt, aber nicht zukunftssicher |
| 18 | Unterhalt Immobilie | **1.0%** des Verkehrswerts | `Screen4.tsx:1704` | ✓ Marktüblich |
| 19 | AHV Frühbezug-Kürzung | **6.8%/Jahr** | `calc.ts:6` | ✓ Gesetzlich korrekt |
| 20 | Werterhalt Immobilie | **nicht modelliert** | – | ✗ Fehlt komplett |
| 21 | Vermögenssteuer | **nicht modelliert** | – | ✗ Fehlt komplett |
| 22 | AHV-Rente (Inflation 30J) | **nominal fix** | `cashflow.ts:271` | ✗ Falsch: AHV steigt via Mischindex |
| 23 | PK-Rente (Inflation 30J) | **nominal fix** | `cashflow.ts:282` | ✓ Korrekt: PK ist nominal |

---

## 3. Fehlende Unterscheidungen (kritisch)

### 3.1 Säule 3a: Sparkonto vs. Wertschriften — GRÖSSTE LÜCKE

**Status:** `form3a: 'sparkonto' | 'wertschriften'` existiert im Store (`store/index.ts:34`, `index.ts:198`), wird aber **nirgendwo in die Rendite-Berechnung eingebaut**. Beide Typen werden mit identischen Annahmen projiziert.

**Finanzielle Auswirkung (Beispielrechnung):**

| Szenario | Startkapital | Laufzeit | Rendite | Endkapital |
|---------|-------------|----------|---------|-----------|
| Sparkonto (PostFinance/UBS) | CHF 100'000 | 10 Jahre | 0.75% | CHF 107'800 |
| Wertschriften konservativ (25% Aktien) | CHF 100'000 | 10 Jahre | 2.5% | CHF 128'000 |
| Wertschriften ausgewogen (50% Aktien) | CHF 100'000 | 10 Jahre | 4.0% | CHF 148'000 |
| Wertschriften aggressiv (80% Aktien, VIAC) | CHF 100'000 | 10 Jahre | 5.0% | CHF 163'000 |

**Differenz Sparkonto vs. Aggressiv: CHF 55'200** — das ist keine Kleinigkeit.

**Empfohlene Rendite-Annahmen für 3a:**
- `sparkonto`: 0.75% (aktueller CH-Durchschnitt, Stand 2026)
- `wertschriften_konservativ` (25% Aktien): 2.0–2.5%
- `wertschriften_ausgewogen` (50% Aktien): 3.0–4.0%
- `wertschriften_aggressiv` (80%+ Aktien): 4.5–5.5%

### 3.2 Freies Vermögen: Sparkonto vs. Wertschriften

**Status:** Seit dem letzten Update sind Sparkonto und Wertschriften im Store getrennt (`sparkonto`, `wertschriften`). Aber: **Beide werden mit derselben Rendite (riskProfile-basiert) projiziert**. Sparkonto sollte 0.75% erhalten, unabhängig vom Risk-Profil.

### 3.3 PK: Obligatorisch vs. Überobligatorisch

**Status:** Es wird ein einheitlicher `pkInterestRate`-Parameter verwendet. Das ist vertretbar, da der User den Satz eingeben kann. Aber: Das überobligatorische Guthaben kann von der PK unterschiedlich verzinst werden (oft niedriger). Dieser Unterschied wird nicht erklärt.

### 3.4 Hypothek: Aktueller vs. Langfristiger Zinssatz

**Status:** Für die Cashflow-Projektion wird `hypothekZinssatz` (Default 1.5%) unverändert für die gesamte Laufzeit verwendet. Bei einer 30-jährigen Projektion ist das zu optimistisch.

---

## 4. Unrealistische Annahmen

### 4.1 Rendite "konservativ" = 1.0% — zu tief

```typescript
// calc.ts:20
conservative: 0.01,  // 1.0%
```

Ein konservatives Portfolio (z.B. 30% Aktien, 60% Obligationen, 10% Immobilien) erzielte in der Schweiz historisch **2.5–3.5% nominal**. 1.0% entspricht praktisch einem reinen Obligationenportfolio in der Tiefzinsphase — das ist in der Normalisierungsphase 2024–2026 nicht mehr die Realität. Empfehlung: **2.5%**

### 4.2 Rendite "ausgewogen" = 2.5% — zu tief

```typescript
// calc.ts:21
balanced: 0.025,  // 2.5%
```

Ein 50/50-Portfolio (50% Aktien global, 50% Obligationen) erzielte langfristig in der Schweiz **3.5–4.5% nominal**. 2.5% ist eher ein "konservativ". Empfehlung: **3.5%**

### 4.3 Szenario "Optimistisch" = 3.5% bei balanced — zu tief

```typescript
// cashflow.ts:429
balanced: { optimistic: 0.035, pessimistic: 0 },
```

Das "optimistische" Szenario eines ausgewogenen Portfolios sollte historischen Spitzenjahren entsprechen: **5.0–6.0%**. Bei 3.5% ist der Abstand zum neutralen Szenario (2.5%) unrealistisch klein — es gibt keine Hebelwirkung für gute Marktphasen.

### 4.4 Hypothek Default 1.5% — zu günstig für 30-Jahres-Projektion

```typescript
// store/index.ts:236
hypothekZinssatz: 1.5  // 1.5%
```

Aktuell (2026) liegt der Schnitt der CH-Hypotheken bei ca. 1.8–2.2% (SARON-basiert). Für eine 20–30-Jahres-Projektion ist ein kalkulatorischer Langfristzins von 2.5–3.0% angemessener. Bei 30 Jahren und CHF 500'000 Hypothek ergibt das CHF 150'000–225'000 Mehrkosten gegenüber 1.5%.

---

## 5. Fehlende Modellierung

### 5.1 AHV-Rente: Keine Inflation/Mischindex-Anpassung ❌

**Code:** `cashflow.ts:271` — `ahvIncome = ahv.combinedYearlyInkl13` bleibt über alle 30+ Jahre konstant.

**Realität:** Die AHV-Rente wird alle 2 Jahre via Mischindex angepasst (arithmetisches Mittel aus Lohn- und Preisentwicklung). Historisch ca. 1.0–1.5% p.a. Bei einer 30-Jahres-Projektion entspricht das einer Differenz von **35–55%** im Nominalbetrag.

**Beispiel (CHF 2'520/Mt. heute → 30 Jahre):**
- Ohne Anpassung: CHF 2'520/Mt. im Jahr 2056
- Mit 1.25% Mischindex: **CHF 3'640/Mt.** im Jahr 2056

Das Tool unterschätzt systematisch das AHV-Einkommen im hohen Alter.

### 5.2 PK-Rente: Keine Erklärung der nominalen Fixierung ❌

Die PK-Rente bleibt korrekt nominal fix in der Projektion — aber dem User wird **nicht kommuniziert**, dass die Kaufkraft der PK-Rente real sinkt.

**Beispiel:** CHF 3'000 PK-Rente heute → kaufkraftbereinigt bei 1.5% Inflation nach:
- 10 Jahren: CHF 2'590 (real)
- 20 Jahren: CHF 2'236 (real)  
- 30 Jahren: CHF 1'931 (real) = **Kaufkraftverlust von 36%**

Dieser Unterschied AHV (steigt real) vs. PK (sinkt real) ist **die wichtigste Botschaft für die Langfristplanung** und fehlt komplett.

### 5.3 Glide Path / Lifecycle-Ansatz fehlt ❌

Das Risikoprofil bleibt über den gesamten Planungshorizont konstant. In der Praxis sollte ein 58-jähriger bis 65 den Aktienanteil von 60% auf 40% reduzieren, und bis 75 auf 20%.

**Auswirkung:** Bei konstantem Wachstumsprofil werden spätere Lebensphasen mit zu hohen Renditen projiziert. Das Sequence-of-Returns-Risiko (schlechte Jahre kurz nach Pensionierung) ist nicht modelliert.

### 5.4 Vermögenssteuer fehlt ❌

| Kanton | Vermögenssteuer (ca.) |
|--------|----------------------|
| Bern | 0.30–0.50% auf Nettovermögen |
| Zürich | 0.15–0.30% |
| Zug | 0.08–0.15% |
| Genf | 0.20–0.40% |

Bei CHF 500'000 Nettovermögen und Kanton Bern: **CHF 1'500–2'500/Jahr = CHF 45'000–75'000 über 30 Jahre**. Diese Kosten fehlen komplett im Cashflow-Modell.

### 5.5 Kapitalerträge: Einkommensteuer auf Dividenden/Zinsen fehlt ❌

Im Cashflow-Modell wird `investmentReturn` als netto-Return auf das Vermögen angewendet. Dividenden und Zinsen auf privatem Vermögen sind jedoch einkommenssteuerpflichtig. Bei 30% Aktienanteil und 2% Dividendenrendite auf CHF 500'000 → CHF 3'000/Jahr Dividendeneinkommen → ca. CHF 750/Jahr Steuer. Nicht modelliert, aber im Kontext eines einfachen Tools vertretbar.

### 5.6 Sequence-of-Returns-Risiko nicht kommuniziert ❌

Wenn in den ersten 5 Jahren der Pensionierung die Märkte 30% fallen, ist das wesentlich schädlicher als wenn dieselben Verluste in Jahr 20–25 auftreten. Dieses Risiko wird nicht erklärt und ist für Frühpensionäre hochrelevant.

### 5.7 Wertentwicklung Immobilie fehlt ❌

Die Immobilie wird als Fixwert erfasst. Langfristig wertet Schweizer Wohneigentum ca. 1–2% nominal p.a. auf (regional sehr unterschiedlich). Bei CHF 800'000 Immobilie über 20 Jahre: +CHF 170'000–400'000. Nicht modelliert, aber würde Gesamtvermögen wesentlich beeinflussen.

---

## 6. Inflation: Korrekt implementiert?

| Aspekt | Status |
|--------|--------|
| Basisrate 1.5% | ✓ Korrekt für CH-Langfrist |
| Ausgaben steigen mit Inflation | ✓ Korrekt implementiert (`cashflow.ts:237–238`) |
| AHV steigt mit Inflation | ✗ **Fehlt** — AHV bleibt nominal fix |
| PK bleibt nominal fix | ✓ Korrekt implementiert |
| Realrendite (nominal - Inflation) | ⚠ Teilweise: Szenarien verwenden Nominal-Returns ohne expliziten Real-Ausweis |
| Szenario-Inflation: 1.0% / 1.5% / 2.5% | ✓ Realistisch kalibriert |

**Fazit:** Inflation auf der Ausgabenseite ist korrekt. Das grosse Versäumnis ist die fehlende AHV-Indexierung — sie verzerrt die Langfrist-Prognose systematisch zuungunsten der AHV.

---

## 7. Szenarien: Realistisch kalibriert?

### Aktuelle Kalibrierung

```typescript
// cashflow.ts:427-439
conservative: { optimistic: 0.015, pessimistic: 0 }  // Neutral: 1.0%
balanced:     { optimistic: 0.035, pessimistic: 0 }  // Neutral: 2.5%
growth:       { optimistic: 0.05,  pessimistic: 0 }  // Neutral: 4.5%
```

### Bewertung als Asset Manager

| Profil | Aktuell Neutral | Sollte Neutral | Aktuell Optimistisch | Sollte Optimistisch | Pessimistisch |
|--------|----------------|---------------|---------------------|--------------------|-|
| Konservativ | 1.0% | 2.5% | 1.5% | 3.5% | 0% ✓ |
| Ausgewogen | 2.5% | 3.5% | 3.5% | 5.0% | 0% ✓ |
| Wachstum | 4.5% | 5.5% | 5.0% | 7.0% | 0% ✓ |

**Empfehlung:** Den pessimistischen Wert für Wachstum auf **−1.0%** setzen (reale Bärenmärkte, Japan-Szenario). 0% bei einem Wachstumsportfolio als Worst Case ist zu optimistisch.

**Fehlendes Szenario:** "Japan-Szenario" — 0% Realrendite über 20 Jahre. Das wäre ein separates Worst-Case-Szenario: Nominale Rendite = Inflation, Vermögen real stagniert.

---

## 8. Kapitalerträge und Steuern: Korrekt?

| Aspekt | Status | Bemerkung |
|--------|--------|-----------|
| Kapitalgewinnsteuer auf Privatvermögen | ✓ Korrekt — keine (CH-spezifisch) | Im Code nicht explizit, aber korrekt ignoriert |
| Dividenden/Zinsen einkommenspflichtig | ⚠ Teilweise — Return wird brutto angewendet | Im Grossen und Ganzen vernachlässigbar für ein Planungstool |
| Stempelsteuer auf Wertschriftentransaktionen | ✗ Fehlt | 0.075–0.15% bei Kauf/Verkauf — marginal |
| Vermögenssteuer | ✗ Fehlt | Wesentlich! Kanton Bern: 0.3–0.5%/Jahr |
| Kapitalbezugssteuer 3a/PK | ✓ Korrekt implementiert | Separate Steuer, getrennte Veranlagung |
| Renteneinkommen Einkommenssteuer | ✓ Korrekt via `calculateRetirementTax` | Kantonal korrekt |
| Eigenmietwert | ✓ Implementiert via `calculateEigenmietwert` | Gut |

---

## 9. Empfehlungen (priorisiert)

### Priorität 1 — KRITISCH: Muss geändert werden

**P1a: 3a-Rendite nach Anlageform differenzieren**

In Screen2, nach der bestehenden Ja/Nein-Auswahl für 3a, eine Auswahl des Anlagetyps hinzufügen:

```typescript
// Neue 3a-Rendite-Annahmen im Store/Calc
const RETURNS_3A = {
  sparkonto: 0.0075,                  // 0.75%
  wertschriften_konservativ: 0.025,   // 2.5%
  wertschriften_ausgewogen: 0.04,     // 4.0%
  wertschriften_aggressiv: 0.05,      // 5.0%
}
```

Neue Frage in Screen2:
> "Wie ist Ihre Säule 3a angelegt?"
> ○ Sparkonto (0.75% Zins)
> ○ Wertschriften konservativ, 25% Aktien (2.5%)
> ○ Wertschriften ausgewogen, 50% Aktien (4.0%)
> ○ Wertschriften aggressiv, 80%+ Aktien, z.B. VIAC/Finpension (5.0%)

**P1b: Basis-Renditen nach oben korrigieren**

```typescript
// calc.ts — empfohlene Korrekturen
RETURNS: {
  conservative: 0.025,  // war 0.01 — +1.5%
  balanced: 0.035,      // war 0.025 — +1.0%
  growth: 0.05,         // war 0.045 — +0.5%
}
```

**P1c: AHV-Indexierung in der Langfristprojektion**

```typescript
// cashflow.ts — in der for-Schleife:
const AHV_MISCHINDEX = 0.0125  // 1.25% p.a. historischer Durchschnitt
const ahvFactor = Math.pow(1 + AHV_MISCHINDEX, yearsFromNow)
ahvIncome = ahv.combinedYearlyInkl13 * ahvFactor
```

### Priorität 2 — WICHTIG: Sollte ergänzt werden

**P2a: Sparkonto-Rendite von Portfolio-Rendite trennen**

Das Sparkonto (`sparkonto`) sollte unabhängig vom riskProfile immer mit 0.75% wachsen. Nur `wertschriften` folgen dem riskProfile.

**P2b: Kaufkraftverlust der PK-Rente visualisieren**

Im Screen4, unter der PK-Rente, einen Hinweis einblenden:
> "⚠ Achtung: Die PK-Rente ist nominal fix. Bei 1.5% Inflation verliert sie in 20 Jahren ca. 26% an Kaufkraft. Die AHV-Rente wird hingegen periodisch an die Teuerung angepasst."

**P2c: Hypothek-Langfristzins anpassen**

Für die Cashflow-Projektion einen kalkulatorischen Langfristzins von 2.5% verwenden (unabhängig vom User-Input), mit Hinweis:
> "Für die Tragbarkeitsberechnung wird ein langfristiger Kalkulationszins von 2.5% verwendet (FINMA-Standard). Ihr aktueller Zins: 1.5%."

**P2d: Vermögenssteuer als Kostenfaktor**

Einfachste Implementierung: 0.25% p.a. auf Nettovermögen als Schätzwert, mit Hinweis auf kantonale Unterschiede. Oder: Auswahl nach Kanton aus vordefinierten Sätzen.

### Priorität 3 — NICE TO HAVE

**P3a: Glide Path kommunizieren**

Im Screen4, Abschnitt Anlagestrategie, Hinweis:
> "Ihr aktuelles Risikoprofil: Ausgewogen (50% Aktien). Viele Vorsorgeexperten empfehlen, den Aktienanteil mit zunehmender Pensionsnähe zu reduzieren ('Glide Path'). Möglicher Pfad: 60% Aktien heute → 40% bei Pensionierung → 25% mit 75 Jahren."

**P3b: Szenario-Renditen erhöhen**

```typescript
// cashflow.ts — empfohlen
const SCENARIO_RETURNS = {
  conservative: { optimistic: 0.035, pessimistic: 0 },
  balanced:     { optimistic: 0.05,  pessimistic: -0.005 },
  growth:       { optimistic: 0.07,  pessimistic: -0.01 },
}
```

**P3c: Wertentwicklung Immobilie**

Optional: User kann geschätzte jährliche Wertsteigerung eingeben (Default 1.0%). Zeigt Vermögensentwicklung inkl. Immobilie.

**P3d: Sequence-of-Returns-Warnung**

Im Abschnitt Entnahmestrategie, Hinweis:
> "⚠ Sequence-of-Returns-Risiko: Fallen die Märkte in den ersten Jahren nach der Pensionierung stark, hat das überproportional negative Auswirkungen. Planen Sie einen Liquiditätspuffer von 2–3 Jahren Ausgaben in sicheren Anlagen."

---

## 10. Welche Rendite-Parameter sollte der User einstellen können?

### Sollte User-konfigurierbar sein (mit sinnvollen Defaults):

| Parameter | Empfohlener Default | Bereich | Begründung |
|-----------|-------------------|---------|------------|
| Anlagerendite | 3.5% (ausgewogen) | 0%–8% | Kernparameter, direkter Einfluss |
| Inflation | 1.5% | 0.5%–3.5% | Mittelfristig unsicher |
| PK-Zinssatz | 2.0% | 0.5%–5.0% | Stark PK-abhängig |
| 3a-Anlageform | Sparkonto | 4 Optionen | Grösster ROI in der Beratung |
| Hypothekarzins (Langfrist) | 2.5% | 1.0%–5.0% | Zinsnormalisierung unsicher |

### Sollte NICHT User-konfigurierbar sein (rechtliche/technische Parameter):

- AHV-Rentenformel, Mischindex-Anpassung
- BVG-Mindestumwandlungssatz, Koordinationsabzug
- Kapitalbezugssteuer-Tabellen
- AHV-Vorbezugskürzung 6.8%

### Empfohlene UI-Umsetzung:

Ein "Erweiterte Annahmen" Bereich am Ende von Screen3 oder Screen4, ausgeklappt per Klick, mit:
- Anlagerendite-Slider (0%–8%, Default je nach Risikoprofil)
- Inflationsrate-Slider (0.5%–3.5%, Default 1.5%)
- Hypothek Langfristzins (wenn Wohneigentum)
- Immobilien-Wertsteigerung (wenn Wohneigentum, Default 1.0%)

Mit Tooltip: "Diese Annahmen basieren auf historischen Schweizer Durchschnittswerten. Änderungen haben erhebliche Auswirkungen auf die Projektion."

---

## 11. Gesamtnote Annahmen-Qualität: 5/10

| Bereich | Note | Begründung |
|---------|------|-----------|
| AHV/BVG Gesetzesparameter | 9/10 | Vollständig, aktuell, korrekt |
| PK-Projektion | 6/10 | Zinssatz-Input vorhanden, gut strukturiert |
| 3a-Rendite-Differenzierung | 2/10 | Speicherfeld existiert, wird nicht genutzt |
| Inflationsmodellierung | 5/10 | Ausgaben korrekt; AHV fehlt |
| Szenario-Kalibrierung | 5/10 | Pessimistisch OK; Neutral/Optimistisch zu tief |
| Entnahmestrategie | 6/10 | 4%/3.5% Regeln implementiert; Sequence-Risk fehlt |
| Steuern auf Kapitalerträge | 5/10 | Kapitalbezug gut; Vermögenssteuer fehlt |
| Transparenz der Annahmen | 4/10 | Kaum Hinweise auf verwendete Annahmen im UI |
| **Gesamt** | **5/10** | Solide Basis mit wesentlichen Lücken |

---

## Anhang: Korrektur-Cheatsheet für Entwickler

```typescript
// calc.ts — EMPFOHLENE KORREKTUREN
RETURNS: {
  conservative: 0.025,  // war 0.01
  balanced: 0.035,      // war 0.025
  growth: 0.05,         // war 0.045
}

// Neue Konstante
RETURNS_3A: {
  sparkonto: 0.0075,
  wertschriften_konservativ: 0.025,
  wertschriften_ausgewogen: 0.04,
  wertschriften_aggressiv: 0.05,
}

AHV_MISCHINDEX_PA: 0.0125  // für Langfristprojektion

// cashflow.ts — Szenario-Korrekturen
const SCENARIO_RETURNS = {
  conservative: { optimistic: 0.035, pessimistic: 0 },
  balanced:     { optimistic: 0.05,  pessimistic: 0 },
  growth:       { optimistic: 0.07,  pessimistic: -0.01 },
}

// wealthDepletionCalculation.ts
{ label: 'Realistisch', returnRate: 0.035, ... }  // war 0.02
```

---

*Erstellt als unabhängige Facheinschätzung. Keine Anlageberatung. Alle Rendite-Annahmen sind historische Schätzwerte ohne Garantie für zukünftige Entwicklungen.*
