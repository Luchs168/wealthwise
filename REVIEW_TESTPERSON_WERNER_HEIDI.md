# UX-Review: Werner (63) & Heidi (60) Müller, Aarau AG
**Gestaffelte Pensionierung eines Ehepaars mit komplexem Vermögen**

---

## 1. Zusammenfassung als Werner (ungeduldig, direkt)

Okay, das Tool zeigt mir grob was ich habe – aber die wichtigste Frage beantwortet es mir nicht: "Kann ich JETZT aufhören, ohne dass wir Probleme kriegen?" Ich vermisse eine klare Antwort auf die Übergangsphase: ein Jahr Werner-ohne-AHV, Heidi-arbeitet-noch, und was das für unsere Haushaltskasse bedeutet. Das Tool rechnet immer entweder "beide pensioniert" oder "keiner pensioniert" – genau die Phase dazwischen, die mich interessiert, fehlt.

---

## 2. Zusammenfassung als Heidi (gründlich, besorgt)

Ich habe alles eingetragen und bin beeindruckt, dass das Tool zwei Personen mit verschiedenen PKs und verschiedenen Pensionierungsaltern grundsätzlich unterstützt – das ist schon mal viel. Aber ich vermisse konkrete Warnungen: Wann darf Werner seine PK-Kapital beziehen? Das Tool zeigt zwar die 3-Jahres-Sperrfrist allgemein als Hinweis, aber sagt mir nicht: "Achtung Werner, dein Einkauf 2024 sperrt dich bis 2027!" Und die Frage, ob unsere Hypothek nach Werners Pensionierung noch tragbar ist, wird nirgends aktiv aufgegriffen.

---

## 3. Spezifische Probleme für Ehepaare mit gestaffelter Pensionierung

### 3a – Übergangsphase wird nicht modelliert
Das Tool kennt Pensionierungsalter für Person 1 (Werner, 64) und Person 2 (Heidi, 65). In der Cashflow-Berechnung wird zwar berücksichtigt, dass Heidi noch 1 Jahr länger arbeitet. Aber es fehlt eine **explizite Übersichtsphase**:
- Phase 1 (Werner 64–65 / Heidi 60–65): Werner pensioniert + Nichterwerbstätiger-AHV-Beiträge, Heidi arbeitet noch → Haushalt mit Mischeinkommen
- Phase 2 (Werner 65+ / Heidi 65+): Beide pensioniert, AHV-Plafonierung aktiv

Diese Phasen-Darstellung fehlt. Der Nutzer muss selbst hochrechnen.

