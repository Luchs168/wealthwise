# UX-Review: Stefan Hofer (48), Zug ZG
**Senior Software Engineer, FIRE-Ziel Alter 58, CHF 1.7 Mio Gesamtvermögen**

---

## 1. Zusammenfassung als Stefan (analytisch, kritisch)

Das Tool bestätigt meine Grössenordnungen – gut – aber es liefert nicht die Präzision die ich für eine FIRE-Entscheidung brauche. Die 4%-Regel wird erwähnt, die AHV-Beiträge als Nichterwerbstätiger sind vorhanden (das hat mich positiv überrascht), aber die Bezugsreihenfolge meiner drei 3a-Konten kann ich nicht separat optimieren, und mein Freizügigkeitsguthaben von CHF 45'000 lässt sich nirgends in Screen 2 eingeben. Der grösste Schwachpunkt: Das Tool modelliert nicht die Phase 58–63 separat von der Phase 63–65+ – genau die Phase wo Sequence-of-Returns-Risk am kritischsten ist und wo AHV-Beiträge als Nichterwerbstätiger eine spürbare Cashflow-Belastung darstellen. Als Kontrollcheck meines Excel-Sheets hat es seinen Zweck erfüllt; als Planungstool für meine FIRE-Situation reicht es nicht.

---

## 2. Spezifische Probleme für FIRE-Anwärter und Gutverdienende

### 2a – Pensionierungsalter 58: Tool akzeptiert es, aber die Analyse ist lückenhaft
Das Slider-Minimum in Screen 1 ist 58 – gut. Aber das Tool erkennt nicht, dass 58 einen **7-jährigen Überbrückungshorizont** (58–65) mit vollständig anderen Cashflow-Phasen bedeutet:
- Phase 1 (58–60): Nur ETF-Entnahme, noch keine 3a-Bezüge möglich
- Phase 2 (60–63): ETF + gestaffelte 3a-Bezüge
- Phase 3 (63–65): ETF + AHV-Vorbezug optional + Ende 3a
- Phase 4 (65+): AHV + PK-Rente + (ETF wenn noch was da)

Diese Phasendarstellung existiert nicht. Das Tool zeigt einen vereinfachten Cashflow ohne Phasenseparation.

### 2b – AHV-Beiträge Nichterwerbstätiger: Vorhanden, aber Berechnung für Stefan unklar
Das Tool berechnet AHV-Beiträge für Nichterwerbstätige (Funktion `calculateAHVContributionNonEmployed`). Die Formel: `(Vermögen + Renteneinnahmen × 20) / 50`, min. CHF 514, max. CHF 25'700/Jahr (2026).

Für Stefan mit CHF 1.5 Mio Vermögen bei Pensionierung 58 und PK-Rente von ~CHF 2'800/Monat (falls Rente):
`(1'500'000 + 33'600 × 20) / 50 = (1'500'000 + 672'000) / 50 = CHF 43'440 → gekappt bei CHF 25'700/Jahr`

Das Tool zeigt diese Berechnung in der Frühpensionierungs-Analyse, aber **nur wenn bridgingRetireAge < 65**. Für Stefan mit Pensionierungsalter 58 ist das aktiv. Aber: Das Tool addiert diese CHF 25'700/Jahr nicht klar zum **jährlichen Cashflow-Bedarf** in der 7-Jahres-Überbrückung. Stefan vermisst eine explizite Zeile: "AHV-Beiträge Nichterwerbstätiger 2034–2041 (7 Jahre): CHF 25'700 × 7 = CHF 179'900."

