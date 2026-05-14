# WealthWise – Erfahrungsbericht aus der Perspektive von Marco Bianchi

**Testperson:** Marco Bianchi, 54 Jahre, verheiratet (Laura, 52), Emmen (Kanton Luzern)  
**Situation:** Selbständiger Schreiner seit 18 Jahren, 3 Angestellte, Bruttoeinkommen CHF 95'000–130'000 (Ø CHF 110'000), KEINE Pensionskasse, Säule 3a CHF 120'000 (Einzahlung CHF 36'288/Jahr), Sparkonto CHF 65'000, Wertschriften CHF 40'000, Haus (Verkehrswert CHF 850'000, Hypothek CHF 420'000, Zins 2.1%), Firmenwert ca. CHF 150'000–200'000, Rentenziel 62–63  
**Profil:** Körperlich belastet (Rücken), technikaffin (Online-Banking, kein Finanz-App), misstrauisch gegenüber Banken und Versicherungen, Schuldgefühl wegen fehlender PK

---

## 1. Zusammenfassung als Marco (5 Sätze, direkt und emotional)

Ich hab das Ding ausprobiert, weil Laura schon wieder gefragt hat, und ich muss sagen: Es hat mich erwischt, aber nicht ganz richtig. Das Tool rechnet mir eine Lücke aus, die ich geahnt habe – aber es rechnet sie falsch, weil die Hälfte meiner Realität gar nicht erfasst wird: kein Feld für meinen Firmenwert, kein Feld für mein schwankendes Einkommen, kein Feld für den Verkauf der Schreinerei als mein grösstes Alterskapital. Was mich fast mehr frustriert als die riesige Lücke auf dem Bildschirm: Das Tool weiss nicht mal, dass ich Selbständiger bin – ich bin einfach ein Angestellter ohne Pensionskasse. Das Haus wird zwar erfasst, aber dann steht da "NICHT als liquides Vermögen" und ich sitze da und denke: Ja was denn sonst? Ich habe sonst nichts. Den Hinweis, dass ich mich freiwillig bei der Auffangeinrichtung versichern kann, habe ich gefunden – aber das war's; was das konkret kostet, bringt und ob es mit 54 noch Sinn macht, hat mir das Tool nicht gesagt.

---

## 2. Spezifische Probleme für Selbständige ohne PK

### A) Keine Identifikation als Selbständiger
Das Tool fragt nirgendwo: "Sind Sie angestellt oder selbständig erwerbend?" Es gibt keinen Toggle, kein Dropdown, keine explizite Kategorie. Marco wird ab dem ersten Feld wie ein Angestellter behandelt. Die Konsequenzen:

- **AHV-Beitragssatz:** Selbständige zahlen 10% statt 10.6% (gestaffelter Beitragssatz nach Einkommen). Das ergibt eine leicht tiefere AHV-Rente als bei einem Angestellten mit identischem Einkommen. Das Tool berechnet die AHV-Rente auf Basis des Bruttoeinkommens – ohne diese Unterscheidung.
- **3a-Höchstbetrag:** Das 3a-Maximum ohne PK gilt für Selbständige nur auf **20% des Nettoerwerbseinkommens**, maximal CHF 36'288. Das Tool zeigt diese Grenze korrekt an ("CHF 36'288 ohne PK"), aber es prüft **nicht**, ob 20% des Nettoeinkommens tatsächlich CHF 36'288 ergibt. Bei Marco (Nettoeinkommen nach AHV/IV/EO vielleicht CHF 95'000–100'000) wären 20% = CHF 19'000–20'000 – deutlich unter CHF 36'288. Marco zahlt seit Jahren möglicherweise zu viel in die 3a ein und würde es hier nicht merken.
- **AHV-Beitragspflicht nach Pensionierung:** Wer als Selbständiger mit 62 aufhört zu arbeiten, muss bis 65 weiterhin AHV-Beiträge als Nichterwerbstätiger zahlen (Mindestbeitrag CHF 530/Jahr, aber bei Vermögen wie Marcos eher CHF 3'000–8'000/Jahr). Dieser Posten fehlt komplett in der Kostenplanung.

### B) Schwankendes Einkommen – ein Eingabefeld, keine Lösung
Das Jahreseinkommensfeld kennt nur eine Zahl. Bei Marco schwankt das Einkommen zwischen CHF 95'000 und CHF 130'000. Was gibt er ein? Den Durchschnitt? Das bessere Jahr? Das schlechtere Jahr? Das Tool gibt keinen Hinweis.

Das hat konkrete Auswirkungen: Die AHV-Rente wird auf Basis des **massgebenden Durchschnittseinkommens** über alle Beitragsjahre berechnet – nicht auf Basis des aktuellen Jahres. Wer CHF 110'000 eingibt, aber in schlechten Jahren CHF 95'000 verdient hat, bekommt eine zu optimistische Projektion.

### C) Firmenwert und Nachfolge – inexistent
Die Schreinerei ist Marcos grösstes Asset neben dem Haus. Ein Verkauf oder eine geordnete Nachfolge (interner Verkauf an Lehrling, externer Käufer, MBO) könnte CHF 150'000–300'000 einbringen – sein fehlendes PK-Kapital.

Das Tool hat kein Eingabefeld dafür. Nirgendwo. Nicht unter "Freies Vermögen", nicht als eigene Kategorie, nicht einmal als Texthinweis: "Haben Sie einen Betrieb, den Sie verkaufen möchten?" Das Thema Firmennachfolge – für Hunderttausende Selbständige der zentrale Vorsorgebaustein – existiert in WealthWise nicht.

### D) Überbrückungszeit 62–65 ohne PK ist ein blinder Fleck
Marco will mit 62 aufhören. AHV-Rente beginnt frühestens mit Vorbezug ab 63 (oder 62 nach AHV 21-Reform Frau, aber für Männer ab 63). Zwischen 62 und Rentenbeginn braucht er eine Überbrückung. Die Überbrückungsrente aus der PK, die das Tool für Angestellte anzeigt, existiert für Marco nicht. Das Tool erkennt diese spezifische Lücke nicht und schlägt keine alternative Überbrückungsstrategie vor (3a-Bezug gestaffelt, Wertschriften-Entnahme, etc.).

---

## 3. Fehlende Features für Selbständige

| Feature | Aktueller Stand | Was fehlt |
|---------|----------------|-----------|
| Selbständig-Kennzeichnung | Kein Feld | Toggle: "Selbständig erwerbend" mit Folgelogik |
| Schwankendes Einkommen | Ein statisches Feld | Min/Max/Durchschnitt oder "Bandbreite"-Eingabe |
| Firmenwert erfassen | Kein Feld | Kategorie "Unternehmenswert (geschätzt)" im Vermögen |
| Nachfolge-Planung | Nicht erwähnt | Hinweis + Schätzfeld "Erwarteter Verkaufserlös Firma" |
| 3a-Prüfung 20%-Regel | Nicht geprüft | Warnung wenn 20% Nettoeinkommen < CHF 36'288 |
| AHV-Beitragssatz SE | Nicht unterschieden | Automatisch tiefere Rente bei Selbständigen |
| Freiwillige PK (Auffangeinrichtung) | 1 Satz Hinweis | Kostenbeispiel, Rentenwirkung, Empfehlung mit Alter |
| AHV-Beitragspflicht nach Pension | Nicht erfasst | Als Ausgabenposten 62–65 ausweisen |
| Betriebliche KK (Prämienverbilligung SE) | Nicht erfasst | Keine Familienprämien-Logik |

---

## 4. Wo fühlt sich Marco nicht abgeholt?

### Landing: "Für Personen von 50–65 Jahren · Kostenlos · In 10 Minuten"
Marco liest das und denkt: "Passt." Er sieht keine roten Fahnen. Die Testimonials zeigen Markus, Susanne, Thomas – alles Angestellte. Kein einziger Selbständiger, kein Handwerker, kein KMU-Inhaber. Marco scrollt weiter. Der Satz "Basierend auf offiziellen AHV/BVG-Kennzahlen 2026" beruhigt ihn: "Klingt seriös." Er klickt auf "Jetzt Analyse starten" – ohne zu wissen, dass das Tool ihn eigentlich nicht kennt.

### Screen 2, PK-Toggle: Der entwürdigendste Moment
Marco klickt auf "Ich habe eine Pensionskasse" – und schaltet sie aus. Darunter erscheint: *"Ohne PK ist das 3a-Maximum höher (CHF 36'288/Jahr statt CHF 7'258). Sie können sich auch freiwillig bei der Auffangeinrichtung versichern."*

Das ist der einzige Moment im ganzen Tool, in dem Marcos Situation angesprochen wird. **Ein Satz. Zwei Informationen.** Für einen Mann, der 18 Jahre lang jeden Monat schlechter gestellt war als seine Angestellten – keine Lohnfortzahlung durch die PK, kein Umwandlungssatz, kein Arbeitgeberanteil – ist das eine Erwähnung am Rande, kein Moment der Anerkennung.

### Screen 2, Vermögen: Der Firmenwert hat keinen Platz
Marco tippt "Freies Vermögen": CHF 105'000 (Sparkonto + Wertschriften). Dann denkt er: *"Und die Schreinerei? Soll ich die hier reinschreiben?"* Er weiss nicht, wo. Unter "Freies Vermögen"? Das ist kein Barvermögen. Er lässt es weg. Damit fehlen CHF 150'000–200'000 in der Berechnung – sein grösster Trumpf für die Altersvorsorge wird ignoriert.

### Screen 4, Immobilien-Hinweis: Das Haus zählt nicht
Nach langer Analyse erscheint ein blauer Infokasten:
*"Ihre Immobilie (Verkehrswert CHF 850'000) ist NICHT als liquides Vermögen berücksichtigt. Sie könnten diese theoretisch verkaufen oder eine Umkehrhypothek prüfen."*

Marco liest das und wird ärgerlich. Das Haus IST seine Sicherheit. "Theoretisch verkaufen" klingt wie ein Witz. Er hat die Hälfte seines Lebens dafür gearbeitet. Die Umkehrhypothek – ein legitimes Instrument für seine Situation – wird in einem Nebensatz erwähnt, ohne jede Erklärung, was das ist oder kostet.

### Screen 4, Empfehlungen: Fast alle passen nicht
Die Handlungsempfehlungen werden generiert, ohne zu wissen, dass Marco Selbständiger ist:
- **"PK-Einkauf erwägen"** – er hat keine PK. Die Empfehlung ist wertlos.
- **"3a maximieren"** – er macht das seit 12 Jahren. Ebenfalls wertlos.
- **"AHV-Lücken schliessen"** – er hat keine Lücken. Nicht relevant.

Die einzige Empfehlung, die für Marco sinnvoll wäre – "Prüfen Sie den Beitritt zur Auffangeinrichtung BVG" oder "Planen Sie die Nachfolge Ihres Betriebs als Alterskapital" – erscheint nirgendwo.

---

## 5. Emotionale Reaktion auf das Ergebnis

Marco öffnet Screen 4. Die Zahlen laden. Er sieht die Vorsorgelücke.

**Was er vermutlich sieht:** AHV-Rente ~CHF 2'100/Monat (Vorbezug ab 63 mit Faktor 0.864, Durchschnittseinkommen CHF 110'000). Keine PK-Rente. 3a-Kapital CHF 120'000 gestaffelt über die Überbrückungszeit. Freies Vermögen CHF 105'000. Monatliche Ausgaben CHF 7'000–8'000 (Haushalt Paar mit Haus).

**Monatliche Lücke:** ~CHF 4'500–5'000/Monat. Das Vermögen reicht vielleicht bis Alter 72–74.

Marco sitzt vor dem Bildschirm und denkt: *"Das hab ich mir irgendwie gedacht."* Es ist keine Überraschung – aber es in Zahlen zu sehen, macht es real. Er ist nicht schockiert. Er ist bestätigt und gleichzeitig gelähmt. "Was soll ich jetzt damit?" ist seine unmittelbare Reaktion. Das Tool hat eine Lücke gezeigt – aber für seine spezifische Situation (keine PK, Selbständiger, Firmenwert) hat es keinen einzigen konkreten nächsten Schritt parat, den er morgen früh gehen könnte.

Und dann fällt ihm auf: Das Haus, die Schreinerei, Lauras PK – das alles steckt entweder nicht richtig in der Berechnung oder gar nicht. Das Ergebnis stimmt wahrscheinlich noch nicht einmal.

| Moment | Reaktion | Begründung |
|--------|----------|------------|
| Landing, Hero-Werte | ~ Neutral | CHF 7'850 wirkt hoch, aber er klickt trotzdem weiter |
| Screen 1, Einkommensfeld | — Unsicherheit | "Was gebe ich ein – 95k? 110k? 130k?" |
| Screen 1, kein Selbständig-Toggle | — Verwirrung | "Bin ich hier richtig?" |
| Screen 2, PK Toggle OFF | — Scham / Schuld | Jahrelanges Schuldgefühl wird reaktiviert |
| Screen 2, Auffangeinrichtung-Hinweis | ~ Neutral | Einzeiler ohne Substanz |
| Screen 2, kein Firmenwert-Feld | — Frustration | "Mein grösster Wert fehlt" |
| Screen 3, Ausgabenerfassung | — Verwirrung | Privat/Firma nicht trennbar |
| Screen 4, Lücke sichtbar | — Bestätigung des Befürchteten | Nicht schockiert, aber gelähmt |
| Screen 4, Haus "nicht liquide" | — Ärger | "Dann was bringt es mir?" |
| Screen 4, PK-Einkauf-Empfehlung | — Frustration | "Ich hab doch gar keine PK!" |
| Chat, Selbständige-Frage | — Enttäuschung | Generische Antwort statt konkreter Hilfe |

---

## 6. Was müsste WealthWise für Selbständige anders machen?

### 6.1 Pflicht-Feld: Erwerbsstatus
Beim Start oder in Screen 1: "Sind Sie angestellt oder selbständig erwerbend?" Wenn selbständig: eigener Eingabeblock mit:
- Einkommensbereich (Min/Max/Durchschnitt letzte 3 Jahre)
- Hinweis: AHV-Rente wird auf Basis des massgebenden Durchschnittseinkommens berechnet
- Automatische Prüfung: 20%-Regel für 3a-Maximum

### 6.2 Vermögenskategorie "Unternehmenswert"
Neues Feld unter Vermögen: "Haben Sie einen Betrieb, den Sie veräussern möchten? (Geschätzter Verkaufserlös netto nach Steuern)". Mit kurzem Hinweis: "Betriebsverkäufe sind komplex – der Nettoerlös nach Steuern ist das entscheidende Mass. Lassen Sie diesen Betrag durch eine Fachperson schätzen."

### 6.3 Freiwillige BVG-Versicherung konkret
Statt eines Einzeilers: Ein aufklappbarer Block wenn `hasPK = false`:
- Was ist die Auffangeinrichtung BVG?
- Beispielrechnung: Beitritt mit 54, Einzahlung bis 65, Rentenresultat
- Wichtig: Erst ab Alter X lohnt sich der Beitritt noch, danach nicht mehr
- Link: bvgauffangeinrichtung.ch

### 6.4 Firmennachfolge als Lebensplanung-Event in Screen 3
In der Lebensplanung (Screen 3) unter "Einnahmen / besondere Ereignisse": Option "Verkauf / Übergabe meines Unternehmens" mit:
- Geschätzter Nettoerlös
- Geplantes Jahr
- Hinweis Steuerfolgen (Liquidationsgewinn, AHV-Beitrag auf Liquidationsgewinn)

### 6.5 AHV-Beitragspflicht nach Pensionierung
Wenn Rentenalter < 65 und `selbständig = true`: Warnung mit Kostenbeispiel: "Als frühpensionierter Selbständiger sind Sie bis 65 AHV-beitragspflichtig (Nichterwerbstätiger). Basis: Vermögen + Rente. Grössenordnung: CHF 3'000–8'000/Jahr."

### 6.6 Überbrückungsrente ohne PK sichtbar machen
Wenn keine PK vorhanden und Rentenalter < 63: konkreter Block "Wie überbrücken Sie die Zeit bis zur AHV?" mit Auflistung der Instrumente: gestaffelter 3a-Bezug, Wertschriften-Entnahme, Verkauf Betrieb, Umkehrhypothek.

### 6.7 Empfehlungen nach Erwerbsstatus filtern
PK-Einkauf-Empfehlung nur anzeigen wenn `hasPK = true`. Ersatz-Empfehlung für Selbständige ohne PK: "Prüfen Sie den freiwilligen Beitritt zur BVG-Auffangeinrichtung" (mit Schwellenwert: macht Sinn bis ca. Alter 58).

---

## 7. Zitat: Was sagt Marco zu Laura beim Abendessen?

> "Laura, ich hab das Tool gemacht, das du mir geschickt hast. Es zeigt eine grosse Lücke, das wusstest du ja schon. Aber das Problem ist: Das Tool kennt mich nicht wirklich. Meine Schreinerei gibt's da gar nicht – die hab ich nicht mal eingeben können. Und das Haus zählt auch nicht. Was mich überrascht hat: Wenn wir die Hälfte meines Einkommens als AHV betrachten, kriege ich gar nicht so viel weniger Rente wie ich dachte – weil ich ja immer eingezahlt habe. Aber von 62 bis 63 hänge ich in der Luft, das ist mir jetzt klar. Weisst du was? Ich muss das mit jemandem besprechen, der versteht was eine Schreinerei ist. Keine Bank, keinen Versicherungsverkäufer. Irgendeinen Treuhänder oder KMU-Berater. Und ich muss endlich die Nachfolge angehen – nicht wegen des Tools, sondern weil ich's jetzt in Zahlen gesehen habe."

---

## 8. Konkreter Handlungsbedarf den das Tool aufzeigen sollte

Für Marcos Profil – Selbständiger, keine PK, Eigentum, Firmenwert, Rentenalter 62–63 – wären folgende Handlungsempfehlungen zentral. Das Tool zeigt aktuell keine davon:

### Sofort (Alter 54)
1. **3a-Beitrag prüfen:** Wenn Nettoeinkommen nach AHV/IV/EO < CHF 181'440, ist das Maximum < CHF 36'288. Rückwirkende Korrekturen sind nicht möglich, aber zukünftige Überzahlungen vermeiden.
2. **Freiwillige BVG-Auffangeinrichtung prüfen:** Mit 54 besteht noch ~11 Jahre Einzahlungszeit. Selbst ein mittlerer Beitrag ergibt nennenswerte Rentenansprüche und senkt die Steuerprogression.
3. **Treuhänder für Firmenbewertung mandatieren:** Welchen Verkehrswert hat die Schreinerei heute? Was ist ein realistischer Verkaufserlös nach Steuern?

### Kurzfristig (1–2 Jahre)
4. **Nachfolge-Optionen erkunden:** Lehre Nachfolger (interner Kauf), externer Käufer, Branchenverband Schreinermeister. Verkaufshorizont 60–62 gibt ~6–8 Jahre Vorlaufzeit – gerade genug.
5. **Überbrückungsplan 62–65:** Gestaffelter 3a-Bezug in 3 Steuerjahren (je ~CHF 40'000), ergänzt durch Wertschriften-Entnahme. Konkrete Zahl: Wie viel brauche ich pro Monat von 62 bis 63 (AHV-Vorbezug)?
6. **Amortisation planen:** Hypothek muss bis 65 auf 2/3 von CHF 850'000 = CHF 567'000 reduziert sein. Aktuell CHF 420'000 – bereits darunter. Kein Handlungsdruck, aber Bestätigung gut.

### Mittelfristig (3–5 Jahre)
7. **Umkehrhypothek evaluieren:** Im Alter 65–70, wenn Liquidität sinkt und Haus schuldenfrei ist, kann eine Umkehrhypothek CHF 500–1'500/Monat zusätzlich generieren. Heute noch nicht handeln, aber informieren.
8. **AHV-Vorbezug vs. Aufschub durchrechnen:** Für Marco mit 62-Ziel: AHV frühestens mit Vorbezug ab 63 (Faktor 0.864). 2 Jahre Vorbezug = lebenslang ~13.6% weniger Rente. Bei tiefem PK-Kapital zählt jeder Franken Rente mehr als Kapital.

---

*Erstellt als UX-Testperson-Review im Rahmen der WealthWise-Produktentwicklung. Alle Personen und Situationen sind fiktiv; inhaltliche Beobachtungen und Berechnungsbeispiele basieren auf dem tatsächlichen Funktionsumfang der Applikation (Stand Mai 2026) sowie den offiziellen AHV/BVG-Kennzahlen 2025.*
