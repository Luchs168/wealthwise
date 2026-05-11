# WealthWise – UX-Review aus Nutzersicht
**Persona: Markus, 56 Jahre, Teamleiter, Winterthur**  
*Erstellt: Mai 2026 · Simulierte Erstnutzung*

---

## 1. Zusammenfassung als Markus (ehrlich, emotional)

Ich hab das Ding durchgemacht. Grösstenteils. Bei der Pensionskasse musste ich raten, weil ich meinen Ausweis nicht zur Hand hatte – das hat mich gestört, weil ich nicht weiss ob das dann überhaupt stimmt. Screen 3 war überraschend einfach, das hat mich beruhigt. Und dann das Ergebnis: minus CHF 850 pro Monat. Das hat mich erschreckt, kurz. Aber dann stand da konkret was ich tun kann – das war gut. Das Tool ist ehrlich. Es schmeichelt nicht. Ob ich jetzt wirklich verstehe was ein Umwandlungssatz ist? Nein. Aber das Ergebnis habe ich verstanden: es reicht so nicht, und hier sind drei Hebel.

---

## 2. Abbruch-Risiko (Wo und warum würde Markus aufgeben?)

### 🔴 Hohes Risiko: Screen 2b – Pensionskasse-Felder ohne PK-Ausweis

**Warum:** Markus öffnet die Seite, sieht "Aktuelles Altersguthaben (CHF)" und weiss: diese Zahl steht auf seinem PK-Ausweis, den er nicht hat. Er kann schätzen, aber weiss nicht ob CHF 380'000 oder CHF 420'000. Er tippt nichts ein. Dann kommt "Zinssatz Ihrer Pensionskasse" – er hat null Ahnung. Er klickt auf "BVG-Min (1.25%)" weil das erste steht. Er weiss nicht ob das falsch ist.

**Wahrscheinlichkeit:** ~35–40% der Nutzer in dieser Situation brechen hier ab oder schliessen das Tab und denken "mache ich ein andermal wenn ich den Ausweis habe" – und kommen nie zurück.

**Präziser Abbruchpunkt:** Die vier PK-Felder ohne Kontext, wie falsch eine Schätzung die Analyse macht.

---

### 🟡 Mittleres Risiko: Landing Page – Unterlagen-Checkliste

**Warum:** Markus liest: "IK-Auszug AHV – kostenlos, ca. 2 Wochen Lieferzeit". Zwei Wochen? Den muss er bestellen? Er hat das noch nie getan. Das klingt nach Bürokratie. Der erste Gedanke ist: "Ich habe das alles nicht, ich kann jetzt nicht anfangen."

**Rettung:** Er liest weiter und sieht "Sie können auch ohne alle Unterlagen starten". Das entspannt ihn. Aber er hat es fast schon abgebrochen bevor er das liest.

---

### 🟡 Mittleres Risiko: Screen 4 – Scrollmüdigkeit

**Warum:** Nach dem ersten KPI-Ergebnis (-CHF 850) und der Erklärung ist Markus emotional schon gesättigt. Er scrollt weiter und sieht: Frühpensionierungsanalyse, Vermögensverlauf, Drei Szenarien, "Was wäre wenn?"-Sliders, Cashflow-Tabelle Jahr für Jahr, Sensitivitätsanalyse... Er hört auf zu lesen. Er hat das Wichtigste gesehen und ist fertig.

**Präziser Abbruchpunkt:** Nach dem Handlungsempfehlungen-Block (ca. 30% des Screen-4-Inhalts).

---

### 🟢 Tiefes Risiko: Screen 2a – "Demo-Modus" beim PDF-Upload

**Warum:** Er versucht seinen PK-Ausweis hochzuladen (falls er ihn als PDF hat). Dann erscheint: "⚠️ Demo-Modus: Die automatische Extraktion ist eine **Simulation**. Die angezeigten Werte sind **Beispieldaten**." Er ist verwirrt und leicht misstrauisch. "Warum zeigt das Demo-Werte wenn ich mein eigenes Dokument hochlade?"

