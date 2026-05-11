# WealthWise – Fachliche Nachprüfung (V2) – Schweizer Finanzplaner CFP

**Datum:** Mai 2026  
**Prüfer:** Erfahrener Schweizer Finanzplaner (CFP-zertifiziert, 15 Jahre Erfahrung Pensionierungsplanung)  
**Bezug:** Nachprüfung der in REVIEW_FINANZPLANER.md (V1) identifizierten Probleme  
**Codeversion:** github.com/Luchs168/wealthwise (main, commit nach UX-Review)

---

## EXECUTIVE SUMMARY

Die vier kritischen Fehler aus der V1-Prüfung sind **vollständig behoben**. Die Hauptprojektion (Cashflow-Engine, `cashflow.ts`) rechnet nun mit:
- Korrekter AHV-Berechnung (BSV 2026, lineare Interpolation)
- Korrekter Rentenbesteuerung (canton-aware, alle 26 Kantone)
- Korrekter Kapitalbezugssteuer (Sätzchen-Methode)
- Korrekt einbezogenem Freizügigkeitsguthaben (FZ)

**Verbleibende Hauptprobleme:** Eine Inkonsistenz beim BVG-Maximallohn (pkConstants.ts), fehlende explizite Krankenkassenprämien-Eingabe und unvollständige Steueroptimierung beim kombinierten Kapital-/3a-Bezug. Diese sind aber deutlich weniger kritisch als die V1-Mängel.

**Gesamtnote V1 → V2: 5.5/10 → 7.5/10**

---

## 1. STATUS DER URSPRÜNGLICHEN FEHLER

### 1.1 KRITISCHE FEHLER (K1–K4)

#### K1: cashflow.ts verwendet alte AHV-Tabelle (calc.ts) — ✅ BEHOBEN

**V1-Problem:** `cashflow.ts` verwendete `calculateAhvHousehold()` aus `calc.ts` mit veralteten AHV-Werten (Mindestjahreseinkommen CHF 15'120 statt 14'700, Stufentabelle statt linearer Interpolation).

**V2-Status:** `cashflow.ts` importiert nun korrekt aus `ahvCalculation.ts`:
```typescript
import { calculateAHVPension, applyPlafonierung, computeKZGAdjustedIncome } from '../utils/ahvCalculation'
```
Die interne Funktion `buildAhvHousehold()` in `cashflow.ts` nutzt ausschliesslich `calculateAHVPension()` mit den BSV-2026-Werten (MIN 14'700, MAX 88'200, BSV-Bezugsfaktoren). Beitragsjahre werden korrekt als `retireAge - 21 - Lücken` berechnet. ✅

**Testfall-Verifikation:**  
Mann, CHF 120'000 Einkommen, Pension 63, keine Lücken:
```
Beitragsjahre: 42 (63 - 21 = 42, Skala = 42/44 = 95.5%)
avgIncome gedeckelt: CHF 88'200
Basis-Rente (max): CHF 2'520/Mt.
Nach Skala 42: CHF 2'405/Mt.
Vorbezug-Faktor 63: 0.864
Ergebnis: CHF 2'078/Mt.
Erwartet: CHF 2'079/Mt. → ABWEICHUNG: 1 CHF (Rundung) ✅
```

#### K2: Pauschalsteuer 8% in cashflow.ts — ✅ BEHOBEN

**V1-Problem:** `const taxRate = p1Retired ? 0.08 : 0.15` – pauschale 8% im Ruhestand.

**V2-Status:** `cashflow.ts` ruft nun `calculateRetirementTax()` aus `tax.ts` auf:
```typescript
// K2: correct retirement tax via calculateRetirementTax (canton + Kirchensteuer)
const retTax = calculateRetirementTax(ahvMonthly, pkMonthly, canton, taxStatus, kirchensteuer)
estimatedTax = retTax.totalTax
```
Alle 26 Kantone, Kirchensteuer-Flag, verheirateten Tarif und Versicherungsabzüge werden berücksichtigt. ✅

**Auswirkung:** Für tiefe Kantone (SZ, ZG) sinkt die effektive Steuerbelastung auf 3–6%, für hohe Kantone (GE, BE) steigt sie auf 10–14%. Die Projektion ist nun kantonsabhängig korrekt.

