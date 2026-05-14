# WealthWise – Behavioral Finance Review
## Entscheidungsarchitektur, Nudging und kognitive Verzerrungen

**Erstellt:** Mai 2026  
**Perspektive:** Behavioral Finance / Entscheidungsarchitektur  
**Methodik:** Code-Audit + UX-Text-Analyse + Anwendung etablierter Bias-Frameworks  
**Referenzrahmen:** Kahneman & Tversky (Prospect Theory), Thaler & Sunstein (Nudge), Iyengar & Lepper (Choice Overload), Ariely (Predictably Irrational)

---

## 0. Executive Summary

**Ist WealthWise neutral oder lenkend?**

WealthWise ist **nicht neutral — und das ist zu 70% vertretbar, zu 30% problematisch.**

Das Tool enthält eine dichte Schicht von Nudges, Defaults und Framing-Entscheidungen, die teils bewusst gesetzt wurden (libertärer Paternalismus im besten Sinne), teils unbewusst entstanden sind (Verlustaversion durch Sprache, Anchoring durch Beispielwerte). Die Entscheidungsarchitektur bevorzugt systematisch: (1) Sparen über Ausgeben, (2) Rente über Kapitalbezug, (3) Aufschub über Frühpension, (4) Handeln über Nichtstun.

Diese Lenkung ist für bestimmte User-Typen (finanziell vulnerable Personen, wenig Vorsorgewissen) **hilfreich und ethisch vertretbar.** Für andere User-Typen (finanzliterate, selbständig planende Personen) kann sie bevormundend wirken und sachlich falsche Entscheidungen begünstigen.

| Dimension | Bewertung | Note |
|---|---|---|
| Neutralität der Defaults | 🔴 Nicht neutral | 80% Ausgaben, 'rente', 'balanced' alle lenkend |
| Framing | 🟡 Verlust-dominiert | "Lücke" prominenter als "Überschuss" |
| Verlustaversion | 🟡 Ausgelöst, teilweise kontrolliert | Rote Farben, "Dringend" |
| Overconfidence | 🟡 Teilweise erzeugt | Score 0–100 suggeriert Genauigkeit |
| Choice Overload | 🔴 Kritisch auf Screen 4 | Zu viele simultane Entscheidungsfelder |
| Debiasing-Elemente | 🟢 Gut | Szenarien, Disclaimer, Slider |
| Ethische Vertretbarkeit | 🟡 Akzeptabel mit Verbesserungen | Libertärer Paternalismus; Grenzen nötig |
| **Autonomie-Respekt** | **6.5/10** | Ausbaubar |

---

## 1. Identifizierte Nudges

### 1.1 Implizite Nudges (unbeabsichtigt oder unreflektiert)

| Nudge | Mechanismus | Stärke | Beabsichtigt? |
|---|---|---|---|
| Default retireAge = 65 | Anker; macht Abweichung zur "Ausnahme" | Stark | Unklar |
| Default riskProfile = 'balanced' | Middle-Bias; weder Mut noch Vorsicht | Mittel | Unklar |
| Default pkBezugsart = 'rente' | Nudge gegen Kapitalbezug | Stark | Unklar |
| Beispiel-Einkommen 100k/80k | Aspirational anchor; fühlt sich normal an | Mittel | Nein |
| Beispiel-PK 400k/250k | Anchor für "was man haben sollte" | Mittel | Nein |
| Loading-Text "Handlungsempfehlungen werden ermittelt..." | Commitment-Priming | Schwach | Nein |
| "Noch ca. 8 Minuten" Countdown | Sunk-Cost-Druck ("jetzt abbrechen wäre Verschwendung") | Schwach | Nein |
| "Bereits 4'800 Personen" | Social Proof / FOMO | Mittel | Ja |
| Alle anderen Goals "Bald verfügbar" | Scarcity / Regret-Aversion | Mittel | Unklar |

### 1.2 Explizite Nudges (bewusst gesetzt, gut begründbar)

| Nudge | Mechanismus | Vertretbarkeit |
|---|---|---|
| 80% Ausgaben mit ⭐ "Empfohlen" | Default-Setzen basierend auf Forschung | Vertretbar (mit Erklärung) |
| Szenarien zeigen (3 Wege) | Reduces overconfidence | Sehr gut |
| Farbcodes für Score | Salience | Gut, wenn konsistent |
| "Dringend" bei rotem Score | Urgency-Nudge zur Handlung | Problematisch (s. Abschnitt 11) |
| Auflistung von Handlungsoptionen | Action-Facilitating | Gut |

---

## 2. Framing-Analyse

### 2.1 Verlust-Frame vs. Gewinn-Frame: Gesamtbilanz

Das WealthWise-Interface ist **verlust-dominant geframt.** Dies entspricht der Grundstruktur der meisten Finanzplanungstools (Sicherheitsgefühl durch "Gefahr benennen"), hat aber messbare psychologische Kosten.

**Verlust-Frames im Tool:**