**Folge:** Er vertraut dem Upload nicht, entfernt das Dokument, muss alles von Hand eingeben – was er nicht kann, weil er die Zahlen nicht kennt.

---

## 3. Verständnis-Probleme (Was versteht Markus nicht?)

### 🔵 "Umwandlungssatz"
**UI-Text:** *"Der Umwandlungssatz bestimmt, wie viel Jahresrente Sie pro CHF 100'000 Altersguthaben erhalten..."*

**Markus' Reaktion:** Er liest den Tooltip. Er versteht den Satz. Aber er weiss nicht welchen Umwandlungssatz seine Pensionskasse hat. Er klickt auf "Typisch (5.4%)" weil "Typisch" nach einer sicheren Wahl klingt. Ob das stimmt: keine Ahnung.

**Problem:** Das Wort "Umwandlungssatz" erscheint auch an anderen Stellen ohne Erklärung – er hat immer das Gefühl er verpasst etwas.

---

### 🔵 "Rentenskala 44 / Skala 42"
**UI-Text:** *"Beitragsjahre bei Pensionierung · Skala N Badge"* und Warnmeldung *"⚠ Bei Pension mit 63 erreichen Sie max. Skala 42"*

**Markus' Reaktion:** Skala 42? Was bedeutet das? Ist das schlecht? Er sieht die Warnung, weiss nicht ob er in Panik geraten soll. Er klickt nicht auf irgendwas. Er scrollt weiter und hofft, dass das im Ergebnis berücksichtigt ist.

---

### 🔵 "KZG / Erziehungsgutschriften"
**UI-Text:** *"Erziehungsgutschriften werden für Jahre mit Kindern unter 16 angerechnet..."*

**Markus' Reaktion:** Er hat zwei Kinder, beide erwachsen. Er klickt "Ich habe Kinder erzogen (unter 16 Jahren)" an. Dann wählt er 2 Kinder, 16 Jahre. Ob das richtig ist und was es bringt: er hat keine Vorstellung. Er sieht dann "+CHF 1'400/Jahr" – das klingt gut, also lässt er es so.

---

### 🔵 "BVG-Mindestzins 2026: 1.25%"
**UI-Text:** Beim Zinssatz-Feld für die PK.

**Markus' Reaktion:** Er weiss nicht was der BVG-Mindestzins ist. Er weiss nicht ob seine PK mehr zahlt. Er denkt: "Das BVG-Minimum klingt nach Garantie, also wähle ich das." Falsch – seine PK zahlt wahrscheinlich 2–3%.

---

### 🔵 "IK-Auszug AHV"
**UI-Text:** Auf der Landing Page unter Unterlagen: *"Auszug aus Ihrem individuellen AHV-Konto · www.ahv-iv.ch (kostenlos, ca. 2 Wochen Lieferzeit)"*

**Markus' Reaktion:** Was ist das? Er hat sowas noch nie bestellt. Klingt aufwändig. Er ignoriert es und hofft, dass das Tool ohne funktioniert.

---

### 🔵 "Bezugsart: Rente / Kapital / 50/50 Mix"
**UI-Text:** *"Rente (Lebenslang, planbar)" / "Kapital (Flexibel, Steuer fällig)" / "50/50 Mix (Kombiniert)"*

**Markus' Reaktion:** Er weiss, dass das eine wichtige Entscheidung ist. Er weiss nicht welche richtig ist. Er klickt auf "Rente" weil das sicherer klingt. Aber er ist unsicher und hätte gerne eine Empfehlung. Er versteht nicht, dass diese Wahl die Berechnung grundlegend beeinflusst.

---

## 4. Emotionale Reaktionen (Screen für Screen)

### Landing Page
**Erster Eindruck (3 Sek):** ✅ "Reicht meine Rente? Finden Sie es heraus." – Das trifft ihn sofort. Das ist genau seine Frage. Er ist neugierig.

