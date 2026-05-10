# WealthWise – Fachliche Prüfung aus Sicht eines Schweizer Finanzplaners (CFP)

**Datum:** Mai 2026  
**Prüfer:** Erfahrener Schweizer Finanzplaner (CFP-zertifiziert, 15 Jahre Erfahrung Pensionierungsplanung)  
**Scope:** Gesamte Applikation – alle Screens, Berechnungsmodule und Darstellungen  
**Fazit:** Solide Basis mit klaren Stärken – aber mehrere kritische Fehler und wichtige Lücken, die vor dem produktiven Einsatz behoben werden müssen.

---

## EXECUTIVE SUMMARY

WealthWise ist ein ambitioniertes Vorsorgeplanungstool mit einer guten Grundstruktur. Die Integration aller drei Säulen, die AHV-Detailanalyse mit Skala 44 2026 und die Überbrückungsberechnung sind bemerkenswert. Gleichzeitig gibt es **kritische Berechnungsfehler**, die zu materiell falschen Ergebnissen führen, **wichtige fehlende Themen** aus dem Beratungsalltag sowie **Kommunikationslücken**, die den Laien-Kunden überfordern.

**Priorisierte Hauptprobleme:**
1. Zwei parallele AHV-Berechnungsmodule (calc.ts vs. ahvCalculation.ts) mit inkonsistenten Daten
2. Vereinfachte Steuerschätzung (8% pauschal) in der Cashflow-Engine (cashflow.ts)
3. Freizügigkeitsguthaben (FZ-Konten) wird erfasst, aber nicht in Berechnungen einbezogen
4. Kein Risikoprofil des Kunden – Anlagerendite wird pauschal angenommen
5. Krankenkassenprämien fehlen als explizite Rentenausgabe

---

## 1. FACHLICHE KORREKTHEIT

### 1.1 AHV-Berechnungen

#### KRITISCH: Zwei inkonsistente AHV-Module

Das Tool enthält **zwei parallele AHV-Berechnungsmethoden**:

- `src/lib/calc.ts` → `calculateAhvPro()` / `calculateAhvHousehold()` → benutzt von `cashflow.ts`
- `src/utils/ahvCalculation.ts` → `calculateAHVPension()` / `calculateAllVariants()` → benutzt von Screen2 und Screen4 (Detailanalyse)

**Problem:** Die beiden Module können zu unterschiedlichen Ergebnissen führen, da sie unterschiedliche Datentabellen verwenden:

| Parameter | calc.ts (alt) | ahvCalculation.ts (neu) |
|---|---|---|
| Minimales Durchschnittseinkommen | CHF 15'120 | CHF 14'700 ✓ |
| Maximales Durchschnittseinkommen | CHF 90'720 | CHF 88'200 ✓ |
| Skalenpunkte | Stufentabelle (veraltet) | Lineare Interpolation (korrekt) |
| AHV Bezugsfaktoren 63–70 | Nicht implementiert | BSV 2026 Faktoren ✓ |

**Wirkung:** `cashflow.ts` (Hauptprojektion!) verwendet die alte, fehlerhafte Tabelle aus `calc.ts`. Das führt zu falschen AHV-Rentenbeträgen im zentralen Vermögensverlauf-Chart (Block B).

**Korrekt (Skala 44, 2026):**
- Minimales Durchschnittseinkommen: CHF 14'700/Jahr
- Maximales Durchschnittseinkommen: CHF 88'200/Jahr
- Min. monatliche Rente: CHF 1'260
- Max. monatliche Rente: CHF 2'520
- Lineare Interpolation zwischen diesen Punkten

**Empfehlung:** `cashflow.ts` auf `calculateAHVPension()` aus `ahvCalculation.ts` umstellen. `calculateAhvPro()` in `calc.ts` deprecieren oder entfernen.

#### HOCH: AHV-Aufschubfaktoren in calc.ts inkorrekt

In `calc.ts` ist `AHV_DELAY_INCREASE_PER_YEAR: 5.2` (Zeile 7) hinterlegt. Dies stimmt nicht mit den offiziellen BSV-Faktoren der Skala 44 überein:

| Bezugsalter | Faktor BSV 2026 | Implizierter Jahreszuschlag |
|---|---|---|
| 66 | 1.052 | +5.2% |
| 67 | 1.106 | +5.4% |
| 68 | 1.163 | +5.7% |
| 69 | 1.224 | +5.6% |
| 70 | 1.313 | +8.9% (letztes Jahr höher) |

Die Aufschläge sind nicht linear – calc.ts verwendet einen pauschalen Wert, der für spätere Jahrgänge falsch ist. In `ahvCalculation.ts` sind die Faktoren jedoch korrekt hinterlegt.

#### MITTEL: Kinderziehungsgutschriften (KZG)

`calc.ts` modelliert KZG (`hasChildCredits`, `AHV_CHILD_CREDIT_YEARLY: 44'100`), aber in Screen1 und Screen2 wird der Benutzer **nicht gefragt**, ob Kinder vorhanden sind und für welche Jahre KZG gutgeschrieben wurden. Im Store (`index.ts`) gibt es zwar `hasChildren` und `children[]`, aber kein Feld für `hasChildCredits`.