| Element | Verlust-Frame | Alternativer Gewinn-Frame |
|---|---|---|
| "Vorsorgelücke CHF 850/Monat" | Expliziter Verlust | "Sie decken 78% Ihres Bedarfs" |
| Rotes KPI-Badge | Alarm-Signal | — |
| "Handlungsbedarf: HOCH" | Notfall-Framing | "Optimierungspotenzial vorhanden" |
| "Dringend: Klären Sie mögliche PK-Einkäufe" | Urgency + Verlust | "PK-Einkauf kann Ihre Rente um X verbessern" |
| "klaffende Vorsorgelücke" (Empfehlungstext) | Dramatische Sprache | — |
| Szenario-Linie "Pessimistisch" in Rot | Angst-Induktion | "Konservatives Szenario" |
| "Ab Alter 87 fehlt Ihnen Geld" (Depletion-Chart) | Angst-Frame | "Ihr Kapital reicht bei neutralem Szenario bis Alter 95" |

**Gewinn-Frames im Tool (vorhanden aber unterrepräsentiert):**

| Element | Gewinn-Frame |
|---|---|
| "Gut aufgestellt" bei grünem Score | Positiv ✓ |
| "Vorsorgeüberschuss +CHF X/Monat" | Positiv ✓ |
| "Optimistisch" Linie in Grün | Positiv ✓ |
| Steuerersparnis als Gewinn dargestellt | Positiv ✓ |

**Befund:** Der Verlust-Frame überwiegt. Dies entspricht dem psychologischen Effekt, dass Verluste 2× stärker gewichtet werden (Kahneman/Tversky 1979). Das Tool aktiviert also systematisch ein Warnsignal-Modus, der User zu Handlung drängt — auch wenn keine unmittelbare Notwendigkeit besteht.

### 2.2 Sprachliche Intensität

| Stärke | Beispiele aus dem Code | Wirkung |
|---|---|---|
| Neutral | "Vorsorgeüberschuss", "Szenario" | Keine Verzerrung |
| Leicht lenkend | "Handlungsbedarf", "empfohlen" | Kleine Lenkung |
| Stark lenkend | "Dringend", "klaffende Vorsorgelücke", "drohende Vorsorgelücke" | Angst-Induktion |

### 2.3 AHV-Bezugsalter Framing

Der AHV-Aufschub-Text in Screen 2 zeigt Faktoren:
- Vorbezug 2 Jahre: "Faktor 0.864 (−13.6%)" → Verlust-Frame (negative Zahl)
- Aufschub 5 Jahre: "Faktor 1.313 (+31.3%)" → Gewinn-Frame (positive Zahl)

**Problem:** Beide werden als Abweichung von der Norm "65" geframt. Für eine 60-jährige Frau in guter Gesundheit mit kleinem PK-Kapital kann ein Vorbezug mit 63 optimal sein — wird aber als "−13.6% Verlust" kommuniziert, was irrational negativ wirkt.

---

## 3. Defaults-Audit

### 3.1 Vollständige Default-Liste mit Bewertung

| Default | Wert | Richtung | Evidenz | Transparent begründet? |
|---|---|---|---|---|
| `retireAge` | 65 | → Ordentliche Pension | Gesetzliches Referenzalter | Nein (implizit) |
| `riskProfile` | 'balanced' | → Mittleres Risiko | Häufige Empfehlung | Nein |
| `pkBezugsart` | 'rente' | → Gegen Kapital | BVG-Default, AHV-gesichert | Nein |
| `pkRate` (UWS) | 5.4% | → "Typisch" | Entspricht ca. BVG-Mittel | Nein (faktisch zu hoch für viele) |
| `pkInterestRate` | 2.0% | → Optimistisch | BVG-Mindestzins 1.25% | Nein |
| `income` P1 | 100'000 | → Gut verdienend | Über Median (ca. 85k) | Nein |
| `income` P2 | 80'000 | → Gut verdienend | Über Median | Nein |
| `pkCapital` P1 | 400'000 | → Gut gespart | Gut aber realistisch | Nein |
| `ahvBezugAge` | 65 | → Kein Auf/Vorbezug | Referenzalter | Nein |
| `ahvContributionYears` | 44 | → Vollrente | Ideal (wenige haben 44 Jahre) | Nein |
| `expenses.goal` | '80%' | → 80%-Regel | Verbreitete Faustregel | Teilweise (⭐ Empfohlen) |
| `hypothekZinssatz` | 1.5% | → Historisch tief | Aktuell tief, Langfrist 2.5% | Nein |
| `kkFranchise` | 300 | → Niedrigste Franchise | Schlechteste Wahl für Gesunde | Nein |

### 3.2 Kritische Defaults

**Default 1: `pkBezugsart = 'rente'`** — Stärkster Nudge

Die Rente als Default ist aus versicherungsmathematischer Sicht für viele Personen falsch:
- Ledige ohne Erb-Wunsch: Kapital kann besser sein
- Personen mit anderweitigem Einkommen (Immobilien, Fremdwährungspension): Rente unnötig
- Personen mit schlechter Gesundheit: Break-even bei 80+ erreichen sie nie