### 3b – AHV-Plafonierung korrekt berechnet, aber nicht phasenweise erklärt
Das Tool zeigt die Ehepaar-Plafonierung korrekt im Analysemodus (max. CHF 3'780/Mt. für beide zusammen). Gut. Aber: In den 5 Jahren wo Werner bereits Rente bezieht und Heidi noch arbeitet, gilt die Plafonierung noch **nicht** (sie greift erst wenn beide AHV beziehen). Das Tool zeigt diesen Unterschied nicht. Werner und Heidi könnten fälschlicherweise denken, die Plafonierung wirkt ab Werners Pensionierung.

### 3c – Keine 3-Jahres-Sperrfrist für konkreten Einkauf
Das Tool zeigt bei PK-Einkauf Steuerersparnis eine allgemeine Warnung: "Nach einem PK-Einkauf können die eingekauften Leistungen während 3 Jahren nicht als Kapital bezogen werden." Aber es gibt kein Eingabefeld für "Ich habe 2024 einen Einkauf von CHF 40'000 gemacht." Die Sperrfrist für Werner läuft bis 2027 – das Tool kennt das nicht. Es könnte Werner fälschlicherweise empfehlen, 2025 PK-Kapital zu beziehen.

### 3d – Nichterwerbstätigen-AHV-Beiträge für verheiratete Person
Werner muss nach Pensionierung AHV-Beiträge als Nichterwerbstätiger zahlen, bis er AHV bezieht (bei ihm 1 Jahr). Das Tool berechnet diese Beiträge (Funktion `calculateAHVContributionNonEmployed` ist vorhanden), aber **nur für Frühpensionierte ohne Partner**. Für Werners Fall – verheiratet, Partnerin erwerbstätig – muss die Berechnungsbasis berücksichtigen, dass Heidi AHV-pflichtig ist (Befreiung wenn Partner mindestens das Doppelte des Mindestbeitrags zahlt). Diese Befreiungsregel erscheint nicht.

### 3e – Hypothek-Tragbarkeit wird nicht aktiv geprüft
Die Bank rechnet die Tragbarkeit mit dem Renteninkommen neu aus. Werners Pensionierung bedeutet: Haushaltseinkommen sinkt stark, Hypothek bleibt. Das Tool zeigt die Immobilie und die Hypothek, rechnet sogar Eigenkapital aus – aber es gibt keine Warnung: "Achtung: Bei einem Haushaltseinkommen von CHF X muss die Hypothek tragbar sein. Bankgespräch empfohlen." Für ein Paar wie Werner/Heidi mit CHF 350'000 Hypothek und CHF 1'200'000 Haus ist das ein echtes Thema.

### 3f – Zwei verschiedene 3a-Bezugsstrategien nicht koordiniert
Werner hat 2 Konten (CHF 95'000 + CHF 88'000), Heidi hat 1 Konto (CHF 72'000). Die Staffelungs-Empfehlungen funktionieren pro Person, aber es fehlt eine koordinierte Haushaltsstrategie: In welchem Jahr sollte Werner Konto 1 beziehen, in welchem Konto 2, und in welchem sollte Heidi ihres beziehen – alles koordiniert, um die Steuerprogression zu minimieren?

---

## 4. Fehlende Features (Checkliste)

| Feature | Status | Kommentar |
|---|---|---|
| Gestaffelte Pensionierung: Zwei Phasen explizit | ❌ Fehlt | Nur implizit via Cashflow |
| AHV-Plafonierung korrekt ab Phase 2 | ✅ Vorhanden | Aber phasenweise Erklärung fehlt |
| 3-Jahres-Sperrfrist (konkretes Einkaufsjahr eingeben) | ❌ Fehlt | Nur allgemeiner Warnhinweis |
| Nichterwerbstätigen-Beiträge bei verheiratetem Partner | ⚠️ Teilweise | Berechnung vorhanden, Befreiungsregel fehlt |
| Hypothek-Tragbarkeit nach Pensionierung | ❌ Fehlt | Keine Warnung/Prüfung |
| Koordinierte 3a-Staffelung (beide Partner) | ❌ Fehlt | Nur pro Person |
| Übergangsphasen-Darstellung (einer arbeitet, einer nicht) | ❌ Fehlt | Nicht sichtbar |
| Überbrückungsrente für Werner (1 Jahr bis AHV) | ⚠️ Teilweise | Vorhanden, aber nicht für Paar-Kontext erklärt |
| PK-Einkauf 2. Person (Heidi) separat dargestellt | ✅ Vorhanden | Tabs funktionieren |
| Befreiung Nichterwerbstätigen-Beiträge (Ehegatte erwerbstätig) | ❌ Fehlt | |

---

## 5. Was funktioniert gut für Ehepaare

**Zwei-Personen-Eingabe (Tabs):** Beide PKs mit verschiedenen UWS können separat eingegeben werden. Werner 5.2%, Heidi 5.8% – das geht problemlos. Sehr gut.

**Verschiedene Pensionierungsalter:** Werner 64, Heidi 65 – der Slider funktioniert für beide getrennt. Das Tool erkennt automatisch, dass Werner 1 Jahr früher aufhört.

**AHV-Plafonierung berechnet und erklärt:** Die CHF 3'780/Mt.-Obergrenze wird korrekt berechnet und mit einem InfoTooltip erklärt. Heidi versteht das.

**3a-Anzahl Konten:** Werner kann 2 Konten eingeben (Anzahl). Das Tool berücksichtigt die gestaffelte Auszahlung in der Optimierung.

**Getrennte PK-Analyse:** UWS, Kapitalbezug, Rente vs. Kapital-Mix kann für jede Person separat eingestellt werden.

**Frühpensionierungsanalyse:** Für Werner (1 Jahr Überbrückung) ist die Überbrückungsanalyse grundsätzlich vorhanden.

**Gemeinsames Vermögen als ein Wert:** Sparkonto (CHF 180'000) + Wertschriften (CHF 120'000) = CHF 300'000 als freies Vermögen eintragen – einfach und pragmatisch.

---

## 6. Was fehlt komplett

**Phasenmodell für gestaffelte Pensionierung:**
Das grösste Defizit. Die Übergangsphase ist die kritischste für Werner und Heidi, und das Tool macht sie unsichtbar. Es fehlt eine Darstellung:
- Phase 1 (Werners Übergang, Jahr 1): Haushaltseinkommen = Werners PK-Rente + Heidis Lohn. AHV-Plafonierung noch nicht aktiv. Werner zahlt Nichterwerbstätigen-Beiträge.
- Phase 2 (Beide pensioniert): Haushaltseinkommen = AHV (plafoniert) + 2× PK-Renten.

**Koordinierter Bezugsplan (Haushalt gesamt):**
"In welchem Jahr beziehen WIR was" – eine gemeinsame Bezugs-Timeline für beide Partner fehlt. Wann zieht Werner Konto 1 (2025? nein, Sperrfrist!), wann Konto 2, wann Heidi? Ein Haushalts-Kalender wäre hier der Killer-Feature.

**Konkretes Sperrfrist-Datum:**
Eingabefeld "Letzter PK-Einkauf (Jahr):" fehlt. Wenn Werner 2024 eingetragen hätte, würde das Tool automatisch warnen: "PK-Kapitalbezug frühestens 2027 möglich."

**Hypothek-Tragbarkeitswarnung:**
Aktive Warnung: "Bei einer Hypothek von CHF 350'000 und geschätztem Renteneinkommen von CHF X ist die Bankprüfung ein Risiko. Banken setzen oft 5% kalkulatorischer Zins an – Ihre Tragbarkeit sollten Sie mit Ihrer Bank klären."

**Nichterwerbstätigen-Beiträge im Paar-Kontext:**
Die automatische AHV-Befreiung für Werners Jahr als Nichterwerbstätiger (weil Heidi erwerbstätig und AHV-pflichtig) muss korrekt kommuniziert werden.

**Wertschriften vs. Sparkonto getrennt:**
Das freie Vermögen wird als eine Zahl eingegeben. Für die Liquiditätsplanung (Überbrückung braucht liquide Mittel) wäre eine Trennung hilfreich.

---

## 7. Emotionale Dynamik zwischen den Partnern bei der Nutzung

**Werner startet:** Er öffnet das Tool, überfliegt die Landing Page. "Sieht okay aus, mal schauen." Er will schnell zur Zahl kommen. Gibt seine Daten ein, ist zufrieden dass das geht. Bei Screen 2 hakt er – "Wo gebe ich die Sperrfrist ein?" Findet nichts. Überspringt es.

**Heidi übernimmt bei Screen 2:** "Werner, ich mach das. Du hast 2024 CHF 40'000 eingekauft, das muss irgendwo rein." Findet kein Feld. Frustriert, aber macht weiter. Gibt alle Zahlen sorgfältig ein.

**Gemeinsam bei Screen 4:** Werner sieht die Zahl – der Haushalt hat genug. "Siehst du? Ich kann aufhören." Heidi schaut genauer: "Aber Werner, wo ist die Phase wo du noch keine AHV hast und ich noch arbeite? Das ist nicht gezeigt." Kurze Stille. Werner: "Das Haus ist eh viel wert." Heidi: "Die Hypothek."

**Werner wird ungeduldig:** Scrollt schnell durch die langen Analysen. "Heidi, hier steht Plafonierung CHF 3'780, das passt." Heidi: "Aber das gilt erst wenn ich auch in Rente bin. Vorher ist es anders." Beide schauen sich an – sie haben mehr Fragen als vorher.

**Die Spannung:** Das Tool verschärft kurz den Konflikt. Werner hat Zahlen die "gut aussehen", Heidi sieht Lücken. Das erzeugt Unsicherheit statt Klarheit für die entscheidenden 12 Monate.

---

## 8. Zitat Werner – Was sagt er zu Heidi nach der Nutzung?

> "Heidi, das sieht gut aus – wir haben genug. CHF 3'780 AHV zusammen, meine PK-Rente, dein Lohn noch 5 Jahre – das reicht. Aber dieses Tool zeigt mir nicht, was genau im ersten Jahr passiert. Das wäre das Einzige was ich noch wissen will. Sonst: solide. Ich geh morgen zur Bank."

---

## 9. Zitat Heidi – Was sagt sie zu Werner?

> "Werner, ich bin nicht beruhigt. Das Tool weiss nicht, dass du 2024 eingekauft hast und frühestens 2027 Kapital beziehen darfst. Es zeigt uns die Plafonierung erst wenn wir beide Rente haben – aber das Jahr dazwischen? Nichts. Und die Hypothek – hat dich das Tool gewarnt, dass die Bank neu prüft? Nein. Ich zeige das dem Bernhard von der Kantonalbank, bevor du kündigst."

---

## 10. Top-5 Verbesserungen für Ehepaare

### #1 – Gestaffelte Pensionierung: Phasen-Visualisierung
**Problem:** Die Übergangsphase (einer pensioniert, anderer arbeitet) ist unsichtbar.  
**Lösung:** Im Screen 4-Cashflow eine **Timeline mit Phasen** zeigen:
- Phase 1: "Werner 64–65 · Heidi 60–65 · Gemischtes Haushaltseinkommen"
- Phase 2: "Beide pensioniert ab 65/65 · AHV-Plafonierung aktiv"
- Pro Phase: Gesamteinkommen Haushalt, offene Kosten, Nettoliquidität.

### #2 – Konkretes Sperrfrist-Eingabefeld
**Problem:** Werners Einkauf 2024 ist dem Tool unbekannt; es kann falsche Empfehlungen generieren.  
**Lösung:** In Screen 2 (PK-Bereich) Feld: "Letzter PK-Einkauf (Jahr, optional):" mit Warnung wenn `currentYear - eingabeJahr < 3`: "⚠ Kapitalbezug vor [Jahr+3] nicht möglich (3-Jahres-Sperrfrist Art. 79b BVG)."

### #3 – Koordinierter Haushalts-Bezugskalender
**Problem:** 3a-Staffelung wird pro Person gezeigt, nicht koordiniert als Haushalt.  
**Lösung:** Kombinierte Tabelle: "Wann beziehen WIR was?" – beide Partner zusammen, mit Steueroptimierung für den **gemeinsamen steuerbaren Haushalt**.

### #4 – Hypothek-Tragbarkeitswarnung
**Problem:** Keine Warnung dass die Bank nach Pensionierung neu prüft.  
**Lösung:** Wenn `property.has && property.mortgage > 0 && bridgingRetireAge < 65`: Warnung: "Hypothek CHF X: Die Bank prüft die Tragbarkeit neu auf Basis Ihres Renteneinkommens (kalkulatorisch ~5%). Aktiv ansprechen."

### #5 – AHV-Befreiung Nichterwerbstätiger (Ehegatte erwerbstätig)
**Problem:** Werner zahlt keine Nichterwerbstätigen-Beiträge wenn Heidi mindestens das Doppelte des AHV-Mindestbeitrags entrichtet.  
**Lösung:** Wenn `hasPartner && p2.status === 'erwerb' && bridgingRetireAge < 65`: Info-Block: "Als verheiratete Person können Sie von der AHV-Beitragspflicht befreit sein, wenn Ihr Ehepartner mindestens den doppelten Mindestbeitrag (CHF 1'007/Jahr 2026) entrichtet – das ist hier der Fall. Klären Sie dies mit Ihrer Ausgleichskasse."

---

## Gesamtbewertung

| Kriterium | Werner | Heidi |
|---|---|---|
| War das Tool schnell genug? | ⚠️ Mittel – viele Screens, aber machbar | ✅ Ja – gründliche Analyse möglich |
| Waren alle Paar-Aspekte abgedeckt? | ❌ Nein – Übergangsphase fehlt | ❌ Nein – Sperrfrist, Tragbarkeit fehlen |
| Würden wir das Bankberater zeigen? | ⚠️ Als Gesprächsbasis ja, als Entscheidungsgrundlage nein | ⚠️ Mit Vorbehalt: "Das fehlt noch" |
| Was sagen wir den Nachbarn? | "Gibt einen guten Überblick, aber die Details musst du mit dem Berater klären." | "Es ist besser als nichts, aber für unsere komplizierte Situation braucht man mehr." |

**Fazit:** WealthWise funktioniert für Ehepaare besser als für Einzelpersonen – die Zwei-Personen-Erfassung und AHV-Plafonierung sind solide. Aber die **Übergangsphase** (einer pensioniert, anderer nicht) und die **Sperrfrist-Warnung** sind für Werner und Heidi die entscheidenden Lücken. Das Tool gibt ihnen Orientierung, aber keine Handlungsanweisung für den nächsten Schritt.