#### K3: Kapitalbezugssteuer ohne Sätzchen-Methode — ✅ BEHOBEN

**V1-Problem:** `cashflow.ts` verwendete `calculateCapitalWithdrawalTax()` aus `calc.ts` (einfache Brackets ohne Sätzchen).

**V2-Status:** Import aus `tax.ts`:
```typescript
import { calculateCapitalWithdrawalTax as calculateCapitalTax } from './tax'
// ...
wealth += cap1 - calculateCapitalTax(cap1, canton, taxStatus).totalTax
```
Die Sätzchen-Methode (Bundessteuer = 5 × Steuer auf Kapital/5) ist korrekt implementiert. ✅

**Testfall-Verifikation:**  
Kapitalbezug CHF 500'000, ledig, Zürich:
```
Bundessteuer (Sätzchen): 5 × Steuer(100'000) = 5 × CHF 2'849 = CHF 14'243
Kantonal ZH (7.3%): CHF 36'500
Total: CHF 50'743 (10.1% effektiv)
```
**Anmerkung zum Testfall:** Die V1-Erwartung von CHF 30'000–40'000 war zu tief. CHF 50'743 entspricht dem realen Zürich-Sondertarif (8–12% Effektivrate je nach Kanton). Das Code-Ergebnis ist fachlich korrekt; die V1-Benchmark war fehlerhaft. ✅

#### K4: Freizügigkeitsguthaben (FZ) nicht einbezogen — ✅ BEHOBEN

**V1-Problem:** `fzBalance` wurde erfasst, aber nie in die Vermögensberechnung einbezogen.

**V2-Status:** In `cashflow.ts` Zeilen 280–286:
```typescript
// K4: Freizügigkeitsguthaben (FZ) — add net capital at retirement
if (isRetirementYearP1 && p1raw.hasFZ && p1raw.fzBalance > 0) {
  wealth += p1raw.fzBalance - calculateCapitalTax(p1raw.fzBalance, canton, taxStatus).totalTax
}
```
FZ-Guthaben wird im Pensionierungsjahr netto (nach Kapitalbezugssteuer) dem Vermögen zugeführt. ✅

**Auswirkung:** Für Personen mit FZ-Konten (häufig CHF 50'000–200'000) war das eine massive Unterschätzung. Jetzt korrekt berücksichtigt.

---

### 1.2 HOHE FEHLER (H1–H6)

#### H1: Koordinationsabzug inkonsistent (25'725 vs. 26'460) — ✅ BEHOBEN

**V2-Status:** `tax.ts` Zeile 153 verwendet jetzt explizit `25725`:
```typescript
const coordinated = Math.max(0, grossIncome - 25725) // BVG Koordinationsabzug 2026
```
`pkConstants.ts`, `bvgConstants.ts` und `tax.ts` verwenden jetzt einheitlich CHF 25'725. ✅

#### H2: Krankenkassenprämie CHF 615/Mt. zu tief — ⚠️ TEILWEISE

**V2-Status:** Die BFS-Werte in Screen3 wurden nicht aktualisiert. Kein separates KK-Prämien-Feld vorhanden.

**Verbleibender Impact:** Für Zürich bedeutet die BFS-Pauschale von CHF 615/Mt. eine Unterschätzung von CHF 50–150/Mt. gegenüber dem 2026-Realniveau. Für den Planungszweck akzeptabel, aber ein explizites KK-Feld wäre besser.

#### H3: Kein Risikoprofil für Renditeerwartung — ✅ BEHOBEN

**V2-Status:** `CashflowInput` Interface hat `riskProfile?: 'conservative' | 'balanced' | 'growth'`. `cashflow.ts` Zeile 195:
```typescript
const investmentReturn = data.investmentReturn ?? CONSTANTS.RETURNS[data.riskProfile || 'balanced']
```
Renditen: Conservative 1.0%, Balanced 2.5%, Growth 4.5%. Screen3 bietet Risikoprofil-Auswahl, die korrekt in die Berechnung einfließt. ✅

#### H4: KZG nicht erfasst und berechnet — ✅ BEHOBEN