**Nach 20 Sekunden:** 🟡 Leichte Überforderung beim Scrollen. Viele Abschnitte, viel Text. Er liest selektiv.

**Unterlagen-Checkliste:** 😬 Kurze Panik. "IK-Auszug, 2 Wochen Lieferzeit, PK-Ausweis..." Er denkt: das ist zu viel Aufwand. Dann liest er: "Sie können auch ohne alle Unterlagen starten." – Erleichterung. Er klickt auf "Jetzt Analyse starten".

**Testimonials:** ✅ "Die Lücke war grösser als ich dachte" von Susanne K., 52 – er fühlt sich angesprochen. "Das könnte ich auch sein."

---

### Screen 1 – Persönliche Angaben
**Gesamtgefühl:** ✅ Entspannt. Die Felder sind einfach. Name, Geburtsdatum, Einkommen – das weiss er alles.

**Kleine Unsicherheit:** 🟡 Beim Feld "Kinder" – seine Kinder sind erwachsen. Er trägt sie trotzdem ein, unsicher ob das relevant ist.

**Pensionierungsalter-Slider auf 63:** 😰 Er sieht die Warnung: "Frühpensionierung vor 65: PK-Leistungen werden gekürzt." Er denkt: "Wie stark? Das möchte ich wissen." Er scrollt weiter, hofft auf mehr Info im nächsten Screen. Er ist leicht beunruhigt.

**Weiter-Button:** ✅ Er klickt. Die Bestätigungsmaske zeigt seine Daten – das fühlt sich gut an. "OK, es hat mich verstanden."

---

### Screen 2a – AHV
**AHV-Karte mit Betrag:** ✅ Er sieht eine Zahl: "CHF 2'180/Mt." – er ist erleichtert. Eine konkrete Zahl. Das fühlt sich echt an.

**"Details anpassen":** 🟡 Er klappt es auf aus Neugier. Sieht "Skala 42" und eine Warnung. Er klappt es wieder zu. Zu technisch.

**KZG:** 🟡 Er aktiviert es, wählt 2 Kinder und 16 Jahre. Er sieht die Zahl leicht steigen. Er fühlt sich gut, obwohl er nicht sicher ist ob er es richtig gemacht hat.

**Weiter zu 2b:** ✅ Er klickt. Er hat diesen Teil überlebt.

---

### Screen 2b – Pensionskasse (**kritischster Moment**)
**"PK-Ausweis hochladen":** 😤 Er versucht hochzuladen. Demo-Modus-Warnung erscheint. Er denkt: "Was? Warum zeigt das Beispieldaten von meinem eigenen Dokument?" Er löscht den Upload. Frustration.

**"Aktuelles Altersguthaben":** 😰 Er weiss es nicht. Er schätzt CHF 380'000. Er tippt es ein. Er weiss nicht ob das hoch oder tief ist.

**Vergleichshinweis:** ✅ "⌀ CH-Vergleich: Männer CHF 500'000" – er sieht: er liegt unter Durchschnitt. Das macht ihm Sorgen. Aber er behält die Zahl.

**Zinssatz:** 😕 Er wählt "BVG-Min (1.25%)" ohne zu verstehen was er tut.

**Umwandlungssatz:** 🟡 Er liest den Tooltip. Versteht es halb. Wählt "Typisch (5.4%)".

**Bezugsart:** 😕 Er zögert lange. Wählt "Rente". Unsicher.

**Projektion erscheint:** ✅ "CHF 2'100/Mt. PK-Rente" – er ist etwas beruhigt. Zusammen mit AHV: CHF 4'200/Mt. Das fühlt sich machbar an.

**Gesamtgefühl Screen 2b:** Erschöpft. Er hat geraten und weiss es. Er hofft, dass das Tool trotzdem etwas Sinnvolles liefert.

---

### Screen 3 – Ausgaben
**Erste Reaktion:** 😮‍💨 Erleichterung. Nur drei Knöpfe: 70%, 80%, 90%. Er klickt auf "80% · ⭐ Empfohlen". Fertig. Das war einfach.