Der Default lenkt systematisch in Richtung Rente, ohne dass der User aktiv wählt. Er muss aktiv widersprechen ("Opt-Out"), um den Kapitalbezug zu wählen.

**Default 2: `riskProfile = 'balanced'`** — Middle-Bias

Der "balanced"-Default nutzt den bekannten Compromise Effect (Simonson/Tversky): Menschen wählen die mittlere Option nicht aus rationaler Überlegung, sondern weil sie sich sicherer anfühlt. Für einen 62-jährigen mit 3 Jahren bis Pension ist 'balanced' möglicherweise zu riskant; für einen 50-jährigen zu konservativ. Der Default passt zu keinem spezifischen User.

**Default 3: `pkRate = 5.4%`** — Faktisch irreführend

Der UWS von 5.4% entspricht dem überobligatorischen Mittel, ist aber:
- Für obligatorisches BVG-Kapital zu hoch (gesetzlich 6.8% nur für obligatorischen Teil, aber Mischsatz oft < 5%)
- Für grosse PKs mit tiefem Mischsatz zu hoch (viele liegen bei 4.5–5.0%)
- Erzeugt systematisch zu optimistische PK-Renten-Prognosen

**Default 4: Beispiel-Einkommen 100k/80k** — Aspirational Anchoring

Das Medianeinkommen in der Schweiz (2023) beträgt ca. 85k für Vollzeitstellen. Die Defaults 100k/80k liegen bewusst oder unbewusst über dem Median und erzeugen einen **Wohlstandsanker**: Der User fühlt sich schlechter als der Default, selbst wenn er gut verdient. Dies könnte unnötige Angst auslösen.

### 3.3 Positiv bewertete Defaults

**Positiv: `ahvContributionYears = 44`** — Klar dokumentiert als Vollbeitragsjahr-Ideal, nicht als "was du haben solltest". User wird aufgefordert, Abweichungen einzugeben. ✓

**Positiv: `property.hypothekZinssatz = 1.5%`** — Der FINMA-Richtwert für Tragbarkeitsberechnungen beträgt 5% (theoretischer Zins), aber für Cash-Flow-Projektionen ist der tatsächliche Marktzins realistischer. 1.5% ist aktuell korrekt, aber ohne Langfrist-Normalisierungshinweis. (Hinweis: In calc.ts existiert `HYPOTHEK_LANGFRISTZINS: 0.025` — dieser sollte kommuniziert werden.)

---

## 4. Kognitive Verzerrungen: Ausgelöste Biases

### 4.1 Ankereffekt (Anchoring Effect)

**Schweregrad: ●●●●○ (Hoch)**

Empirische Befunde (Tversky/Kahneman 1974): Initiale numerische Werte beeinflussen Urteile dramatisch, selbst wenn sie irrelevant sind.

WealthWise-spezifische Anker:
1. **Retireage = 65** als Default → User denkt zweimal nach bevor er 63 eingibt, obwohl 63 für ihn ideal wäre
2. **UWS = 5.4%** → User mit 4.8% UWS fühlt sich "unter Normal"
3. **80% als Empfohlen** → User ohne weitere Information akzeptiert 80%, obwohl sein individueller Bedarf 65% oder 95% sein könnte
4. **"Bereits 4'800 Personen"** → Soziale Norm-Anker: "So viele können nicht alle falsch liegen"
5. **Szenarien: "Neutral" in Blau** → Der "realistischste" Anker bestimmt die emotionale Grundlage aller Überlegungen

### 4.2 Verlustaversion (Loss Aversion)

**Schweregrad: ●●●●○ (Hoch)**

Kahneman/Tversky (1979): Verluste werden ca. 2× stärker empfunden als gleich grosse Gewinne.

Aktivierungspunkte:
- **"Vorsorgelücke CHF 850"** → Emotionaler Verlustsignal; dasselbe als "78% Deckungsgrad" wäre weniger alarmierend
- **Rote KPI-Karte** → Physiologische Alarmreaktion
- **"Dringend"** → Verbindet Zeitdruck mit Verlustgefühl
- **Depletion-Chart** → Zeigt wann das Geld "aufhört" — extremes Verlust-Signal
- **Pessimistisches Szenario in Rot** → Das schlechteste Szenario ist visuell das auffälligste

**Konsequenz:** User in "gelb" oder "rot" Situationen können in Panik verfallen und suboptimale Entscheidungen treffen (überstürzter PK-Einkauf ohne Beratung, Aufgabe des Frühpensionierungswunsches).

### 4.3 Status Quo Bias

**Schweregrad: ●●●○○ (Mittel)**

Menschen bevorzugen den aktuellen Zustand; Veränderung wird als Verlust wahrgenommen.

- **Keine Option "Nichts tun" in Empfehlungen:** Jede Empfehlung setzt Handlung voraus. "Ihre Situation ist gut — keine Massnahmen notwendig" erscheint nur bei grünem Score, nie als explizite Handlungsoption bei gelb/rot.
- **Empfehlungen bei gelb/rot sind ausschliesslich aktionsorientiert:** "Prüfen", "Einzahlen", "Klären", "Aufnehmen" — aber keine Gewichtung von "Abwarten und beobachten" als legitime Option.