**Relevanz in der Praxis:** KZG von CHF 44'100/Jahr (geteilt bei Ehepaaren: je CHF 22'050) können die AHV-Rente für Eltern von Kleinkindern um CHF 100–300/Monat erhöhen – ein häufig vergessener und substanzieller Faktor.

**Fehlend:** Betreuungsgutschriften (BTG) für pflegende Angehörige (max. 3 × max. einfache AHV-Rente).

#### MITTEL: Beitragsjahre nicht aus DOB automatisch berechnet

Screen2 fragt nach "Beitragsjahren" manuell. Für Personen, die seit 20 Jahren in der Schweiz leben und nie im Ausland waren, könnten diese automatisch aus Geburtsdatum berechnet werden (obligatorisch AHV ab 20/25 Jahren). Die manuelle Eingabe führt in der Praxis regelmässig zu falschen Angaben (Kunden kennen ihre genaue Anzahl Beitragsjahre oft nicht).

#### GUT: 13. AHV-Rente korrekt integriert

Die 13. AHV-Rente (ab 2026) wird korrekt als `monthlyRente × 13` für die Jahresrente berechnet und in der Darstellung transparent ausgewiesen. ✓

#### GUT: AHV Vorbezug/Aufschub korrekt

Die BSV 2026 Faktoren (0.864 bis 1.313) sind in `ahvCalculation.ts` korrekt hinterlegt. Break-Even-Berechnung und Variantenvergleich (63–67) sind methodisch richtig. ✓

---

### 1.2 PK-Projektionen

#### HOCH: BVG-Koordinationsabzug inkonsistent