**Krankenkasse:** 🟡 Er kennt seine Prämie ungefähr: CHF 430/Mt. Er gibt es ein. OK.

**Risikoprofil:** ✅ Er liest: "Ausgewogen – Mix aus Aktien und Obligationen, 2–3.5% p.a." Er klickt. Das klingt vernünftig.

**Lebensereignisse:** 🟡 Er überlegt kurz: Renovation geplant. Aber das Formular erscheint komplex. Er klickt "Überspringen" innerlich und macht nichts. Zu viele Felder.

**Gesamtgefühl Screen 3:** Überraschend gut. Das war der einfachste Screen. Er fühlt sich wieder kompetent.

---

### Screen 4 – Analyse
**Score 68/100 – "Anpassungen empfohlen":** 😐 Er sieht die Note. "Nicht schlecht, nicht gut." Er will die Details wissen.

**KPI-Karte "−CHF 820/Mt.":** 😰 Stich ins Herz. Er denkt: "So viel fehlt mir jeden Monat?" Er scrollt weiter, braucht Kontext.

**"Was bedeutet das?" – Erklärungstext:** ✅ Er liest ihn. Der Absatz erklärt es verständlich. Er atmet durch. "OK, es ist nicht hoffnungslos."

**Frühpensionierungsanalyse:** 😟 "Geschätzte Gesamtkosten der Frühpensionierung: CHF 148'000" – das ist viel. Er liest weiter. AHV-Vorbezug, PK-Überbrückungsrente, Vermögensverzehr... zu viele Optionen.

**Handlungsempfehlungen:** ✅ "1. PK-Einkauf prüfen · 2. AHV-Lücken schliessen · 3. 3a maximieren" – das versteht er. Das sind konkrete Dinge. Er ist leicht motiviert.

**Ab hier:** Er scrollt noch durch die Szenarien-Karten. Sieht optimistisch/neutral/pessimistisch. Er schaut auf "neutral" und nimmt das als seine Realität.

**Cashflow-Tabelle, Was-wäre-wenn-Sliders, Sensitivitätsanalyse:** 😴 Er scrollt durch ohne zu lesen. Zu viel. Er ist mental ausgestiegen.

**PDF-Button:** ✅ Er klickt drauf. Lädt herunter. Er will das seiner Frau zeigen.

---

### Chat-Funktion
**Sieht er den Button?** Vielleicht. Er ist abgelenkt vom Inhalt.

**Würde er klicken?** 🟡 Unsicher ob das ein Mensch oder Bot ist. Er testet: "Was ist ein Umwandlungssatz?" Wenn die Antwort gut ist: er fragt mehr. Wenn sie generisch klingt: er schliesst das Chat.

**Vertrauen:** 🟡 Er vertraut einem Computer bei Fragen wie "was bedeutet das?". Bei "soll ich Kapital oder Rente wählen?" will er lieber einen echten Menschen.

---

## 5. Vertrauens-Momente

### Was baut Vertrauen auf ✅
- **"Keine Registrierung"** auf der Landing Page – sofortige Erleichterung
- **"Wird nur lokal verarbeitet – verlässt Ihren Browser nicht"** beim Upload – er liest das und nickt
- **"Kostenlos"** überall – kein Haken, er wartet auf den Verkaufsversuch, der nie kommt
- **"Basierend auf AHV/BVG-Kennzahlen 2026"** – klingt offiziell, staatlich, seriös
- **Schweizer Durchschnittswerte** als Vergleich – er kann sich einordnen, das fühlt sich real an
- **Übergangsmaske nach Screen 1** mit Bestätigung seiner Daten – er fühlt sich "verstanden"
- **"Was bedeutet das?"-Block** auf Screen 4 – das ist genau das, was er braucht
- **Konkrete Handlungsempfehlungen** in Franken – das ist handlungsorientiert, nicht akademisch
- **Score-Zahl (68/100)** – er versteht Noten. Er versteht 68 sofort.
- **Disclaimer am Ende** ("ersetzt keine professionelle Beratung") – wirkt ehrlich, nicht anmassend