### 4.4 Overconfidence

**Schweregrad: ●●●○○ (Mittel)**

Der **Score 0–100** induziert Pseudo-Präzision. Ein Score von 68 wirkt wie eine genaue Messung, ist aber das Ergebnis einer simplen Formel mit wenigen Variablen:

```
score = 50 + f(Deckungsgrad) + g(ageWhenBroke)
```

Maximal 2 Faktoren bestimmen den Score, der eine komplexe Lebensrealität auf eine einzige Zahl reduziert. Dies erzeugt:
- **Bestätigungsbias:** "Score 72 = ich bin gut aufgestellt" → User sucht keine weiteren Informationen
- **Kontrollillusion:** "Wenn ich CHF 10'000 einzahle, steigt mein Score auf 76" → Falsche Kontrollierbarkeit
- **False Precision:** Keine Konfidenzintervalle, keine Bandbreiten beim Score

**Score-Formel ist auch instabil:** Ein Szenario das "nie pleite geht" gibt +20 Punkte. Dies dominiert gegenüber dem Deckungsgrad-Faktor. Ein User der CHF 3 Millionen hat und CHF 500/Monat ausgibt, bekommt Score 100 — selbst wenn seine AHV-Rente nur CHF 800/Monat bedeckt. Das ist richtig (er wird nie pleite) aber es kommuniziert nicht was der Score eigentlich misst.

### 4.5 Framing-Effekt

**Schweregrad: ●●●●○ (Hoch) — bereits unter Abschnitt 2 detailliert**

Zusammenfassung: Das Tool ist verlust-dominant geframt. Die Sprache bei "rot" ist dramatischer als bei "grün". Dies ist nicht neutral.

### 4.6 Choice Overload

**Schweregrad: ●●●●● (Kritisch auf Screen 4)**

Iyengar/Lepper (2000): Zu viele Optionen reduzieren Entscheidungsqualität und -freude; führen oft zu Nicht-Entscheidung.

Screen 4 enthält simultan:
1. Score + Verdict (1 Entscheidungsfeld)
2. KPI-Karten (3–4 Karten)
3. Handlungsempfehlungen (3–4 spezifische Empfehlungen)
4. Vermögensprojektion mit 3 Szenarien (interaktiv)
5. AHV-Details + Plafonierung
6. PK-Rentendetails + Kaufkraftverlust-Box
7. Rente vs. Kapital Vergleichsrechner (interaktiv mit 3 Tabs)
8. Säule 3a Projektion
9. Steueroptimierung
10. Frühpensionierung-Rechner (Was-wäre-wenn Slider)
11. Staffelungs-Optionen (bei Ehepaaren)
12. Ergänzungsleistungen
13. Life Events Planer
14. PDF-Export

Das sind **14 parallele Informations- und Interaktionsbereiche** auf einer Seite. Selbst ein hochmotivierter, finanziell gebildeter User wird nicht alle sinnvoll verarbeiten.

**Empirische Konsequenz:** User lesen die ersten 2–3 Empfehlungen und handeln darauf, ohne die restlichen 10 Sektionen zu verarbeiten. Oder sie sind so überwältigt dass sie gar nichts tun (Analyse-Paralyse).

### 4.7 Present Bias (Hyperbolische Diskontierung)

**Schweregrad: ●●●○○ (Mittel)**

Menschen diskontieren die Zukunft übermässig; was heute CHF 100 wert ist, ist in 20 Jahren psychologisch weniger wert als rational.

Das Tool kämpft gegen Present Bias, ohne spezifische Gegenmassnahmen:
- **"CHF 850/Monat Lücke in 10 Jahren"** = abstrakt und fern
- **Keine "Wenn Sie heute CHF 500 monatlich sparen, haben Sie in 15 Jahren CHF 120'000 mehr"**-Visualisierung für kleine, sofortige Massnahmen
- **Steuerersparnis** wird gut dargestellt (sofortiger Gewinn = wirksam gegen Present Bias ✓)
- **Zinseszins-Effekt** ist im Projektionsdiagramm sichtbar, aber nicht explizit hervorgehoben

### 4.8 Social Proof

**Schweregrad: ●●○○○ (Schwach, kontrolliert)**

Die Testimonials und "4'800 Personen"-Zahl sind klassischer Social Proof. Sie sind:
- Glaubwürdig formatiert (Name, Ort, Alter, Sterne)
- Keine extrem übertriebenen Aussagen ("Ich habe CHF 200'000 gespart!")
- Thematisch relevant (Scheidung, Selbständigkeit, Angst)

**Problem:** Alle 3 Testimonials sind 5 Sterne. Null kritisches Testimonial. Das erzeugt ein unrealistisch positives Bild und unterdrückt Skeptizismus.

### 4.9 Sunk Cost Effekt / Commitment Escalation