| Datei | Wert |
|---|---|
| `pkConstants.ts` → `COORDINATION_DEDUCTION_2026` | CHF 25'725 |
| `tax.ts` Zeile 153 | CHF 26'460 |
| Korrekt für 2026 (7/8 × max. AHV-Rente 29'400) | CHF 25'725 |
| Korrekt für 2026 (7/8 × max. AHV-Rente 30'240 inkl. 13.) | CHF 26'460 |

**Problem:** `tax.ts` verwendet CHF 26'460 für den PK-Koordinationsabzug in der Steuerberechnung, `pkConstants.ts` CHF 25'725. Dieser Widerspruch führt zu leicht unterschiedlichen Ergebnissen je nach Codepfad. 

**Empfehlung:** Einheitliche Konstante definieren. Offizieller 2026-Wert: CHF 25'725 (BSV/SVA-Kreisschreiben). Die 13. AHV-Rente ändert den BVG-Koordinationsabzug nicht.

#### MITTEL: BVG-Mindest-Umwandlungssatz in Berechnungen nicht klar

`pkConstants.ts` enthält `BVG_MIN_CONVERSION_RATE: 0.068` (gesetzlicher Mindestsatz obligatorischer Teil) und `DEFAULT_CONVERSION_RATE: 0.054` (überobligatorischer Satz). In Screen2 kann der Benutzer den UWS eingeben, aber es gibt keine Warnung, wenn der eingegebene Satz unter dem gesetzlichen Minimum liegt (was bei reinem Pflichtbeitrag nicht zulässig ist).

**Praxis-Relevanz:** Grosse Kassen verwenden Misch-UWS von 5.0–6.0% (2026). Kleinere Kassen bleiben oft bei 5.4–5.6%. Der Unterschied bei CHF 400'000 Guthaben: 5.0% → CHF 1'667/Mt. vs. 6.0% → CHF 2'000/Mt.

#### MITTEL: PK-Beiträge in cashflow.ts nicht berücksichtigt

Die Ansparphase (vor Pensionierung) in `cashflow.ts` akkumuliert kein PK-Guthaben. Das Tool nimmt `pkCapital` als statische Eingabe, ohne zu projizieren, wie es sich bis zur Pensionierung entwickelt. Dies ist konsistent mit der Designentscheidung (Benutzer gibt Endbetrag ein), aber:

1. Wenn der Benutzer kein aktuelles Guthaben eingibt, wird der Projektion ein falscher Wert zugrunde gelegt
2. Die PK-Projektion in Screen2/Block F zeigt zwar die Entwicklung, aber der Hauptcashflow (Block B) verwendet den manuell eingegebenen Wert

#### HOCH: Frühpensionierung PK-Umwandlungssatz-Reduktion zu gering

`pkConstants.ts` → `EARLY_RETIREMENT_CONVERSION_REDUCTION_PER_YEAR: 0.00175` (0.175% pro Jahr früher).

**Typische Pensionskassen** reduzieren den UWS bei Frühpensionierung um 0.1–0.3% pro Jahr. 0.175% ist im unteren Bereich, aber vertretbar. Die Auswirkung bei 5 Jahren Frühpensionierung (0.875% Reduktion: 5.4% → 4.525%) entspricht in etwa dem Marktdurchschnitt. Dieser Wert ist **nicht falsch**, aber er sollte als Annahme klar kommuniziert werden – in der Praxis gibt es grosse Unterschiede zwischen Kassen.

#### KRITISCH: Freizügigkeitsguthaben (FZ-Konten) wird ignoriert

Im Store existieren `hasFZ: boolean` und `fzBalance: number`, aber **nirgends in `cashflow.ts` oder `calculateProAnalysis()` werden FZ-Guthaben einbezogen**.

**Praxis-Relevanz:** Personen, die frühere Arbeitgeber gewechselt haben und Freizügigkeitskonten führen, haben oft CHF 50'000–200'000 auf FZ-Konten. Diese werden aktuell vollständig ignoriert – das führt zu massiver Unterschätzung des verfügbaren Vermögens.

---

### 1.3 Steuerberechnungen

#### KRITISCH: Pauschale 8%-Steuer in der Hauptprojektion

`cashflow.ts` Zeile 203:
```javascript
const taxRate = p1Retired || p2RetiredSimple ? 0.08 : 0.15
```

Dies ist die **zentrale Berechnungsgrundlage für den gesamten Cashflow** (Block B – Vermögensverlauf). Mit pauschalen 8% im Ruhestand werden:

- Niedrigverdiener im Rentenalter (Kanton SZ, tiefes Einkommen): tatsächlich 2–4% → **Steuern überschätzt**
- Hochverdiener in Genf mit hohem PK-Bezug: tatsächlich 10–15% → **Steuern unterschätzt**

Die detaillierten Steuerberechnungen in `tax.ts` (`calculateRetirementTax()`) sind vorhanden und korrekt – sie werden nur **nicht** von `cashflow.ts` verwendet.

**Empfehlung:** `calculateRetirementTax(ahvMonthly, pkMonthly, canton, taxStatus, kirchensteuer)` aus `tax.ts` in `cashflow.ts` einbinden.

#### HOCH: Kapitalbesteuerung in cashflow.ts fehlt Sätzchen-Methode

`cashflow.ts` Zeile 175:
```javascript
wealth += cap1 - calculateCapitalWithdrawalTax(cap1)
```

Dies ruft `calculateCapitalWithdrawalTax()` aus `calc.ts` auf, das **vereinfachte lineare Brackets** ohne die "Sätzchen"-Methode verwendet. `tax.ts` hat die korrekte Implementierung:

```
Bundessteuer: 5 × Steuer(Kapital/5) — korrekte Sätzchen-Methode ✓
```

Bei CHF 400'000 PK-Kapitalbezug:
- `calc.ts` (falsch): ~CHF 26'000 Steuer
- `tax.ts` (korrekt): ~CHF 20'000–24'000 (kantonsabhängig)

Differenz: CHF 2'000–6'000 – material.

#### GUT: Steuerberechnung in Block E/F von Screen4 korrekt

`calculateRetirementTax()`, `calculateCapitalWithdrawalTax()` aus `tax.ts` werden in Screen4 für die Detailanalyse korrekt verwendet. Das Problem liegt nur im Cashflow-Backbone. ✓

#### MITTEL: Eigenmietwert-Besteuerung fehlt komplett

Wohneigentumsbesitzer in der Schweiz versteuern einen fiktiven Mietertrag (Eigenmietwert). Dieser:
- Erhöht das steuerbare Einkommen im Ruhestand (bei niedriger Rente absolut relevant)
- Kann bei Hypothek teilweise durch Schuldzinsabzug kompensiert werden
- Ist kantonal sehr unterschiedlich (Zürich: ~3.5% des Steuerwerts)

Das Tool erfasst Immobilienwert und Hypothek, berechnet aber keinen Eigenmietwert-Effekt auf die Steuerlast.

#### MITTEL: Kapitalgewinnsteuern auf Wertschriften fehlen

Wertschriften-Kursgewinne (Privatvermögen) sind in der Schweiz steuerfrei. Dies ist korrekt. Aber **Dividenden und Zinserträge** unterliegen der Einkommenssteuer. Das Tool modelliert keine Kapitalertragsbesteuerung auf freie Anlagen.

---

### 1.4 Krankenkassenprämien – Kritische Lücke

In Screen3 erscheint "Gesundheit" mit CHF 615/Monat BFS-Standardwert. Dieser ist für 2022 und deckt alle Gesundheitsausgaben ab.

**Problem:** Die Krankenkassenprämie allein beträgt 2026 für einen Erwachsenen in den Kantonen:
- Zürich: CHF 550–750/Monat (Grundversicherung)
- Genf: CHF 750–950/Monat
- Schweizer Durchschnitt: CHF 620–700/Monat

Hinzu kommen Franchise (CHF 300–2'500/Jahr) und Selbstbehalt (10% bis CHF 700/Jahr).

Die Krankenkassenprämie sollte als **eigene Eingabe** erfasst werden, da sie:
1. Je nach Kanton und Modell stark variiert
2. Im Rentenalter häufig steigt (Leistungsanpassungen)
3. Prämienverbilligungen (IPV) ab CHF 35'000–60'000/Jahr greifen können

---

## 2. VOLLSTÄNDIGKEIT

### 2.1 Fehlende Themen

#### KRITISCH: Kein Risikoprofil des Kunden

Das Tool nimmt an, dass das Vermögen eine bestimmte Rendite erzielt, ohne je nach der Risikofähigkeit des Kunden zu fragen. `cashflow.ts` verwendet `RETURNS.balanced = 2.5%` als Default.

**Im Erstgespräch frage ich immer:**
- "Wie würden Sie reagieren, wenn Ihr Portfolio 30% an Wert verliert?"
- "Haben Sie ausreichend Liquiditätsreserve ausserhalb Wertschriften?"
- "Wie viel Schulden haben Sie?"

Ohne Risikoprofil können keine sinnvollen Renditeempfehlungen gegeben werden. Das Tool sollte mindestens die drei Optionen Conservative/Balanced/Growth als Benutzerauswahl anbieten (nicht nur in den Szenarien versteckt).

#### HOCH: Pflegekosten und Langzeitpflege fehlen

Eine der grössten Unsicherheiten in der Pensionierungsplanung:
- Pflegeheim Schweiz: CHF 6'000–15'000/Monat (netto nach KK und EL)
- 40% der Personen ab 80 brauchen Pflegeleistungen
- Spitex: CHF 50–200/Tag

Das Tool hat "Was wäre wenn: Pflegeheim" als einzeiligen Schieberegler in Block B2, aber keine systematische Planung für Pflegefinanzierung.

**Was fehlt:**
- Langzeitpflege-Versicherung (Pflegeversicherung)
- AHV/EL-Anspruch bei Pflegeheimkosten
- Vermögenseinsatz bei Pflegefinanzierung (wann greift EL?)

#### HOCH: Invalidenversicherung (IV) vor Pensionierung

Für Kunden unter 63 Jahren ist das IV-Risiko real. Das Tool plant direkt von "aktuell gesund bis Pensionierung" – kein Szenario für Krankheit/Unfall.

**In der Praxis:** 15–20% der Pensionierungen erfolgen faktisch als Übergang aus IV. IV-Rente + PK-Invalidenrente + private Krankentaggeld-Versicherung müssen koordiniert werden.

#### MITTEL: Ehegüterrecht und Scheidungsfolgen

"Scheidung" ist als Lebensereignis vorhanden, aber ohne konkrete Berechnungslogik für:
- PK-Splitting (Freizügigkeitsleistung zum Zeitpunkt der Scheidung, nicht Rentenwert)
- Unterhaltsverpflichtungen (reduzieren freies Einkommen)
- AHV-Splitting bei Scheidung nach 1 Jahr Ehe
- Gütertrennung vs. Errungenschaftsbeteiligung

#### MITTEL: Selbstständige und Freelancer

Selbstständige haben fundamental andere Vorsorgesituation:
- Keine obligatorische PK (freiwillig BVG möglich)
- AHV-Beiträge 10% auf Gewinn
- 3a-Maximum ohne PK: CHF 36'288/Jahr (20% des Nettogewinns)
- Freizügigkeit bei Beendigung Selbstständigkeit
- Berufliche Vorsorge oft via Sammelstiftung oder gar nicht

Das Tool behandelt alle Nutzer als Angestellte.

#### MITTEL: Grenzgänger und internationale Sachverhalte

Personen mit Erwerbstätigkeit im Ausland:
- Teillücken in AHV (Beitragsjahre im Ausland unter Abkommen)
- Fremdrentenansprüche (Deutschland, Österreich, EU)
- Doppelbesteuerungsabkommen
- Quellensteuer auf ausländische Renten

Kein Flag oder Hinweis, dass internationale Sachverhalte vom Tool nicht abgedeckt werden.

#### NIEDRIG: Übertragbare Pensionskasse bei Auslandseinsatz

Viele 45–55-Jährige hatten Auslandsphasen. FZ-Abrechnung und Nachkauf sind komplex. Das Tool gibt keine Hinweise darauf.

---

### 2.2 Nicht modellierte Wechselwirkungen

#### 1. PK-Einkauf + Kapitalbezug 3-Jahres-Sperrfrist

In Block E (Steueroptimierung in Screen4) ist die 3-Jahres-Sperrfrist erwähnt. Aber das Tool warnt nicht **aktiv**, wenn ein Benutzer:
- Einen PK-Einkauf plant
- UND Kapitalbezug innerhalb von 3 Jahren plant

Diese Kombination führt zur Nachversteuerung des Einkaufs.

#### 2. Gestaffelter 3a-Bezug und PK-Kapitalbezug im gleichen Jahr

Wenn PK-Kapital und 3a im selben Steuerjahr bezogen werden, werden beide **gemeinsam** mit dem Sätzchen-Satz versteuert (höhere Progression). Das Tool berechnet beide separat.

#### 3. Frühpensionierung + AHV-Aufschub = optimale Kombination

Oft sinnvoll: PK ab 63 beziehen (Überbrückungsrente) + AHV bis 67 aufzuschieben. Die Break-Even-Analyse für diese Kombination fehlt.

#### 4. Nachlass und Erbschaftssteuer

Wenn PK-Kapital auf Erben übergeht (Tod nach Kapitalbezug), unterliegt dies der Erbschaftssteuer – kantonal sehr unterschiedlich. Wenn Rente gewählt wurde, geht bei Tod vor Leistungsbeginn oft nichts ans Erbe.

---

## 3. BERATUNGSPROZESS

### 3.1 Reihenfolge der Fragen (positiv)

Die Reihenfolge Screen1 → Screen2 → Screen3 → Screen4 ist fachlich sinnvoll:
1. Persönliche Situation (Basis)
2. Vorsorge (Einnahmen)
3. Ausgaben (Bedarf)
4. Analyse (Lücke/Überschuss)

Das entspricht dem klassischen Beratungsprozess. ✓

### 3.2 Rückfragen, die das Tool nicht stellt

Als Finanzplaner würde ich folgende Folgefragen stellen, die das Tool vermisst:

**In Screen1 (Persönliche Situation):**
- "Haben Sie Gesundheitsprobleme, die Ihre Lebenserwartung beeinflussen könnten?"
- "Haben Sie Unterhalts- oder Alimenti-Verpflichtungen?"
- "Sind Sie Eigentümer oder Mieter?" (früher stellen, da Einfluss auf Ausgaben)
- "Haben Sie Schulden ausserhalb der Hypothek?"

**In Screen2 (Vorsorge):**
- "Sind Sie sicher, dass Ihr aktuelles PK-Guthaben CHF X beträgt? Haben Sie Ihren letzten PK-Ausweis zur Hand?"
- "Haben Sie je im Ausland gearbeitet? Falls ja, haben Sie Ansprüche auf ausländische Renten?"
- "Haben Sie andere Einkommensquellen im Ruhestand (Mieteinnahmen, Mandatshonorare)?"
- "Haben Sie Freizügigkeitskonten aus früheren Arbeitsverhältnissen?"

**In Screen3 (Ausgaben):**
- "Haben Sie Haustiere, Sammlungen oder Hobbys mit regelmässigen Kosten?"
- "Planen Sie im Ruhestand mehr zu reisen als heute?"
- "Welche Ausgaben entfallen nach der Pensionierung (Berufskosten, Pendelkosten)?"

### 3.3 Wo Kunden mehr Erklärung brauchen

**"UWS" / "Umwandlungssatz":** Der Begriff ist für Laien absolut unverständlich. Viele Kunden wissen nicht, dass 5.4% × CHF 400'000 = CHF 21'600/Jahr bedeutet. Eine direkte Beispielrechnung täte gut.

**"Koordinationsabzug":** Weder erklärt noch kontextualisiert. Kunden fragen: "Warum muss ich CHF 25'725 abziehen?"

**"Frühpensionierung kostet CHF X":** Der Schock-Effekt ist gewollt und gut – aber ohne Kontext (was sind typische Beträge? Ist CHF 200'000 viel oder wenig?) wirkt er willkürlich.

**"Säule 3a":** Wird vorausgesetzt, dass Kunden den Unterschied zwischen Sparkonto und Wertschriften-3a kennen. Viele tun das nicht.

---

## 4. PRAXISRELEVANZ

### 4.1 Was echte Kunden anders machen als das Tool annimmt

**1. Kunden kennen ihr PK-Guthaben nicht genau.**
Das Tool lässt freie Eingabe zu. Die meisten Kunden tippen eine runde Zahl, die oft 10–30% vom tatsächlichen Wert abweicht. Besser: Pflichthinweis "Bitte Ausweis kontrollieren. Das aktuelle Guthaben finden Sie auf Ihrem jährlichen PK-Ausweis unter 'Altersguthaben'."

**2. Kunden unterschätzen systematisch ihre Ausgaben im Ruhestand.**
BFS-Durchschnittswerte werden unreflektiert akzeptiert. In der Praxis steigen Gesundheitskosten nach 70 deutlich an (Franchise, Selbstbehalt, Zahnarztehlungen nicht KK-pflichtig). Das Tool hat keinen "Alterszuschlag" für Gesundheitskosten.

**3. Kunden kennen ihre Beitragsjahre nicht.**
"44 Beitragsjahre" wird als Default vorgeschlagen. Viele Kunden mit Auslandsphasen, Erziehungspausen oder Ausbildungsjahren haben weniger. Die Lücke kostet: 1 fehlende Jahr = 1/44 weniger Rente = bei CHF 2'000/Mt. → CHF 45/Mt. lebenslang.

**4. Kunden glauben, PK-Rente und AHV decken alles.**
Die eigentliche Aufgabe des Tools – aufzuzeigen, dass eine Vermögenslücke entsteht – wird gut erfüllt. Aber die emotionale Botschaft "Sie haben eine Lücke von CHF X" braucht eine sofortige Gegenüberstellung: "Das können Sie jetzt noch tun."

**5. Kunden verwechseln PK-Sparguthaben und PK-Rente.**
"Ich habe CHF 500'000 in der PK" bedeutet nicht CHF 2'700/Monat Rente – die meisten Kunden verstehen den Zusammenhang nicht. Das Tool zeigt das in Screen2, aber die Verbindung zwischen Block B2 (Vermögen) und den Renten ist nicht klar genug.

### 4.2 Typische Beratungsfälle, die fehlen

- **Ehepaar: unterschiedliche Pensionierungsalter** – App modelliert das, aber die gegenseitige AHV-Plafonierung bei gestaffelter Pensionierung ist unvollständig
- **Selbstständige** – keine spezifische Unterstützung
- **Teilzeit-Karriere mit Beitragslücken** – wird nicht proaktiv erkannt
- **Übertragung von Wohneigentum an Kinder** (Schenkung) – häufig, aber nicht modelliert
- **Scheidung nach langer Ehe** – PK-Splitting nicht berechnet

---

## 5. DARSTELLUNG UND KOMMUNIKATION

### 5.1 Positive Aspekte

- Visualisierungen (Liniendiagramm Vermögensverlauf, Break-Even-Chart AHV) sind ansprechend ✓
- Score-Ring und Ampelfarben geben schnelle Orientierung ✓
- WhyBox-Erklärungen in Screen1 sind hilfreich ✓
- "Schock-Effekt" bei Frühpensionierungskosten ist gewollt und pädagogisch wertvoll ✓

### 5.2 Verbesserungsbedarf Kommunikation

**Zu technische Begriffe ohne Erklärung:**
- "UWS" / "Umwandlungssatz" – definieren
- "Plafonierung" – erklären
- "Koordinationsabzug" – erklären
- "Freizügigkeitsguthaben" – erklären
- "Überbrückungsrente PK" – erklären
- "Sätzchen-Methode" – für User nicht sichtbar, aber Ergebnis sollte erklärt werden

**Zahlen ohne Kontext:**
- "Ihr Nachhaltigkeits-Score: 67/100" – Was bedeutet 67? Was ist gut? Was sollte ich tun?
- "Break-even Alter 83" – Gut oder schlecht? Im Vergleich zur Lebenserwartung?
- "CHF 847/Monat Entnahme nötig" – Ist das viel? Wie viele Prozent des Vermögens?

**Fehlende "Was muss ich jetzt tun?"-Aufforderung:**
Das Tool endet mit Handlungsempfehlungen, aber ohne klare nächste Schritte ("Rufen Sie Ihre Pensionskasse an und fragen Sie nach..."). Für Laien ist der Abstand zwischen "Analyse fertig" und "tatsächliche Handlung" zu gross.

**Sprachliche Konsistenz:**
- Mal "Pension" (Deutsch), mal "Pensionierung", mal "Rente", mal "Retirement" (nur im Code, nicht sichtbar)
- "Frühpensionierung" vs. "vorzeitige Pensionierung" – einheitlich verwenden

### 5.3 Darstellung für 55-Jährigen Laien

Die Screens 1–3 sind für einen Durchschnitts-User gut verständlich. Screen4 ist **zu lang und zu komplex** für einen Laien ohne Finanzplanung-Hintergrund:

- 10+ Blöcke mit teils sehr technischen Inhalten
- Kein klares "Lesen Sie zuerst Block A, dann B" – Reihenfolge nicht priorisiert
- Empfehlung: Ein "Zusammenfassung"-Button oben in Screen4, der nur die 3 wichtigsten Kennzahlen zeigt (Lücke, Vermögensdauer, Handlungsbedarf) mit "Mehr Details" zum Ausklappen

---

## 6. DIE 10 WICHTIGSTEN VERBESSERUNGEN (PRIORISIERT)

### #1 KRITISCH: cashflow.ts auf korrekte Steuer- und AHV-Berechnungen umstellen

**Problem:** Der Kern der Analyse (Vermögensverlauf Block B) verwendet pauschale 8% Steuer und die veraltete AHV-Tabelle aus `calc.ts`.

**Lösung:**
```typescript
// In cashflow.ts, statt:
const taxRate = p1Retired ? 0.08 : 0.15
// Verwende:
const retireTax = calculateRetirementTax(ahvMonthly, pkMonthly, canton, taxStatus, kirchensteuer)
const taxRate = retireTax.effectiveRate

// Und für AHV statt calculateAhvHousehold():
// Portiere calculateAHVPension() aus ahvCalculation.ts in cashflow.ts
```

**Aufwand:** 1–2 Tage | **Impact:** Grundlegende Korrektheit der gesamten Projektion

---

### #2 KRITISCH: Freizügigkeitsguthaben (FZ-Konten) einbeziehen

**Problem:** `fzBalance` wird erfasst, aber nie in die Vermögensberechnung einbezogen.

**Lösung:** In `calculateProAnalysis()` und `wdInitialWealth`:
```typescript
wdInitialWealth += p1.hasFZ ? p1.fzBalance : 0
// + FZ-Kapitalsteuer bei Bezug berücksichtigen (wie PK-Kapital)
```

**Aufwand:** 0.5 Tage | **Impact:** Bis CHF 200'000 fehlende Vermögensbasis

---

### #3 HOCH: Krankenkassenprämie als explizite Eingabe erfassen

**Problem:** Gesundheitsausgaben CHF 615/Mt. (2022 BFS) unterschätzen die realen KK-Kosten 2026.

**Lösung:** In Screen3 spezifisches Feld für KK-Prämie mit Hinweis auf aktuelle Prämien und IPV-Anspruch (Prämienverbilligung).

**Aufwand:** 0.5 Tage | **Impact:** CHF 100–400/Mt. Ausgabendifferenz

---

### #4 HOCH: Risikoprofil erfassen und in Renditeerwartung übersetzen

**Problem:** Renditeerwartung wird pauschal als 2.5% angenommen, ohne den Benutzer zu fragen.

**Lösung:** In Screen3 (Ausgaben) oder als Teil von Screen4: Einfache Risikofrage mit 3 Optionen:
- Konservativ (0–1% Real) → nur Obligationen, Sparen
- Ausgewogen (1–2% Real) → gemischtes Portfolio
- Wachstum (2–3% Real) → aktienorientiert

**Aufwand:** 1 Tag | **Impact:** Grundlegende Planungsqualität

---

### #5 HOCH: Koordinationsabzug vereinheitlichen

**Problem:** `pkConstants.ts`: CHF 25'725 | `tax.ts`: CHF 26'460.

**Lösung:** Gemeinsame Konstante in `src/constants/bvgConstants.ts`:
```typescript
export const BVG_2026 = {
  COORDINATION_DEDUCTION: 25725, // 7/8 × max. AHV-Jahresrente 29'400
  ENTRY_THRESHOLD: 22050,        // 3/4 × max. AHV-Jahresrente 29'400
  MAX_INSURED_SALARY: 88200,     // 3 × max. AHV-Jahresrente 29'400
}
```

**Aufwand:** 2 Stunden | **Impact:** Berechnungskonsistenz

---

### #6 MITTEL: Kinderziehungsgutschriften korrekt erfassen

**Problem:** `calc.ts` hat KZG-Logik, aber Screen1/Screen2 erfasst keine KZG-Angaben vom Benutzer.

**Lösung:** In Screen2 (AHV-Abschnitt): Checkbox "Ich habe Kinder aufgezogen (relevant für KZG)" + Anzahl Kinder + Zeitraum der Kinderbetreuung (Kinder unter 16 Jahren während der Ehe/eingetragenen Partnerschaft).

**Aufwand:** 1 Tag | **Impact:** CHF 100–300/Mt. AHV-Rente für viele Eltern

---

### #7 MITTEL: Pflegekostenrisiko systematisch integrieren

**Problem:** Pflegekosten erscheinen nur als Einzeiler im "Was wäre wenn?"-Panel.

**Lösung:** Neuer Abschnitt in Screen3 oder Screen4: "Pflegeszenario"
- Pflegebedarf ab Alter X (Schieberegler 75–90)
- Erwartete monatliche Kosten (CHF 3'000–12'000/Mt.)
- Berechnung: "Ihr Vermögen deckt Pflege bis Alter Y"

**Aufwand:** 1–2 Tage | **Impact:** Hugely relevant, 40% Wahrscheinlichkeit ab 80

---

### #8 MITTEL: 13. AHV-Rente klar und konsistent kommunizieren

**Problem:** "inkl. 13. AHV-Rente" wird erwähnt, aber nicht erklärt. Einige Berechnungen scheinen sie einzubeziehen, andere nicht.

**Prüfung nötig:** Werden in `cashflow.ts` die AHV-Zahlen mit oder ohne 13. Rente verarbeitet? Die Funktion `calculateAhvHousehold()` gibt `combinedYearlyInkl13 = monthly × 13` zurück – dies sollte die Standardbasis sein.

**Lösung:** Eindeutiges Label und Erklärung: "Inklusive 13. AHV-Rente (gilt ab 2026)"

**Aufwand:** 2 Stunden | **Impact:** Transparenz und Vertrauen

---

### #9 NIEDRIG: Benutzerführung in Screen4 vereinfachen

**Problem:** Screen4 ist zu lang (10+ Blöcke) und überwältigt den durchschnittlichen User.

**Lösung:** 
- "Zusammenfassung" am Seitenanfang (3 KPIs: Lücke/Monat, Vermögensdauer, Handlungspriorität)
- Restliche Blöcke in Akkordeons "Für Interessierte: Details anzeigen"
- Klarer CTA am Ende: "Jetzt Termin mit Finanzberater vereinbaren" (oder "Ergebnisse als PDF speichern")

**Aufwand:** 2 Tage | **Impact:** Benutzerfreundlichkeit und Konversionsrate

---

### #10 NIEDRIG: Disclaimer verbessern und Grenzen des Tools kommunizieren

**Problem:** Disclaimer ist vorhanden, aber versteckt am Ende.

**Empfehlung:** Am Anfang von Screen4 prominenter Hinweis:
> "Diese Analyse basiert auf Ihren Angaben und vereinfachten Annahmen. Sie ersetzt keine individuelle Beratung durch einen Vorsorgeexperten. Lassen Sie die Ergebnisse von einem CFP oder Ihrer PK-Verwaltung prüfen."

---

## 7. VOLLSTÄNDIGE FEHLERLISTE (PRIORISIERT)

### Kritisch (Falsches Ergebnis für viele Benutzer)

| # | Problem | Datei | Impact |
|---|---|---|---|
| K1 | AHV aus calc.ts (alt) in cashflow.ts statt ahvCalculation.ts | cashflow.ts, calc.ts | Falsche AHV-Basis für alle Projektionen |
| K2 | Pauschalsteuer 8% statt calculateRetirementTax() | cashflow.ts | ±CHF 200–1'000/Jahr Steuerfehler |
| K3 | Kapitalsteuer ohne Sätzchen in cashflow.ts | cashflow.ts | CHF 2'000–6'000 Differenz bei Kapitalbezug |
| K4 | Freizügigkeitsguthaben (FZ) wird ignoriert | cashflow.ts, Screen4 | Bis CHF 200'000 Vermögen fehlt |

### Hoch (Materielle Auswirkung auf Planung)

| # | Problem | Datei | Impact |
|---|---|---|---|
| H1 | Koordinationsabzug inkonsistent (25'725 vs. 26'460) | pkConstants.ts, tax.ts | Kleine Differenz, aber Konsistenzfehler |
| H2 | Krankenkasse CHF 615/Mt. zu tief (2022 Werte) | Screen3 | CHF 100–400/Mt. Ausgabendifferenz |
| H3 | Kein Risikoprofil → Rendite pauschal | cashflow.ts | Falsche Projektion für konservative Anleger |
| H4 | KZG nicht aus Daten abgeleitet (Eltern) | Screen2, AHV | CHF 100–300/Mt. Rente zu wenig |
| H5 | Pflegeszenario fehlt systematisch | alle Screens | Hugely relevant für 80+ Planung |
| H6 | 3a-Bezug nicht gestaffelt mit PK-Bezug koordiniert | Screen4 | Steuerliche Optimierung unvollständig |

### Mittel

| # | Problem | Datei | Impact |
|---|---|---|---|
| M1 | Eigenmietwert-Besteuerung fehlt | tax.ts, Screen4 | CHF 1'000–5'000/Jahr Steuerlast fehlt |
| M2 | Kapitalertragssteuer auf Dividenden/Zinsen fehlt | wealthDepletionCalc | Rendite leicht überschätzt |
| M3 | Selbstständige nicht unterstützt | alle Screens | Segment nicht planbar |
| M4 | Internationale Sachverhalte ohne Warnung | Screen1 | Falsche AHV-Daten möglich |
| M5 | BVG_MAX_INSURED_SALARY 90'720 vs. 88'200 | pkConstants.ts | Kleine Differenz |
| M6 | UWS unter gesetzlichem Minimum (6.8%) keine Warnung | Screen2 | Falsche Eingabe möglich |
| M7 | Screen4 zu lang für Laien | Screen4 | User Experience |

### Niedrig

| # | Problem | Datei | Impact |
|---|---|---|---|
| N1 | Technische Begriffe nicht erklärt (UWS, Plafonierung) | Screen2, Screen4 | Verständnis |
| N2 | AHV-Delay-Faktor pauschal 5.2% statt Tabellenwerte | calc.ts | Kleiner Fehler für Bezug ab 67 |
| N3 | Validation fehlt (Rentenalter ≥ Aktuelles Alter) | Store/Screen1 | Edge-case |
| N4 | Standard-Ausgaben BFS 2022 | Screen3 | Leicht veraltet |
| N5 | "Was wäre wenn" fehlt für Erbschaft → Steuerfolgen | Screen4 | Unvollständig |

---

## 8. POSITIVE STÄRKEN DES TOOLS

1. **AHV Skala 44 2026 korrekt implementiert** in `ahvCalculation.ts` – inklusive Bezugsfaktoren, Plafonierung und Break-Even-Analyse ✓
2. **Sätzchen-Methode** für Kapitalbesteuerung in `tax.ts` korrekt implementiert ✓
3. **Alle 26 Kantone** in Steuerberechnungen berücksichtigt ✓
4. **13. AHV-Rente** korrekt einbezogen ✓
5. **Überbrückungsanalyse** (Frühpensionierung < 65) ist ein echter Mehrwert und in dieser Qualität selten ✓
6. **3-Jahres-Sperrfrist** für PK-Einkauf wird in Steueroptimierung erwähnt ✓
7. **Lebensereignisse** (Teilzeit, Scheidung, Immobilien) sind konzeptionell gut durchdacht ✓
8. **Kapital vs. Rente Vergleich** mit Break-Even ist methodisch korrekt ✓
9. **EL-Check** als Sicherheitsnetz ist pädagogisch wertvoll ✓
10. **AHV Non-Employed Contributions** bei Frühpensionierung – viele Tools vergessen das ✓

---

## FAZIT

WealthWise ist das ausgefeilteste freie Schweizer Vorsorgeplanungstool, das ich gesehen habe. Die Architektur ist solide, die Tiefe der Berechnungen beeindruckend. 

**Für den produktiven Einsatz mit echten Kunden braucht es zwingend:**
1. Korrektur der cashflow.ts (korrekte AHV + korrekte Steuer + FZ-Einbezug)
2. Vereinheitlichung der Konstanten (Koordinationsabzug)
3. Explizite Krankenkasse-Eingabe

**Mit diesen Korrekturen** wäre das Tool als Erstgespräch-Vorbereitung für Kunden empfehlenswert – mit dem klaren Hinweis, dass es kein Ersatz für eine individuelle CFP-Beratung ist.

---

*Prüfungsdatum: Mai 2026 | Geprüfte Codeversion: github.com/Luchs168/wealthwise (main)*  
*Rechtshinweis: Dieser Bericht ist eine interne Fachprüfung und stellt keine Rechts- oder Steuerberatung dar.*