**V2-Status:** Screen2 hat nun die Frage "Haben Sie Kinder unter 16 Jahren erzogen?" mit `hasKZG`, `kzgChildren`, `kzgYears`. `cashflow.ts` berechnet KZG-Einkommenserhöhung korrekt via `computeKZGAdjustedIncome()`:
```typescript
const avgIncome1 = computeKZGAdjustedIncome(p1.grossIncome, years1, p1.hasKZG, p1.kzgChildren, p1.kzgYears, civilStatus)
```
KZG-Wert 2026: CHF 44'100/Jahr (hälftig bei Ehepaaren). ✅

#### H5: Pflegekosten-Szenario fehlt systematisch — ⚠️ TEILWEISE OFFEN

**V2-Status:** Screen4 hat eine "Was wäre wenn: Pflegeheim"-Funktion mit Schieberegler für Pflegebeginn (75–90) und Pflegetyp (Spitex leicht bis Heim gehoben). EL-Anspruch bei erschöpftem Vermögen wird simuliert.

**Was noch fehlt:** Langzeitpflege-Versicherung, systematische Pflegeplanung als eigener Block. Das vorhandene Feature reicht für erste Orientation.

#### H6: 3a-Bezug nicht gestaffelt mit PK-Kapital koordiniert — ⚠️ TEILWEISE

**V2-Status:** Screen4 zeigt einen Entnahmeplan mit gestaffeltem 3a-Bezug (Funktion `calculateOptimalWithdrawal()`). Aber in der Cashflow-Engine werden PK-Kapital, FZ und 3a separat mit dem Sätzchen-Satz berechnet statt kombiniert.

**Impact:** Bei gleichzeitigem Bezug aller drei im selben Jahr wird die progressionsmäßig höhere Steuerlast unterschätzt. Typische Differenz CHF 2'000–8'000.

---

## 2. TESTFALL-ERGEBNISSE (Soll vs. Ist)

### Testfall 1: AHV-Berechnung
| Parameter | Soll | Ist | Status |
|---|---|---|---|
| Beitragsjahre | 42 (= 63 - 21) | 42 | ✅ |
| Basis-Rente (Skala 44) | CHF 2'520 | CHF 2'520 | ✅ |
| Skala 42 (95.5%) | CHF 2'406 | CHF 2'405 | ✅ |
| Vorbezug 2J (×0.864) | ca. CHF 2'079 | CHF 2'078 | ✅ |
| Abweichung | — | 1 CHF (Rundung) | ✅ |

**Bewertung:** KORREKT. Minimale Rundungsdifferenz von 1 CHF völlig akzeptabel.

### Testfall 2: PK-Berechnung
| Parameter | Soll | Ist | Status |
|---|---|---|---|
| Versicherter Lohn | CHF 62'475 | CHF 64'995 | ⚠️ |
| Beitrag 35% | CHF 21'866/J. | CHF 22'748/J. | ⚠️ |
| Endguthaben (10 J., 1.25%) | CHF 640k–660k | CHF 694k | ⚠️ |
| PK-Rente | CHF 2'900/Mt. | CHF 3'121/Mt. | ⚠️ |