### 2c – Drei 3a-Konten: Nur Anzahl, keine Einzelbeträge
Stefan hat drei 3a-Konten mit unterschiedlichen Salden (CHF 98'000 + CHF 87'000 + CHF 62'000). Das Tool hat ein Feld "Anzahl 3a-Konten" (1–5) und ein Feld für den **Gesamtsaldo**. Die Aufteilung auf einzelne Konten ist nicht möglich.

Das ist relevant weil: Der optimale Bezugsplan hängt von den Einzelgrössen ab. Konto 1 (CHF 98'000) sollte in einem Jahr ohne PK-Bezug bezogen werden; Konto 2 (CHF 87'000) im nächsten. Das Tool kann das nicht planen.

**Was das Tool zeigt:** "Optimal gestaffelter Bezug über N Jahre" mit Total-Steuerersparnis. Das ist korrekt und nützlich, aber nicht auf die spezifischen Kontogrössen angepasst.

### 2d – Freizügigkeitsguthaben (FZ CHF 45'000): Kein Eingabefeld in Screen 2
`hasFZ` und `fzBalance` sind im Store vorhanden und werden im Cashflow und in Screen 4 berücksichtigt – aber **es gibt kein Eingabefeld in Screen 2**. Stefan kann sein FZ-Guthaben von CHF 45'000 nirgends eingeben. Es landet deshalb vermutlich im "freien Vermögen" – falsche Behandlung, da FZ separat besteuert wird (Kapitalbezugssteuer, wie 3a, nicht wie Kapitalgewinn).

### 2e – Krypto (CHF 35'000): Kein separates Feld
Das Tool hat ein Feld "Freies Vermögen" (Sparkonto + Wertschriften). Stefan gibt CHF 85'000 + CHF 520'000 + CHF 35'000 = CHF 640'000 ein. Krypto wird gleich wie ETFs behandelt – kein Hinweis auf unterschiedliche Volatilität, steuerliche Behandlung oder Liquidität.

### 2f – Bonus nicht erfassbar
Stefan verdient CHF 185'000 Fixlohn + ca. CHF 25'000 Bonus = CHF 210'000. Das Tool hat nur ein Einkommensfeld. Er gibt CHF 185'000 oder CHF 210'000 ein (welches ist "korrekt"?). Kein Feld für variablen Lohn oder Durchschnitt der letzten 3 Jahre.

---

## 3. Was das Tool Stefan trotzdem beibringt

### AHV-Beiträge als Nichterwerbstätiger – Bestätigung und genaue Zahlen
Stefan schätzte in seinem Excel "~CHF 20'000/Jahr". Das Tool berechnet CHF 25'700/Jahr (Maximalwert). Das ist eine Korrektur nach oben – 28% höher als seine Schätzung. Für 7 Jahre bedeutet das CHF 179'900 statt CHF 140'000. **Das ist neu und relevant.** Stefan wird das in sein Excel übernehmen.

### Kapitalbezugssteuer Zug – Präzise Berechnung für PK + 3a
Das Tool berechnet die Kapitalbezugssteuer korrekt nach Kanton und Zivilstand (ledig/ZG). Für Stefan:
- PK-Kapital CHF 680'000 bei Alter 58 (falls Vollkapital): Das Tool zeigt die Steuer unter Verwendung der Sätzchen-Methode. In Zug ist die Kapitalbezugssteuer sehr tief (~5.5% effektiv). Das Tool bestätigt: Kapitalbezug ist bei UWS 5.0% attraktiv.
- 3a gestaffelt: Break-Even-Vorteil durch Staffelung wird explizit gezeigt.

### PK Break-Even Rente vs. Kapital – Das Tool zeigt Kapital als besser
Bei UWS 5.0% und Alter 58 liegt der Break-Even (wann Rente mehr einbringt als Kapital) bei Alter ~82-84. Das Tool zeigt diesen Vergleich in Screen 4. Stefan findet seine eigene Einschätzung ("Kapital ist besser") bestätigt – aber jetzt mit konkreten Zahlen für Kanton Zug.

### 3a-Staffelungsoptimierung – Gut erklärt
Das Tool zeigt einen expliziten Bezugsplan mit Steuerersparnis durch Staffelung. Für Stefan ist das Lerneffekt: Er wusste die Theorie, aber das Tool zeigt konkrete CHF-Beträge für seinen Fall (Kanton Zug, ledig).

### Überbrückungsanalyse – Solide
5 Optionen für die Überbrückung (Vorbezug AHV, PK-Überbrückungsrente, Vermögensverzehr, 3a-Staffelung, Teilzeitarbeit) sind vorhanden und werden verglichen. Stefan findet das nützlich als Struktur, auch wenn die Zahlen seiner Situation nicht 100% entsprechen.

---

## 4. Wo ist das Tool zu simpel für Stefans Bedürfnisse?

### Keine Phasendarstellung der Entnahmephase
Stefan hat 7 Phasen:
1. 58–60: Entnahme nur aus ETF (noch kein 3a-Bezug möglich)
2. 60: Bezug 3a-Konto 1 (CHF 98'000)
3. 61: Bezug 3a-Konto 2 (CHF 87'000)
4. 62: Bezug 3a-Konto 3 (CHF 62'000) + ggf. FZ
5. 63–65: Option AHV-Vorbezug
6. 65: AHV (ordentlich) + PK-Kapital oder PK-Rente
7. 65+: Laufende Renten + verbleibendes ETF

Das Tool fasst alles in einem Cashflow-Chart zusammen. Stefan vermisst die Phasendarstellung.

### Sequence-of-Returns-Risk: Erwähnt aber nicht modelliert
Das Tool erwähnt das Risiko eines Markteinbruchs in den ersten Jahren nicht explizit. Stefan weiss was SoRR ist, aber er möchte sehen: "Wenn die Börse 2034 (Jahr 1 der FIRE) um 30% fällt – wann läuft das Kapital aus?" Diese Stress-Simulation fehlt.

Das Tool bietet drei Szenarien (optimistisch 3.5%/neutral 2%/pessimistisch 0%). Das ist grob. Stefan will: "Pessimistisches Jahr 1 = -30%, dann erholt sich der Markt normal. Wie sieht das aus?"

### Keine verschiedenen Entnahmestrategien vergleichbar
Das Tool zeigt:
- 4%-Regel
- Nachhaltige 3.5%-Rate
- Bis Alter 90 / Bis Alter 95 / Nur Rendite

Was fehlt:
- **Guardrails-Strategie** (Guyton-Klinger): Entnahme wird reduziert wenn Kapital unter Schwellenwert
- **Dynamic Withdrawal** (Kitces): Entnahme passt sich Marktperformance an
- **Bucket-Strategie**: Liquiditäts-Bucket (2 Jahre), konservativer Bucket (5 Jahre), Wachstums-Bucket (Rest)

Stefan hat diese Strategien aus Blogs und Podcasts gekannt und vermisst sie im Tool.

### Kein "Was-wäre-wenn mit Alter 55 vs. 58 vs. 60?"
Das Tool hat einen "Was wäre wenn Slider" für das Pensionierungsalter. Aber der Vergleich zeigt nur eine veränderte Kapitalentwicklung – nicht den vollständigen Effekt auf Steueroptimierung, AHV-Beiträge Nichterwerbstätiger, 3a-Bezugszeitpunkt etc. Stefan vermisst ein echtes Szenario-Comparison-Tool.

### Hypothek-Tragbarkeit: Kein aktiver Hinweis
Stefan hat eine Hypothek von CHF 450'000 bei einem Wert von CHF 980'000. Nach Pensionierung prüft die Bank die Tragbarkeit auf Basis Renteneinkommens. Das Tool zeigt die Immobilie im Cashflow, aber gibt keine explizite Warnung: "Mit Pensionierungsalter 58 und keinem Erwerbseinkommen mehr muss Ihre Bank die Hypothek neu beurteilen."

---

## 5. Feature-Wünsche für einen "Pro-Modus"

| # | Feature | Warum Stefan es braucht |
|---|---|---|
| 1 | **Phasenbasierter Cashflow-Plan** | 7 verschiedene Phasen mit unterschiedlichen Einkommensquellen |
| 2 | **Sequence-of-Returns Stress-Test** | Markteinbruch in Jahr 1–3 der FIRE simulieren |
| 3 | **3a-Konten einzeln erfassen** | Optimale Staffelung nach Kontogrösse |
| 4 | **FZ-Eingabefeld in Screen 2** | FZ ist vorhanden im Store aber nicht editierbar |
| 5 | **Entnahmestrategien-Vergleich** | 4%-Regel vs. Guardrails vs. Dynamic vs. Bucket |
| 6 | **Monte-Carlo-Simulation (100+ Pfade)** | Statt 3 fester Szenarien |
| 7 | **AHV-Beiträge Nichterwerbstätige im Cashflow** | Als explizite Ausgabe, nicht nur im Overbrückungs-Block |
| 8 | **Bonus/variable Vergütung** | Separates Einkommensfeld für variables Einkommen |
| 9 | **Krypto als separate Asset-Klasse** | Unterschiedliche Volatilität und Steuerbehandlung |
| 10 | **"Frühpensionierung um X Jahre verschieben"-Vergleich** | Vollständige Vergleichsdarstellung 55 vs. 58 vs. 60 |

---

## 6. Korrektheit der Berechnungen bei hohen Vermögen

### AHV-Beiträge Nichterwerbstätiger – Berechnung korrekt, aber Grenzwert-Kommunikation fehlt
Formel im Code: `(Vermögen + AnnualIncome × 20) / 50`, gek. bei CHF 25'700 (2026).  
Für Stefan mit CHF 1.5 Mio Vermögen und PK-Rente CHF 33'600/Jahr: `(1'500'000 + 672'000) / 50 = CHF 43'440 → CHF 25'700`.  
**Korrekt.** Stefan ist im Maximum. Das Tool zeigt das korrekt.

**Was fehlt:** Das Tool zeigt nicht dass Stefan bereits beim Maximalwert ist und eine Vermögenserhöhung nichts ändert. Und: Bei PK-Kapitalbezug (kein laufendes PK-Einkommen) sinkt die Beitragsgrundlage: `(1'500'000 + 0) / 50 = CHF 30'000 → CHF 25'700`. Immer noch Maximum – aber dieser Unterschied wird nicht kommuniziert.

### Kapitalbezugssteuer Zug – Korrekt nach Sätzchen-Methode
Das Tool verwendet `calculateCapitalWithdrawalTax(amount, canton, taxStatus)`. Für Kanton ZG, ledig, CHF 680'000: Die Steuerberechnung basiert auf kantonalen Tarifen und der Sätzchen-Methode (1/5 des Normalsteuersatzes). In Zug ist das ~5.3–5.8% effektiv auf das Kapital. Das ist die korrekte Grössenordnung. **Stefan wird das nochmal nachrechnen, aber es klingt plausibel.**

### 3a-Staffelungsberechnung – Korrekt
Das Tool berechnet `calculateOptimalWithdrawal()` mit `num3aAccounts` und dem Gesamtbetrag. Für 3 Konten und CHF 247'000 wird die Steuerersparnis durch Staffelung korrekt ausgewiesen. **Die Zahlen stimmen.**

### 4%-Regel Kommunikation – Leichte Unschärfe
Das Tool schreibt: "Schweizer Empfehlung: konservativere 3–3.5%". Korrekt, aber es erklärt nicht warum (tiefere Schweizer Aktienmarktrendite historisch, höhere CHF-Bewertung, Kapitalertragssteuerfreiheit in CH kompensiert teilweise). Stefan würde das kritisch hinterfragen.

---

## 7. Emotionale Reaktion

**Beim Öffnen:** "10 Minuten? Dann ist es zu simpel für mich." Er öffnet es trotzdem – weil er neugierig ist und weil er es seinen Kollegen auf /r/SwissFIRE zeigen will.

**Screen 1:** Pensionierungsalter 58 funktioniert, keine Fehlermeldung. Er ist nicht ausgeschlossen. Aber: "Für Personen 50–65" auf der Landing Page – er ist 48. Kleiner Stich.

**Screen 2:** Gibt CHF 680'000 PK, CHF 247'000 3a (als Total), CHF 640'000 freies Vermögen ein. Sucht FZ-Feld – findet es nicht. "Typisch. Freizügigkeit ist der blinde Fleck von allen Tools."

**Screen 4 – erster Blick:** Score 82/100. "Besser als ich erwartet hatte." Vermögensverlauf zeigt Kapital bis ~Alter 94 im neutralen Szenario. "Passt zu meinem Excel."

**Bei AHV-Beiträge-Block:** Stefan liest CHF 25'700/Jahr × 7 Jahre. "Das ist mehr als ich dachte. Mein Excel hatte CHF 20'000. Ich muss das korrigieren."

**Bei Kapitalbezugssteuer Zug:** "Die Zahl klingt korrekt. Ich nehme das als Plausibilisierung."

**Bei Fehlen von Sequence-of-Returns:** "Kein SoRR-Test. Natürlich nicht. Das ist die wichtigste Frage bei FIRE und kein Tool zeigt sie."

**Am Ende:** Gemischte Gefühle. Sein Plan ist grob bestätigt. Aber die Überbrückungsphase 58–65 ist zu vereinfacht. Er schliesst das Tool und öffnet sein Excel.

---

## 8. Was würde Stefan in einem Reddit-Post auf r/SwissFIRE schreiben?

> **WealthWise Tool – Review für FIRE-Planer**
>
> Hab das Tool https://wealthwise.app durchgespielt (Alter 48, Ziel 58, Vermögen ~1.7M CHF). Kurzes Fazit:
>
> **Gut:**
> - AHV-Beiträge als Nichterwerbstätiger werden korrekt berechnet (Maximal CHF 25'700/Jahr für mich – mein Excel hatte zu wenig)
> - Kapitalbezugssteuer Kanton Zug mit Sätzchen-Methode: plausibel
> - 3a-Staffelung wird erklärt und Steuerersparnis ausgerechnet
> - Break-Even Rente vs. Kapital (PK) wird gezeigt
>
> **Schwach:**
> - Keine Phasendarstellung 58–60 / 60–63 / 63–65 / 65+
> - Freizügigkeitsguthaben kann man nirgends eingeben (?)
> - 3a-Konten nur als Gesamtbetrag, nicht einzeln
> - Kein Sequence-of-Returns-Stress-Test
> - Drei Szenarien (optimistisch/neutral/pessimistisch) statt Monte-Carlo
> - Die Empfehlungen ("PK-Einkauf tätigen") sind für mich irrelevant – ich will mit 58 raus, nicht einzahlen
>
> **Für wen geeignet:** Einsteiger und Personen mit Standardbiografien. Als Zweit-Kontrolle eines eigenen Excel-Sheets nützlich – man findet vielleicht einen Posten den man vergessen hat (bei mir: AHV-Beiträge Nichterwerbstätiger).
>
> **Nicht geeignet für:** Detaillierte FIRE-Sequenz-Optimierung, Entnahmestrategien-Vergleich, SoRR-Analyse.
>
> Für r/SwissFIRE-Niveau: 6/10. Als allgemeines Tool für Menschen die sich noch nicht damit beschäftigt haben: 9/10.

---

## 9. Top-5 fehlende Features für Power-User

### #1 – Phasenbasierter Entnahme-Cashflow
Statt einem Cashflow-Datenstrom: Explizite Tabelle mit Phasen (Phase 1: 58–60, Phase 2: 60–62, Phase 3: 63+). Pro Phase: Einkommensquellen, Ausgaben inkl. AHV-Beiträge Nichterwerbstätiger, Netto-Cashflow, Kapitalveränderung.

### #2 – Sequence-of-Returns Stress-Szenario
Ein-Jahres-Einbruch: "Was wenn die Börse in Jahr 1 der FIRE −25% / −40% macht?" Zeige den Kapitalverlauf unter SoRR. Vergleiche: "Mit Guardrails-Strategie überlebt das Portfolio vs. fester 4%-Entnahme."

### #3 – FZ-Eingabefeld in Screen 2
`hasFZ` und `fzBalance` sind bereits im Store. Nur der Eingabepfad fehlt. Ein Checkbox "Ich habe Freizügigkeitsguthaben" + Betrag-Feld in der PK-Sektion würde reichen.

### #4 – 3a-Konten mit Einzelbeträgen
Statt nur Gesamtsaldo + Anzahl: 3–5 separate Felder für Kontogrössen. Der Optimierungsalgorithmus kann dann die tatsächliche Bezugsreihenfolge und Steuerbelastung pro Konto berechnen.

### #5 – Monte-Carlo statt drei Szenarien
100+ simulierte Rendite-Pfade (normalverteilte Jahresrenditen, historische Volatilität). Darstellung: Fächer der Vermögensverläufe. "In 90% der Szenarien hält das Kapital bis Alter X." Das ist der Standard in professionellen FIRE-Tools (cFireSim, Portfolio Visualizer).

---

## 10. Empfehlung: Ist WealthWise für informierte, vermögende FIRE-Anwärter geeignet?

**Kurzantwort: Als Orientierungshilfe ja. Als Planungstool nein.**

**Was funktioniert:**
- Schweiz-spezifische Berechnungen (AHV-Beiträge NE, Kapitalbezugssteuer kantonal) sind korrekt implementiert und für Stefan eine nützliche Verifikation
- Grobe Vermögensentwicklung bis Alter 95 mit drei Szenarien ist plausibel
- Kapitalbezugssteuer Zug ist präzise genug für einen Sanity-Check

**Was nicht funktioniert:**
- Die Entnahmephase ist zu undifferenziert für eine 7-Jahres-Überbrückung mit 5 verschiedenen Cashflow-Phasen
- SoRR fehlt komplett – das ist für FIRE die kritischste Risikodimension
- Verschiedene Entnahmestrategien (Guardrails, Bucket, Dynamic) fehlen
- FZ-Eingabe fehlt

**Würde Stefan danach einen Steuerberater aufsuchen?** Ja. Das Tool hat die Grössenordnungen bestätigt, aber für die konkrete Entscheidung – Kapital oder Rente, welche 3a-Konten in welchem Jahr, Hypothekargespräch mit der Bank – braucht Stefan einen Steuerberater (oder Treuhänder) und einen Finanzplaner der die Phasenstrategie konkretisiert.

**Vertraut er den Berechnungen?** Den Schweizer-spezifischen Werten (AHV, Kapitalbezugssteuer) ja nach Plausibilitätsprüfung. Der Gesamtvermögensentwicklung: Nur als grobe Orientierung. Er rechnet alles nochmal nach.

**Rating für FIRE-Power-User mit Schweizer Spezialwissen:**  
- Benutzerfreundlichkeit: 8/10  
- Tiefe der Analyse: 5/10  
- Korrektheit Schweiz-spezifisch: 8/10  
- FIRE-Spezifika: 3/10  
- Gesamtnutzen für Stefan: 6/10