**Schweregrad: ●●○○○ (Schwach)**

Die Progress-Bar mit "Noch ca. 8 Minuten" und der Loading-Text "Handlungsempfehlungen werden ermittelt..." erzeugen Commitment. Nach 15 Minuten Dateneingabe ist der User psychologisch gebunden; er hinterfragt das Ergebnis weniger kritisch.

Dies ist ein normales UX-Muster (jedes Tool hat eine Fortschrittsanzeige) aber der Effekt ist real: Je mehr Zeit investiert, desto mehr wird das Ergebnis als "richtig" akzeptiert — unabhängig von seiner tatsächlichen Qualität.

### 4.10 Verfügbarkeitsheuristik (Availability Heuristic)

**Schweregrad: ●●●○○ (Mittel)**

Das Pflegeszenario und EL-Szenarien werden im Tool explizit erwähnt. Diese Szenarien sind emotional lebendig und leicht vorstellbar — was ihre subjektive Wahrscheinlichkeit übermässig hoch erscheinen lässt.

Beispiel: Ein User der liest "Jede 5. Rentnerin bezieht Ergänzungsleistungen" schätzt sein persönliches EL-Risiko als ca. 20% ein — aber für jemanden mit CHF 400'000 PK-Kapital und CHF 1'200/Monat AHV ist das EL-Risiko nahe null.

---

## 5. Kognitive Verzerrungen: Debiasing-Elemente

Das Tool enthält mehrere gute Gegenmassnahmen:

### 5.1 Szenarien-Denken (●●●●○ — Sehr gut)

Drei Szenarien (Optimistisch / Realistisch / Pessimistisch) sind einer der wirksamsten Mechanismen gegen Overconfidence und Planungsfehler. Sie:
- Zeigen dass die Zukunft ungewiss ist
- Verhindern Fixierung auf einen einzelnen Wert
- Regen zur Reflexion an ("Was tue ich wenn das Pessimistische eintritt?")

**Verbesserung:** Die Szenarien zeigen keine Wahrscheinlichkeiten. Ein User könnte glauben dass "Neutral" die wahrscheinlichste ist. Eine kleine Erklärung ("Alle drei sind möglich; historisch trat in 70% aller 20-Jahres-Perioden das neutrale oder bessere Szenario ein") würde Overconfidence weiter reduzieren.

### 5.2 "Was wäre wenn"-Slider (●●●●○ — Sehr gut)

Der Alterspension-Slider "Was wäre wenn ich mit 63/64/65/66/67 pensioniere?" ist ein hervorragendes Debiasing-Tool. Er:
- Macht Alternativen sichtbar (bekämpft Tunnelblick)
- Zeigt Trade-offs ohne zu bewerten
- Reduziert Status-Quo-Bias (Pensioniegalter ist verhandelbar)

### 5.3 Konkrete CHF-Beträge (●●●○○ — Gut)

Anstatt Prozentzahlen dominieren CHF-Beträge. "CHF 850/Monat Lücke" ist konkreter als "22% Deckungslücke". Konkrete Beträge bekämpfen Abstraktheit und Present Bias.

### 5.4 Disclaimer-Texte (●●○○○ — Vorhanden aber nicht prominent)

Mehrere Hinweise "ersetzt keine Beratung" sind vorhanden. Sie sind aber im Fliesstext und nicht prominent beim Score oder bei Empfehlungen sichtbar.

### 5.5 PK Rente vs. Kapital: Beide Seiten zeigen (●●●○○ — Gut)

Die Break-even-Analyse zeigt explizit: Kapital kann besser sein als Rente. Das ist mutig und korrekt — und ein Gegenpol zum Default `pkBezugsart = 'rente'`.

### 5.6 Gestaffelte Bezüge erklären (●●●○○ — Gut)

Der 3a-Staffelungshinweis ("Mehrere Konten = steuerlicher Progressionsvorteil") erklärt einen komplexen Mechanismus verständlich und ermöglicht Überlegungen jenseits des naiven "alles auf einmal beziehen".

---

## 6. Choice Architecture Bewertung

### 6.1 Architektur der Informationsdarstellung

**Was zuerst kommt = was am wichtigsten erscheint.**

In Screen 4 erscheinen zuerst:
1. Score (emotionaler Anker)
2. KPI-Karten (monatliche Situation)
3. Handlungsempfehlungen (sofortige Handlungsaufforderung)

Erst dann: Detaillierte Szenarien, Trade-off-Analysen, Erklärungen.

Die Architektur priorisiert **Konklusion vor Begründung.** Ein User sieht "Handlungsbedarf" und die Empfehlungen, bevor er die zugrundeliegenden Annahmen versteht. Dies begünstigt unkritische Akzeptanz.

**Bessere Architektur (Empfehlung):**
1. Annahmen/Inputs zusammenfassen (damit User falsche Defaults korrigieren kann)
2. Score und Szenarien zeigen (Kontext vor Konklusion)
3. Dann Empfehlungen

### 6.2 Die 14-Sektionen-Überlastung