### Was zerstört Vertrauen ❌
- **Demo-Modus-Warnung beim PDF-Upload** – er denkt, das Tool funktioniert nicht richtig oder er macht etwas falsch
- **Geraten bei PK-Feldern** – er weiss, dass seine Analyse auf geschätzten Zahlen basiert; das untergräbt das Vertrauen ins Ergebnis
- **Zu viele unverständliche Begriffe ohne intuitive Erklärung** (Skala 44, BVG-Mindestzins, Umwandlungssatz) – er fühlt sich nicht smart genug
- **Unterlagen-Checkliste mit "2 Wochen Lieferzeit"** – das klingt nach einem Hindernis, nicht nach Hilfe
- **Screen 4 ist sehr lang** – er denkt: "Wenn es so komplex ist, wie kann ich das wirklich verstehen?"

---

## 6. Konkrete Verbesserungen aus Markus' Sicht

### A. PK-Felder: Führung statt Überforderung *(Priorität: Kritisch)*
Das Problem ist nicht die Komplexität – es ist die fehlende Orientierung ohne Dokument.

**Konkret:**
- Vor den PK-Feldern: Ein Banner "Haben Sie Ihren PK-Ausweis nicht zur Hand? Kein Problem – wir schätzen auf Basis Ihres Einkommens und Alters. Sie können die Zahlen später präzisieren."
- Standardwerte vorausfüllen auf Basis von Alter + Einkommen (mit Hinweis "Schätzung: CHF 350'000" in grau)
- Felder die der Nutzer wahrscheinlich nicht kennt markieren: "Schätzung genügt" statt leer lassen
- Beim Umwandlungssatz: "Typisch" zum Default machen und erklären: "80% der Schweizer PK liegen zwischen 5.0% und 5.8%"

### B. "Demo-Modus" beim Upload umbenennen *(Priorität: Hoch)*
**Problem:** "Demo-Modus" klingt nach kaputt oder nicht echt.

**Konkret:** Umbenennen zu "Ausfüllhilfe – wir lesen die Struktur aus Ihrem Dokument und schlagen Felder vor. Bitte prüfen Sie die Werte." Keine Warnung, ein Hinweis.

### C. Jargon ersetzen oder inline erklären *(Priorität: Hoch)*
- "Skala 44/42" → Zeigen als: "Volle AHV-Rente (44 Jahre)" vs. "Sie erreichen 95.5% der vollen Rente"
- "BVG-Mindestzins" → "Gesetzlicher Mindestzins (das Minimum, das Ihre PK zahlen muss)"  
- "KZG" → komplett weglassen, nur als Frage: "Haben Sie Kinder erzogen? Dann erhöht sich Ihre AHV automatisch."
- "IK-Auszug AHV" auf Landing Page → "Ihr AHV-Kontoauszug (optional – das Tool funktioniert auch ohne)"

### D. Unterlagen-Checkliste entschärfen *(Priorität: Mittel)*
Der erste Eindruck der Checkliste ist: "Viel Aufwand". Dabei braucht Markus eigentlich nur sein Einkommen zu wissen.

**Konkret:** Die Checkliste umbauen zu einer 2-Stufen-Darstellung:
- Stufe 1: "Das brauchen Sie unbedingt: Ihr Jahreseinkommen (kennen Sie bereits)"
- Stufe 2: "Das macht die Analyse präziser (optional): PK-Ausweis, 3a-Stand, Vermögen"

### E. Screen 4: Hierarchie schaffen *(Priorität: Mittel)*
Markus liest maximal die ersten 40% des Screens. Der Rest ist verschwendet.

**Konkret:**
- Direkt nach den KPI-Karten: Top-3-Massnahmen mit CHF-Betrag (nicht weiter unten versteckt)
- Rest in Tabs oder Akkordeon: "Details für Interessierte"
- "Detailanalyse anzeigen" Button NACH den Empfehlungen platzieren, nicht vorher