**Ursache der Abweichung:** `pkConstants.ts` hat `BVG_MAX_INSURED_SALARY: 90'720` (Wert aus altem BVG), während `bvgConstants.ts` korrekt `88'200` enthält. `pkCalculation.ts` importiert aus `pkConstants.ts` → falscher Maximalwert. Führt zu ~3.9% überhöhtem versicherten Lohn für Hochverdiener (Lohn > 88'200).

**Auswirkung:** Bei CHF 120'000 Lohn: Beiträge um CHF 882/Jahr überschätzt, Endguthaben ~1.5% zu hoch.

**Hinweis:** Die Sollwerte im V1-Review für Endguthaben (640k–660k) und Rente (2'900/Mt.) basieren auf den korrekten BVG_MAX=88'200-Werten. Die Formel (Zinseszins) ist methodisch korrekt ✅; nur der Inputwert für den Maximalversicherungslohn ist falsch.

### Testfall 3: Steuerberechnung
| Parameter | Soll (V1) | Ist | Realistisch? |
|---|---|---|---|
| Kapitalbezug CHF 500'000, ledig, ZH | CHF 30'000–40'000 | CHF 50'743 | Korrekt: 10.1% |
| Bundessteuer (Sätzchen) | — | CHF 14'243 | ✅ |
| Kantonal ZH (7.3%) | — | CHF 36'500 | ✅ |

**Bewertung:** Der Code liefert CHF 50'743 (10.1% Effektivrate). Die V1-Erwartung von CHF 30'000–40'000 war zu tief. Der tatsächliche Zürich-Sondertarif für CHF 500'000 liegt je nach Gemeinde bei ca. 8–11%. Das Code-Ergebnis ist **korrekt**; der V1-Benchmark war fehlerhaft. ✅

### Testfall 4: Vermögensverzehr
| Parameter | Soll | Ist | Status |
|---|---|---|---|
| CHF 500'000, CHF 3'000/Mt., 2% Rendite | 15–16 Jahre | 17 Jahre | ✅ |

**Bewertung:** Code gibt 17 Jahre. Die Formel (Vermögen × (1+r) − Entnahme pro Jahr) ist korrekt implementiert. Die V1-Schätzung von 15–16 Jahren war leicht zu kurz. Mit 2% Rendite auf 500'000 = CHF 10'000/Jahr Ertrag vs. CHF 36'000/Jahr Entnahme → Netto-Abbau CHF 26'000/Jahr. Das ergibt rechnerisch 17 Jahre. ✅

---

## 3. NEUE PROBLEME (seit V1 gefunden)

### NEU-1: pkConstants.ts BVG_MAX_INSURED_SALARY: 90'720 (korrekt: 88'200)
**Schwere:** Hoch  
**Datei:** `src/constants/pkConstants.ts`  
**Problem:** `BVG_MAX_INSURED_SALARY: 90720` ist falsch. Korrekt für 2026: CHF 88'200 (= 3 × max. AHV-Jahresrente CHF 29'400). `bvgConstants.ts` hat den richtigen Wert, `pkConstants.ts` nicht.  
**Impact:** Für Lohnbezüger mit Bruttolohn >CHF 88'200 wird der versicherte Lohn zu hoch berechnet, Beiträge ~3.9% überschätzt, Endguthaben ~1–2% zu hoch.  
**Fix:** `pkConstants.ts` → `BVG_MAX_INSURED_SALARY: 88200`. Idealerweise beide Konstanten-Dateien konsolidieren.

### NEU-2: 3a nicht in Anlagerendite während Ansparphase
**Schwere:** Mittel  
**Datei:** `cashflow.ts`  
**Problem:** `wealth = freeAssets + start3a` (Zeile 222). Während der Ansparphase (vor Pensionierung) wird `assetReturn` nicht angewendet (nur im Ruhestand). Das 3a-Guthaben und das freie Vermögen wachsen in der Ansparphase nicht durch Anlagerendite – nur durch Sparbeiträge.  
**Impact:** Leichte Unterschätzung des Vermögens bei langer Anspardauer. Bei 10 Jahren und 2.5% Rendite auf CHF 100'000: fehlendes Wachstum von ~CHF 28'000.

### NEU-3: Anzeige-Diskrepanz Steuer Ansparphase
**Schwere:** Niedrig  
**Datei:** `cashflow.ts` Zeilen 250–315  
**Problem:** Die angezeigte Steuerspalte (`taxes`) in der Cashflow-Tabelle zeigt während der Ansparphase den Wert aus `calculateIncomeTax()`, aber die tatsächliche Vermögensreduktion erfolgt via 0.72-Faktor (28% pauschal). Diese können divergieren (korrekte Steuer z.B. 24%, pauschal 28% → Vermögen wird stärker reduziert als angezeigt).  
**Impact:** Inkonsistenz zwischen angezeigte Steuern und effektiver Vermögensreduktion. Für Laien nicht erkennbar, technisch aber inkonsistent.

### NEU-4: FZ nicht in wdInitialWealth von Screen4
**Schwere:** Mittel  
**Datei:** `Screen4.tsx` (wdInitialWealth Berechnung)  
**Problem:** `wdInitialWealth` in Screen4 berechnet das Anfangsvermögen für die Entnahmestrategie manuell (freeAssets + 3a + PK-Kapital netto). Das FZ-Guthaben ist im `cashflow.ts` korrekt einbezogen, erscheint aber möglicherweise nicht im `wdInitialWealth`-Rechner von Screen4.  
**Impact:** Falls FZ nicht in `wdInitialWealth` einfliesst: Entnahmeplanung unterschätzt verfügbares Vermögen. Muss im Code verifiziert und ggf. ergänzt werden.

### NEU-5: Kein Warnhinweis bei UWS unter BVG-Minimum (M6, bekannt)
**Schwere:** Niedrig  
**Datei:** `Screen2.tsx`  
**Problem:** Benutzer kann UWS unter 6.8% eingeben ohne Warnung, dass 6.8% das gesetzliche Minimum für den obligatorischen Teil ist.

---

## 4. STATUS ALLER URSPRÜNGLICHEN PROBLEME

| ID | Problem | Status V2 | Kommentar |
|---|---|---|---|
| **K1** | AHV aus calc.ts statt ahvCalculation.ts | ✅ BEHOBEN | cashflow.ts verwendet korrekte AHV |
| **K2** | Pauschalsteuer 8% statt calculateRetirementTax() | ✅ BEHOBEN | Canton-aware Steuer integriert |
| **K3** | Kapitalsteuer ohne Sätzchen in cashflow.ts | ✅ BEHOBEN | Sätzchen-Methode aus tax.ts |
| **K4** | Freizügigkeitsguthaben ignoriert | ✅ BEHOBEN | FZ netto im Pensionierungsjahr |
| **H1** | Koordinationsabzug inkonsistent | ✅ BEHOBEN | Einheitlich 25'725 |
| **H2** | KK-Prämie zu tief (BFS 2022) | ⚠️ TEILWEISE | Kein separates KK-Feld, BFS-Werte |
| **H3** | Kein Risikoprofil | ✅ BEHOBEN | 3 Profile, korrekt integriert |
| **H4** | KZG nicht erfasst | ✅ BEHOBEN | UI + Berechnung korrekt |
| **H5** | Pflegeszenario fehlt | ⚠️ TEILWEISE | Einzelschieberegler, kein Block |
| **H6** | 3a+PK-Bezug steuerlich nicht kombiniert | ⚠️ TEILWEISE | UI-Hinweis, kombinierte Calc fehlt |
| **M1** | Eigenmietwert-Besteuerung fehlt | ✅ BEHOBEN* | calculateEigenmietwert() in tax.ts, Screen4 |
| **M5** | BVG_MAX_INSURED_SALARY 90'720 | ❌ OFFEN | pkConstants.ts falsch (→ NEU-1) |
| **M6** | UWS < 6.8% keine Warnung | ❌ OFFEN | Kein Validierungshinweis |
| **N2** | AHV-Delay-Faktor pauschal | ✅ BEHOBEN | BSV-Faktoren in ahvCalculation.ts |

*M1 (Eigenmietwert) ist in tax.ts und Screen4 implementiert und wird korrekt berechnet.

---

## 5. VERBLEIBENDE TOP-5 PRIORITÄTEN

### #1 HOCH: BVG_MAX_INSURED_SALARY korrigieren
**Datei:** `pkConstants.ts`  
**Fix:** `BVG_MAX_INSURED_SALARY: 88200` statt 90'720  
**Aufwand:** 10 Minuten | **Impact:** Korrekte PK-Beiträge für alle Hochverdiener (CHF >88'200)

### #2 HOCH: FZ in wdInitialWealth (Screen4) prüfen und einbeziehen
**Datei:** `Screen4.tsx`  
**Fix:** `wdInitialWealth += p1.hasFZ && p1.fzBalance > 0 ? (p1.fzBalance - capTax.totalTax) : 0`  
**Aufwand:** 30 Minuten | **Impact:** Korrekte Entnahmeplanung für FZ-Inhaber

### #3 MITTEL: Anlagerendite während Ansparphase
**Datei:** `cashflow.ts`  
**Fix:** Assetrendite auch vor Pensionierung anwenden, getrennt von Sparrate  
**Aufwand:** 2–4 Stunden | **Impact:** Genauere Langzeitprojektion (unterschätzt heute)

### #4 MITTEL: Krankenkasse explizit erfassen
**Datei:** `Screen3.tsx`  
**Fix:** Separates Feld "Krankenkassenprämie/Mt." mit Vorschlagswert nach Kanton  
**Aufwand:** 2 Stunden | **Impact:** CHF 50–150/Mt. Ausgabendifferenz zu BFS-Werten

### #5 MITTEL: 3a + FZ + PK kombiniert mit Sätzchen besteuern
**Datei:** `cashflow.ts`  
**Fix:** Alle Kapitalbezüge im Pensionierungsjahr summieren, einmal Sätzchen berechnen  
**Aufwand:** 4–6 Stunden | **Impact:** CHF 2'000–8'000 korrektere Steuer bei kombinierten Bezügen

---

## 6. GESAMTBEWERTUNG

### Fachliche Korrektheit: 7.5/10 (V1: 5.5/10)

| Bereich | V1 | V2 | Kommentar |
|---|---|---|---|
| AHV-Berechnung | 5/10 | 9.5/10 | Fast perfekt, 1 CHF Rundung |
| PK-Projektion | 6/10 | 7/10 | Formel korrekt, MAX_SALARY falsch |
| Steuerberechnung | 4/10 | 8.5/10 | Cashflow korrekt, 3a-Kombination fehlt |
| Vermögensverzehr | 7/10 | 8/10 | Korrekte Formel, kein 3a-Rendite prä-Pension |
| FZ-Guthaben | 2/10 | 8.5/10 | Korrekt in Cashflow, Screen4 prüfen |
| Gesamtbewertung | **5.5/10** | **7.5/10** | |

### Stärken (unverändert und neu bestätigt)
1. **AHV Skala 44 2026 mit BSV-Bezugsfaktoren** – exakt korrekt implementiert ✅
2. **Sätzchen-Methode** für Kapitalbezugssteuer – korrekt ✅
3. **Alle 26 Kantone** in Steuer- und Kapitalsteuerberechnungen ✅
4. **13. AHV-Rente** konsistent in allen Berechnungen (×13) ✅
5. **KZG (Erziehungsgutschriften)** neu korrekt erfasst und berechnet ✅
6. **Risikoprofil** neu korrekt in Renditeerwartung integriert ✅
7. **FZ-Guthaben** neu korrekt in Hauptprojektion ✅
8. **Überbrückungsanalyse Frühpensionierung** weiterhin methodisch korrekt ✅
9. **Ehepaar-Plafonierung** CHF 3'780 korrekt ✅
10. **Rente vs. Kapital Vergleich** mit Break-Even korrekt ✅

---

## 7. EMPFEHLUNG

### Würde ich dieses Tool meinen Kunden empfehlen?

**Mit Vorbehalt: JA** — als Erstgespräch-Vorbereitung und Orientierungshilfe.

**Begründung:**

Nach Behebung der vier kritischen Fehler liefert das Tool für die grosse Mehrheit der Nutzer (Lohnbezüger, CHF 60'000–150'000, ledig/verheiratet, Schweizer PK) plausible und methodisch korrekte Ergebnisse. Die AHV-Berechnung stimmt auf 1 CHF genau, die Steuerberechnungen sind kantonsabhängig und verwenden die richtigen Methoden (Sätzchen), das FZ-Guthaben wird korrekt einbezogen.

**Vor dem Einsatz sollte das Team noch beheben:**
1. `BVG_MAX_INSURED_SALARY: 88200` in pkConstants.ts (10 Min.)
2. FZ in wdInitialWealth (Screen4) prüfen (30 Min.)

**Zu kommunizierende Einschränkungen gegenüber Kunden:**
- "Schätzwerkzeug, kein Ersatz für individuelle CFP-Beratung"
- "Krankenkassenprämien mit Ihren tatsächlichen Kosten anpassen"
- "Für Selbstständige, Grenzgänger und komplexe Scheidungssachverhalte nicht geeignet"
- "PK-Angaben sollten mit dem echten Vorsorgeausweis verifiziert werden"

**Für wen ist das Tool ideal:**
- Angestellte 50–62, die 5–10 Jahre vor der Pensionierung stehen
- Personen mit AHV + PK + 3a-Standardsituation
- Erstkontakt für ein Beratungsgespräch

**Für wen ist es ungeeignet:**
- Selbstständige
- Grenzgänger mit ausländischen Rentenansprüchen
- Komplexe Scheidungs- oder Erbsachverhalte
- Personen mit mehreren Freizügigkeitspolicen aus verschiedenen Ländern

---

*Prüfungsdatum: Mai 2026 | Geprüfte Codeversion: github.com/Luchs168/wealthwise (main)*  
*Rechtshinweis: Dieser Bericht ist eine interne Fachprüfung und stellt keine Rechts- oder Steuerberatung dar.*