**Screen 4 mit 14 parallelen Informationsbereichen verletzt das Hick-Hyman-Gesetz** (Reaktionszeit steigt logarithmisch mit Anzahl Optionen). Für komplexe Finanzentscheidungen ist dies besonders gravierend.

**Prioritätsarchitektur fehlt:** Alle 14 Sektionen sind gleichwertig skaliert. Es gibt keine visuelle Hierarchie die sagt: "Sektionen 1–3 sind wichtig; der Rest ist für tiefere Analyse."

**Mögliche Lösung:** Progressive Disclosure — zeige zunächst nur Score + Top-3-Massnahmen + Summarydiagramm. Rest via "Details anzeigen" expandierbar.

### 6.3 Empfehlungsreihenfolge als implizite Priorität

Die Empfehlungen sind nach Priorität sortiert (HOCH → MITTEL → NIEDRIG). Das ist gut und transparent. Aber die erste Empfehlung erhält überproportionale Aufmerksamkeit (Serial Position Effect — erste Position hat höchste Recall-Rate). 

Bei rotem Score lautet die erste Empfehlung: "Dringend: Klären Sie mögliche PK-Einkäufe." Dies ist sachlich sinnvoll — aber für eine Person mit <10% Grenzsteuersatz oder kurz vor Kapital-Bezug kann sie kontraproduktiv sein.

---

## 7. Spannungsfeld: Verschiedene User-Typen

WealthWise bedient sehr unterschiedliche User-Typen mit ein und derselben Architektur:

| User-Typ | Braucht | Was das Tool liefert | Mismatch |
|---|---|---|---|
| **Fatima (55, Reinigungskraft, Sprachbarriere)** | Klare, einfache Empfehlung; Orientierung | Komplexer Screen 4; 14 Sektionen; Fachjargon | Zu komplex |
| **Werner (60, Ingenieur, gut informiert)** | Zahlen für eigene Analyse; Szenarien | Viele Details; gute Szenarien | Passend |
| **Ruth (61, geschieden, Angst vor Zahlen)** | Beruhigung + konkrete nächste Schritte | Verlust-Framing; "Handlungsbedarf" | Kontraproduktiv |
| **Marco (54, Selbständiger, Unternehmer)** | Firmenverkauf-Szenarien; komplexe Steuer | Standardszenarien; kein Szenario für Verkaufserlös | Unvollständig |
| **Heidi (63, kurz vor Pension, alles gut)** | Bestätigung + Optimierung | Grüner Score + 3 Empfehlungen | Passend |

**Das zentrale Problem:** Die Architektur ist für Werner optimiert, aber Fatima und Ruth brauchen sie am dringendsten.

**Fehlende Lösung:** Ein User-Typ-Screen ("Wie sicher fühlen Sie sich mit Finanzthemen?" → Simpel / Standard / Detailliert) würde die Darstellung adaptieren und jedem User-Typ das Richtige zeigen.

---

## 8. Ethische Einordnung

### 8.1 Libertärer Paternalismus (Thaler & Sunstein, "Nudge")

Libertärer Paternalismus = Entscheidungsarchitektur die Menschen in eine bestimmte Richtung lenkt, während ihre Wahlfreiheit erhalten bleibt.

**WealthWise ist libertär-paternalistisch — und das ist grundsätzlich vertretbar, wenn:**
1. Die Defaults auf empirischer Evidenz basieren (teilweise erfüllt)
2. Die Nutzer informiert werden dass Defaults existieren (nicht erfüllt)
3. Abweichen einfach möglich ist (erfüllt — alles änderbar)
4. Die Defaults im Interesse der Nutzenden sind (teilweise erfüllt)

### 8.2 Problematische Nudges

**Nicht akzeptabel:**
- `pkBezugsart = 'rente'` als Default ohne Erklärung warum (der Kapitalbezug ist in vielen Fällen rational besser und wird durch den Default systematisch benachteiligt)
- Aspirational Anchors (100k/80k Einkommen) die keine empirische Basis haben
- "Dringend" bei rotem Score ohne Kontext-Differenzierung (ein 59-Jähriger mit 6 Jahren Zeit hat keine Notlage)

**Akzeptabel aber verbesserbar:**
- 80% als Default (Empfohlen) — empirisch begründet, transparent markiert; sollte kurz erklärt werden
- `riskProfile = 'balanced'` — verbesserbar durch kurze Risikoprofilierungs-Frage statt Default
- Verlust-Framing bei Lücken — nicht eliminierbar, aber Gegenpol stärken

### 8.3 Die Empfehlungs-Frage

**Sollte WealthWise Empfehlungen geben?**

Ja — aber mit Nuancierung. Die Alternative (nur Zahlen zeigen, keine Einordnung) überfordert Personen mit geringer Finanzliteralität. Die aktuelle Lösung (Empfehlungen ohne Gegenargument) bevormundet Personen mit hoher Finanzliteralität.

**Lösung: Kontextualisierte Empfehlungen**

Statt: *"PK-Einkauf prüfen"*