### F. Bezugsart-Entscheid vereinfachen *(Priorität: Mittel)*
Markus kann nicht entscheiden zwischen Rente/Kapital/50/50 ohne Kontext.

**Konkret:** Eine einfache Empfehlung einblenden: "Für Ihre Situation empfehlen wir: **Rente** – bietet Sicherheit und ist für die meisten Angestellten die beste Wahl. [Warum?]"

### G. Lebensereignisse vereinfachen *(Priorität: Niedrig)*
Der Accordion-Aufbau ist komplex. Markus überspringt ihn.

**Konkret:** Nur 3 Schnelloptionen anbieten: "Renovation geplant", "Teilpension vor Vollpension", "Erbschaft erwartet" – als Buttons mit einem Betrag-Feld. Alles andere unter "Weiteres hinzufügen".

---

## 7. Zitate von Markus

### Was würde er seiner Frau beim Abendessen erzählen?

> *"Du, ich hab heute so ein Online-Tool ausprobiert für die Pension. WealthWise heisst das. Kostenlos, keine Anmeldung, hat mir gefallen. Hat mich so 20 Minuten gekostet, nicht 10 wie versprochen.*
>
> *Bei der Pensionskasse musste ich raten – ich hab unseren Ausweis nicht gefunden, du weisst wo der ist? Das Ergebnis sagt: uns fehlen CHF 820 pro Monat wenn ich mit 63 aufhöre. Das ist schon ein Batzen. Aber sie sagen ich soll mal schauen ob ich in die PK einzahlen kann – das gibt Steuerabzug und mehr Rente. Das müssen wir mit unserem PK-Berater anschauen.*
>
> *Ich hab das PDF runtergeladen. Kannst du mal drüberschauen? Ich versteh nicht alles, aber das Wichtigste schon: mit 63 ist es eng, mit 65 wäre es entspannter. Vielleicht mache ich doch 64?"*

---

### Was würde er einem Arbeitskollegen sagen?

> *"Mach das mal, dauert eine Viertelstunde. Das zeigt dir ob du auf Kurs bist oder nicht. Ich war etwas erschrocken am Anfang, aber dann gab es konkrete Tipps. Ich muss jetzt mal meinen Pensionskassenausweis raussuchen und neu rechnen."*

---

### Was würde er nicht sagen, aber denken?

> *"Eigentlich müsste ich das nochmal machen, diesmal mit dem richtigen PK-Ausweis. Aber ich weiss nicht ob ich die Zeit finde."*

---

## Gesamtbewertung als Markus

| Frage | Antwort |
|---|---|
| Würde er das Tool fertig ausfüllen? | Ja, mit Mühe – ca. 70% der Nutzer wie er |
| Wenn abbrechen: Wo? | Screen 2b, PK-Felder ohne Ausweis |
| Würde er das Ergebnis seiner Frau zeigen? | Ja, das PDF |
| Würde er danach einen Berater aufsuchen? | Wahrscheinlich ja – er hat jetzt Gesprächsstoff |
| Würde er es weiterempfehlen? | Ja, mit Vorbehalt: "Hol zuerst deinen PK-Ausweis" |
| Was hat ihm am besten gefallen? | Die konkreten Handlungsempfehlungen in CHF |
| Was hat ihn am meisten frustriert? | PK-Felder ohne seinen Ausweis, Demo-Modus-Verwirrung |
| Was hat er am Ende nicht verstanden? | Umwandlungssatz, Skala 42, was der Zinssatz bewirkt |
| Fühlt er sich besser informiert? | **Ja** – er hat eine Zahl (−CHF 820/Mt.) die er vorher nicht hatte |
| Fühlt er sich selbstbestimmt oder bevormundet? | Selbstbestimmt – das Tool urteilt nicht, es zeigt |

---

*Review erstellt auf Basis der vollständigen UI-Texte aller 5 Screens · Persona: Markus, 56, Teamleiter KMU Winterthur, verheiratet, Wohneigenümer, Ziel: Pension mit 63*