Besser: *"PK-Einkauf kann sinnvoll sein, wenn: [✓ Sie steuerlich davon profitieren] [✓ Sie das Kapital nicht in 3 Jahren beziehen wollen]. Sprechen Sie mit Ihrer PK."*

---

## 9. Konkrete Verbesserungsvorschläge

### P1 — Sofortige Verbesserungen (Behavioral kritisch)

**V1: Default pkBezugsart erklären**
```
Vor Auswahl: "Die meisten Schweizer beziehen die PK als Rente.
Für manche ist der Kapitalbezug besser — z.B. bei hohem Vermögen 
oder Erbschaftswunsch. Was trifft auf Sie zu?"

[Rente – sichere monatliche Zahlung]  [Kapital – einmalige Auszahlung]
[Mix – Teil Rente, Teil Kapital]       [Noch unklar – ich möchte vergleichen]
```

**V2: Score mit Konfidenzband versehen**
```
Statt: "Score: 72/100"
Besser: "Score: 72/100 (Range 60–82 je nach Annahmen)"
```

**V3: "Dringend" differenzieren**
```
Statt: "Dringend: Klären Sie mögliche PK-Einkäufe."
Besser: "PK-Einkauf könnte Ihre Rente verbessern. [Noch X Jahre bis Pension 
= ausreichend Zeit für eine überlegte Entscheidung.]"
```

**V4: Aspirational Anchors entfernen oder transparent machen**
```
Statt: income = 100'000 als versteckter Default
Besser: Keine vorausgefüllten Beispielwerte; oder expliziter Hinweis:
"Diese Werte sind Beispiele — bitte geben Sie Ihre tatsächlichen Daten ein."
```

### P2 — Mittelfristige Verbesserungen (UX/Architecture)

**V5: Progressive Disclosure auf Screen 4**
```
Level 1 (immer sichtbar): Score + Top-3-Massnahmen + Szenario-Zusammenfassung
Level 2 (expandierbar): Detaillierte Analysen (AHV, PK, 3a, Steuer)
Level 3 (für Experten): Alle Parameterdetails, Annahmen, Rohdaten
```

**V6: User-Typen-Weiche (Finanzliteralität)**
```
Nach Schritt 1: "Wie vertraut sind Sie mit Vorsorge-Themen?"
[Ich kenne mich wenig aus] → Vereinfachte Darstellung, mehr Erklärungen
[Ich bin gut informiert] → Standard-Ansicht
[Ich bin Fachperson] → Detailansicht mit allen Parametern
```

**V7: Gegenframe stärken (Gewinn-Frame ergänzen)**
```
Statt nur: "Vorsorgelücke: −CHF 850/Monat"
Ergänzen: "Sie decken 78% Ihres geplanten Bedarfs mit laufenden Renten."
```

**V8: Prosandcontra bei Empfehlungen**
```
[PK-Einkauf prüfen]
PRO: Steuerersparnis CHF X | Rentensteigerung CHF Y/Monat
CON: 3-Jahre-Sperrfrist | Kapital wird iliquid | Nur sinnvoll bei Grenzsteuersatz >20%
[Passt für Sie wenn: ...]
```

**V9: "Alles OK" als explizite Option kommunizieren**
```
Bei gelb (Deckungsgrad 90–100%):
"Ihre Situation ist grundsätzlich gut. Die folgenden Massnahmen sind 
Optimierungen — keine Notwendigkeiten. Sie können auch abwarten und 
die Entwicklung beobachten."
```

### P3 — Langfristig (Forschungsdesign)

**V10: Adaptive Defaults basierend auf Inputs**

Statt statischer Defaults, leite Defaults aus eingegebenen Daten ab:
- Alter 60+ → Default retireAge = 63 anbieten
- Verheiratet + Kinder → Default pkBezugsart = 'rente' (macht Sinn)
- Ledig ohne Erbschaftswunsch → Default pkBezugsart offen lassen

**V11: A/B-Testing für Framing**

Teste systematisch: Macht "Vorsorgelücke CHF 850" vs. "Deckungsgrad 78%" einen Unterschied in der Nutzerentscheidung? Welche Formulierung führt zu besserem Planungsverhalten?

---

## 10. Welche Nudges sind OK — welche problematisch?

### ✅ Akzeptable Nudges

| Nudge | Begründung |
|---|---|
| Szenarien zeigen (3 Pfade) | Evidenzbasiert; reduziert Overconfidence |
| 80% als empfohlenes Ausgabenziel | Empirisch fundiert (Ersatzquoten-Forschung); transparent markiert |
| Farbcodes für Score | Salience ist hilfreich; konsistent eingesetzt |
| Handlungsempfehlungen nach Priorität | Klar; einfacher opt-out möglich |
| AHV-Aufschub-Faktoren zeigen | Neutral informierend; beide Richtungen |
| Break-even-Analyse Rente vs. Kapital | Zeigt beide Seiten |
| "Noch X Minuten" Countdown | Normales UX-Pattern; kein Schaden |

### ⚠️ Problematische Nudges (Korrektur empfohlen)

| Nudge | Problem | Lösung |
|---|---|---|
| `pkBezugsart = 'rente'` stillschweigend | Benachteiligt Kapitalbezug ohne Begründung | Aktive Wahl ohne Default; oder erklärter Default |
| `pkRate = 5.4%` als Default | Systematisch zu hoch; erzeugt Overconfidence | Niedrigerer Default (5.0%) oder Hinweis: "Prüfen Sie Ihren tatsächlichen UWS im Ausweis" |
| Einkommen-Defaults 100k/80k | Aspirational Anchor; über Median | Leere Felder; kein Vorausfüllen |
| "Dringend" ohne Zeitkontext | Produziert Angst auch bei ausreichend Zeit | "Empfehlung für die nächsten 1–2 Jahre" |
| Alle Goals ausser "Rente reicht" gesperrt | Erzeugt künstliche Fokussierung | Mindestens 2–3 aktive Goals |
| Score ohne Konfidenzintervall | False Precision | Score-Range anzeigen |
| Nur 5-Sterne-Testimonials | Selektive Social Proof | Ein neutrales/gemischtes Testimonial |

### 🔴 Klarer Handlungsbedarf

| Nudge | Problem |
|---|---|
| 14 Sektionen simultan auf Screen 4 | Choice Overload → Paralyse oder selektive Verarbeitung |
| Keine User-Typ-Differenzierung | Falima braucht anderes als Werner |
| Verlust-Frame dominiert ohne Gegengewicht | Verlustaversion wird ohne Not aktiviert |

---

## 11. Gesamtbewertung: Respektiert WealthWise die Entscheidungsautonomie?

**Bewertung: 6.5 / 10**

### Was gut ist:
- Das Tool lässt alle Werte änderbar
- Szenarien zeigen Unsicherheit
- "Was wäre wenn"-Funktionen ermöglichen Exploration
- Disclaimer sind vorhanden
- Beide Seiten bei Rente/Kapital werden gezeigt

### Was fehlt:
- Transparenz über Defaults ("Diese Werte sind Annahmen — prüfen Sie ob sie für Sie gelten")
- Gegenargumente bei Empfehlungen
- User-Typ-Adaption (one-size-fits-all passt nicht)
- Gewinn-Frame als Gegengewicht
- Progressive Disclosure statt Informationsüberflutung
- Explizite "Nichts tun ist auch eine Option"-Möglichkeit

### Vergleich zu Best Practice:
**Best Practice (z.B. niederländisches APG Pensionskassen-Tool, schwedisches Pensionsmyndigheten):**
- Zeigt Szenarien und Unsicherheit prominent
- Nutzt Gewinn-Frame primär, Verlust-Frame sekundär
- Lässt User Prioritäten wählen ("Was ist Ihnen am wichtigsten?")
- Gibt keine direktionalen Empfehlungen ohne Gegenargumente
- Erklärt alle Defaults explizit

**WealthWise im Vergleich:**
- Szenarien: ✓ gut
- Framing: Verbesserungsbedarf
- User-Personalisierung: Fehlt
- Default-Transparenz: Fehlt weitgehend
- Empfehlungsqualität: Gut aber einseitig

---

## 12. Fazit für die akademische Verwendung

WealthWise zeigt ein typisches Muster von **gut gemeinter Entscheidungsarchitektur mit unbeabsichtigten Nudges.** Die Entwickler haben bewusst an vielen Stellen gut gewählt (Szenarien, CHF-Beträge, Slider). Aber sie haben die psychologische Wirkung von Defaults, Framing und Informationsüberlastung unterschätzt.

**Das Tool ist kein "dunkler Nudge"** — es versucht nicht, User zu schaden oder zu manipulieren. Aber es ist auch nicht so neutral wie das selbstdarstellende Designprinzip "Nutzerautonomie statt Lenkung" suggeriert.

Für den Thesis-Kontext ist diese Diskrepanz zwischen Designanspruch und Realität **selbst ein wertvoller Forschungsbeitrag**: Die quantitative Messung der Nudge-Wirkung (z.B. durch A/B-Tests mit alternativem Framing) wäre eine eigenständige wissenschaftliche Studie wert.

**Empfehlung für Verbesserung der Autonomie-Note von 6.5 auf 8+:**
1. V1 (Default pkBezugsart mit Erklärung) → +0.5
2. V3 (Dringend ohne Zeitkontext) → +0.3
3. V5 (Progressive Disclosure) → +0.5
4. V7 (Gewinn-Frame ergänzen) → +0.3
5. V8 (Pro/Contra bei Empfehlungen) → +0.4
6. V9 (Abwarten als Option kommunizieren) → +0.3

---

*Erstellt auf Basis eines vollständigen Code-Audits (Mai 2026). Alle Befunde beziehen sich auf den analysierten Code-Stand. Behavioral Finance ist ein empirisches Feld — die Schweregrad-Ratings basieren auf etablierter Forschungsliteratur, sind aber für WealthWise nicht empirisch getestet.*
