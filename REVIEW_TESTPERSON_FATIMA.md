# UX-Review: Fatima Yilmaz (57), Schlieren ZH
**Reinigungsfachfrau, Einwanderin aus der Türkei, Mieterin, kein 3a, komplexe AHV-Situation**

---

## 1. Zusammenfassung als Fatima (in einfacher Sprache, wie sie denkt)

Ich habe die Website geöffnet und gedacht: "Das ist für die Schweizer, nicht für mich." Die Sprache ist schwierig – "Umwandlungssatz", "Kapitalbezug", "Staffelung" – ich kenne diese Wörter nicht. Das Tool hat gezeigt dass wir eine grosse Lücke haben, und ich habe Angst bekommen. Aber dann – ich glaube – das Tool sagt wir haben vielleicht Anspruch auf Ergänzungsleistungen, und ich wusste nicht was das ist, und ich dachte das ist etwas Schlechtes wie Sozialhilfe. Mein Mann Mehmet hat gesagt "Das brauchen wir nicht" und hat das Fenster zugemacht – aber ich glaube wir sollten mehr fragen.

---

## 2. Spezifische Probleme für Migrantinnen und Migranten

### 2a – Das Tool rechnet AHV ab Alter 21 – für Einwanderer falsch

Das Tool berechnet automatisch: `Pensionierungsalter (65) - 21 = 44 Beitragsjahre`. Für Mehmet ist das **falsch**. Er ist mit 25 eingewandert. Er hat maximal 40 Schweizer Beitragsjahre (Alter 25–65). Das Tool überschätzt seine AHV-Rente systemisch.

Kein Eingabefeld "Einwanderungsjahr" oder "Ab wann in der Schweiz AHV-pflichtig?" existiert. Mehmet müsste die Differenz (4 Jahre) manuell als "Beitragslücken" eintragen – aber das ist intuitiv falsch (es sind keine Lücken, er war einfach nicht in der Schweiz).

**Fehler im Code:** `autoYears = Math.min(44, Math.max(0, retireAge - 21))` in `Screen2.tsx:269`  
Für Einwanderer korrekt wäre: `autoYears = Math.min(44, retirementAge - immigrationAge)`

### 2b – Sozialversicherungsabkommen Schweiz–Türkei: Das Tool weiss es nicht

Die Schweiz hat seit 1969 ein Sozialversicherungsabkommen mit der Türkei. Mehmets türkische Beitragsjahre (Alter 21–25, 4 Jahre) können für die **Leistungsvoraussetzungen** angerechnet werden (Anspruchsberechtigung). Das bedeutet:
- Mehmet hat de facto 44 anrechenbare Jahre (40 CH + 4 TR)
- Die Rente berechnet sich aber nur auf den CH-Beitragsjahren (keine Totalisierung der Einkommen)
- Das Tool behandelt ihn wie einen Schweizer ohne Auslandsjahre – beides falsch

**WealthWise kennt dieses Abkommen nicht.** Kein Hinweis, kein Feld, keine Erklärung.

### 2c – Beitragsbefreiung der nichterwerbstätigen Ehefrau: Das Tool kennt sie nicht

Fatima war 1994–2001 (7 Jahre) nicht oder kaum erwerbstätig. Das klingt nach Beitragslücken. **Aber:** Als verheiratete Frau ist sie **beitragsbefreit**, wenn ihr Ehemann mindestens den doppelten Mindestbeitrag (CHF 1'007 × 2 = CHF 2'014 pro Jahr in 2026, entsprechend den Werten der 1990er-Jahre) entrichtet hat. Mehmet hat als Logistiker immer über diesem Minimum verdient.

**Das Tool behandelt Fatimas 7 Jahre als Lücken.** Es empfiehlt ihr, Beiträge nachzuzahlen oder die Rente wird entsprechend gekürzt dargestellt. **In Wirklichkeit hat sie möglicherweise gar keine Lücken.** Das ist ein gravierender Fehler, der Fatima unnötig Angst macht.

### 2d – Ausländische Rentenansprüche: Kein Feld

Mehmet hat 4 Jahre in der Türkei gearbeitet und dort möglicherweise Beiträge an das türkische Sozialversicherungssystem (SGK) geleistet. Er könnte Anspruch auf eine bescheidene türkische Rente haben. Das Tool fragt nicht danach. Für Fatimas Generation (Einwanderer 1990er) ist das relevant.

### 2e – Erziehungsgutschriften für die Kinderjahre werden nicht aktiv erklärt

Fatima hat 3 Kinder. Sie war während der Kinderjahre nichterwerbstätig. Erziehungsgutschriften (CHF 44'100/Jahr für Kinder unter 16, hälftig bei Ehepaaren) könnten ihre AHV-Rente erheblich erhöhen. Das Tool hat ein Feld dafür (Screen 2), aber Fatima findet es nicht aktiv – es ist versteckt unter einem optionalen Block. Sie wird es nie entdecken ohne Hinweis.

---

## 3. Fehlendes Wissen das das Tool vermitteln sollte

| Thema | Was das Tool zeigt | Was es zeigen sollte |
|---|---|---|
| Beitragsbefreiung Ehefrau | "7 Beitragslücken" | "Als verheiratete Frau mit erwerbstätigem Mann: Prüfen Sie ob Sie beitragsbefreit waren – keine Lücken!" |
| SVA Schweiz-Türkei | Nichts | "CH hat Abkommen mit der Türkei: Türkische Beitragsjahre können für Anspruchsberechtigung angerechnet werden." |
| Ergänzungsleistungen | EL-Block vorhanden | EL klarer erklären: "Das ist KEIN Almosen. Das ist Ihr gesetzliches Recht. Jede 5. Rentnerin in der Schweiz bezieht EL." |
| Prämienverbilligung nach Pension | Kurzer IPV-Hinweis in Screen 3 | "Als Rentnerin mit tiefem Einkommen haben Sie Anspruch auf Prämienverbilligung. Sie wird nach Pensionierung oft HÖHER." |
| Türkische Rente | Nichts | Feld für "Ausländische Rentenansprüche" |
| Erziehungsgutschriften | Versteckter Block | Aktiver Hinweis wenn Kinder vorhanden |
| Einwanderungsjahr | Nichts | Feld "Ab wann in der Schweiz?" für korrekte AHV-Jahresberechnung |
| AHV-Kinderrente | Nichts | Wenn jüngstes Kind in Ausbildung: "Mehmet erhält ab 65 AHV-Kinderrente für Sohn (CHF 504/Mt.)" |

---

## 4. Sprachliche Hürden – Welche Begriffe versteht Fatima nicht?

**Fatima versteht diese Begriffe NICHT ohne Erklärung:**

- **"Umwandlungssatz"** – Kein alltagssprachlicher Begriff. Sie liest 5.6% und weiss nicht, was das bedeutet.
- **"Überbrückungsrente"** – Klingt nach etwas Technischem. Sie assoziiert "Brücke" aber nicht finanziell.
- **"Kapitalbezug"** – Was bedeutet das genau? Ist das ihr Geld oder das der Bank?
- **"Staffelung"** – Vollkommen unklar. Staffel wie Treppenstufe?
- **"Säule 3a"** – Sie hat gehört davon, aber nicht verstanden. "Warum heisst das Säule?"
- **"Koordinationsabzug"** – Unverständlich ohne Schweizer Sozialversicherungshintergrund.
- **"Freizügigkeitsguthaben"** – Zu lang, zu komplex.
- **"Plafonierung"** – Französisches Lehnwort, null verständlich.
- **"ELG"** (Ergänzungsleistungsgesetz) – Abkürzung ohne Bedeutung.
- **"Nachhaltigkeits-Score"** – Score 57? Ist das gut oder schlecht?

**Fatima versteht sofort:**
- CHF-Beträge und Prozentzahlen
- "Rente" (kennt das Wort)
- "AHV" (kennt das Kürzel, ungefähre Bedeutung)
- "Pensionskasse" (weiss es gibt so etwas)

**InfoTooltips helfen nicht** wenn Fatima den Begriff selbst nicht als klickwürdig erkennt oder sie nur kurze Texte auf dem Handy liest.

---

## 5. Wo fühlt sich Fatima ausgegrenzt oder beschämt?

### Beim Einkommen eingeben
CHF 42'000. Daneben sieht sie das Ergebnis. Es ist wenig. Die Vergleichszahl auf der Landing Page war "CHF 2'000–5'500 monatliche Rente" – das schien erreichbar. Ihr Ergebnis: deutlich tiefer. Erster Moment: "Ich hab es falsch gemacht." Zweiter Moment: "Das ist mein Leben."

### Beim PK-Wert eingeben
CHF 95'000. Das Feld zeigt direkt: "Das Guthaben liegt unter CHF 100'000 – mögliche Gründe: Teilzeitarbeit, späte Einwanderung, Scheidung." Dieser Hinweis ist sachlich korrekt, aber **er nennt ihre Geschichte als Problem**. Fatima fühlt sich ertappt.

### Beim 3a-Feld
Kein 3a. Nichts einzutragen. Das Tool sagt nichts Tröstliches. Es gibt keine Empfehlung die für sie realistisch ist ("Starten Sie jetzt mit CHF 100/Monat"). Stattdessen: PK-Einkauf, 3a-Staffelung, Kapitalbezug-Optimierung. Alles Dinge für Menschen mit Geld.

### Bei der Ergebnis-Seite (Screen 4)
Das Ergebnis zeigt eine Lücke. Der Score ist tief. Die Empfehlungen lauten "PK-Einkauf", "3a erhöhen", "Kapitalbezug optimieren". **Alle Empfehlungen setzen Kapital voraus das Fatima und Mehmet nicht haben.** Es ist wie wenn man jemandem mit leerem Kühlschrank empfiehlt, ein besseres Rezept zu kochen.

### Das Wort "Ergänzungsleistungen"
Mehmet liest: "Ergänzungsleistungen". Er sagt: "Das ist Sozialhilfe. Das brauchen wir nicht." Fatima schweigt. **Das Tool erklärt zu wenig, dass EL ein gesetzlicher Anspruch und keine Schande sind.** Jede fünfte Rentnerin in der Schweiz bezieht EL.

---

## 6. Was müsste WealthWise für Personen mit Migrationshintergrund anders machen?

### #1 – Feld "Ab wann in der Schweiz AHV-pflichtig?"
Statt `retireAge - 21` für alle: Ein optionales Feld "Einzug in die Schweiz (Jahr)" oder "Erste AHV-Beiträge in der Schweiz (Jahr)". Das würde Mehmets AHV korrekt auf 40 Jahre setzen und gleichzeitig den Abkommen-Hinweis auslösen.

### #2 – Abkommen-Hinweis bei <44 Beitragsjahren + Ausland-Hinweis
Wenn `ahvContributionYears < 44 AND gap > 0`: Aktiver Hinweis: "Haben Sie vorher im Ausland gearbeitet? Die Schweiz hat Sozialversicherungsabkommen mit über 40 Ländern – Ihre ausländischen Beitragsjahre könnten für den Rentenanspruch anrechenbar sein. Mehr Info: www.ahv-iv.ch/de/Sozialversicherungen/Abkommen."

### #3 – Beitragsbefreiung Ehefrau aktiv ansprechen
Wenn `civil === 'verheiratet' && hasPartner && gaps > 0 && p2.income > 0`: Info: "Als nichterwerbstätige verheiratete Frau können Sie beitragsbefreit gewesen sein wenn Ihr Ehemann den doppelten Mindestbeitrag entrichtet hat. Bitte Ihren IK-Auszug bestellen und prüfen – die 'Lücken' sind möglicherweise keine."

### #4 – EL-Framing ändern: Rechtsanspruch, keine Sozialhilfe
Den EL-Block mit klarerem Einstieg: "**Gut zu wissen:** In der Schweiz hat jede 5. Rentnerin Anspruch auf Ergänzungsleistungen. Das ist kein Almosen – es ist ein gesetzlicher Anspruch (wie AHV), den Sie durch Einzahlungen erworben haben. Auch Eingewanderte haben diesen Anspruch." Mit Verweis auf www.ahv-iv.ch/el.

### #5 – Empfehlungen nach Vermögenssituation filtern
Wenn `freeAssets < 50'000 && balance3a === 0 && !hasPK_optional_einkauf`: Keine Empfehlung für PK-Einkauf oder 3a-Staffelung zeigen. Stattdessen: realistische Alternativen für tiefes Einkommen (EL-Anspruch, IPV nach Pension, AHV-Aufschub-Bonus, Wohnbaugenossenschaften, IV-Prüfung).

### #6 – Ausländische Rentenansprüche
Optionales Feld: "Ausländische Rentenansprüche (CHF/Monat, geschätzt):" mit Hinweis: "Falls Sie im Ausland gearbeitet haben, können Sie möglicherweise eine ausländische Rente beantragen. Diese ergänzt Ihre Schweizer Rente."

### #7 – Einfachere Sprache für technische Begriffe
Glossar-Button auf jedem Screen: Beim ersten Klick auf "Umwandlungssatz" ein kurzer Erklärungs-Tooltip in einfacher Sprache: "Der Umwandlungssatz sagt: Für jede CHF 100'000 in Ihrer Pensionskasse bekommen Sie CHF XX pro Monat Rente. Je höher, desto besser für Sie."

### #8 – AHV-Kinderrente für Kinder in Ausbildung
Wenn `children.length > 0 && children.some(c => altersBerechnung(c) >= 18 && altersBerechnung(c) <= 25)`: "AHV-Kinderrente: Wenn Ihr jüngstes Kind noch in Ausbildung ist wenn Sie AHV beziehen, erhalten Sie eine AHV-Kinderrente von max. CHF 504/Monat."

---

## 7. Emotionale Reaktion auf das Ergebnis

**Beim Öffnen von Screen 4:**
Fatima sieht den Score: 34/100. Rot. "Kritisch." Sie sieht die Lücke. Mehmet schweigt eine Sekunde. Dann: "Das ist falsch. Wir haben doch immer gearbeitet." Fatima sagt nichts, aber sie denkt: "Ich war schuld. Ich habe zu wenig gearbeitet, zu wenig eingezahlt."

**Beim Scrollen durch die Empfehlungen:**
"PK-Einkauf." "3a maximieren." "Kapitalbezug optimieren." Mehmet: "Was ist das alles? Wir haben kein Geld für solche Sachen." Fatima hört auf zu scrollen.

**Beim EL-Block:**
Fatima liest: "Ergänzungsleistungen". Mehmet: "Nein. Das brauchen wir nicht. Das ist für Leute die nichts können." Das Fenster wird kleiner geklickt. Die Information die ihr Leben verändern könnte, wird weggeklickt – weil das Framing nicht stimmt.

**Am Abend:**
Fatima denkt nochmals daran. Sie öffnet das Tool auf dem Handy. Schaut nochmals. Zeigt es ihrer Tochter per Screenshot auf WhatsApp.

---

## 8. Die EINE Information die Fatimas Leben verändern könnte

**Die Beitragsbefreiung als verheiratete nichterwerbstätige Frau.**

Fatima glaubt sie hat 7 Jahre Beitragslücken. Sie schämt sich. Sie denkt ihre Rente ist dauerhaft reduziert wegen dieser Jahre als Mutter zuhause.

Die Wahrheit: Weil Mehmet die ganze Zeit erwerbstätig war und AHV-Beiträge gezahlt hat (weit über dem doppelten Mindestbeitrag), war Fatima **beitragsbefreit**. Sie hat **keine** AHV-Lücken aus diesen Jahren. Ihre AHV-Rente könnte deutlich höher sein als das Tool anzeigt.

Wenn das Tool diesen Hinweis aktiv geben würde – "Prüfen Sie Ihren IK-Auszug, möglicherweise keine Lücken" – würde Fatima aufatmen. Sie würde die SVA anrufen. Vielleicht würde sich herausstellen: keine Lücken, bessere Rente als gedacht, kein EL-Anspruch nötig. Oder: EL-Anspruch bestätigt, aber ohne Scham.

**Knapp dahinter: Die EL-Information.** Fatima und Mehmet haben möglicherweise nach Pensionierung Anspruch auf CHF 400–900/Monat EL. Das ist mehr als ein 13. AHV-Monat. Das ist existenzielle Sicherheit. Aber das Tool muss es so erklären, dass Mehmet nicht das Fenster zuklappt.

---

## 9. Zitat: Was sagt Fatima zu ihrer Tochter am Telefon?

> "Zeynep, ich habe dieses Internet-Tool gemacht für die Rente. Es sagt dass wir zu wenig haben. Aber ich verstehe nicht alles. Kannst du es anschauen? Da steht etwas mit Ergänzungsleistungen – Baba sagt das brauchen wir nicht, aber ich glaube vielleicht schon. Und da steht ich habe Lücken bei der AHV weil ich zuhause war mit euch – ist das schlimm? Kann man das reparieren? Das Tool ist auf Deutsch und es gibt Wörter die ich nicht verstehe. Kannst du kommen am Wochenende?"

---

## 10. Empfehlung: Ist WealthWise für Personen mit tiefem Einkommen und Migrationshintergrund geeignet?

**Ehrliche Antwort: Teilweise – mit erheblichen Lücken.**

### Was funktioniert
- Zwei-Personen-Erfassung (Fatima + Mehmet) funktioniert technisch
- AHV-Plafonierung für Ehepaare korrekt berechnet
- EL-Block ist vorhanden und nicht versteckt
- Erziehungsgutschriften sind theoretisch erfassbar
- Prämienverbilligung wird erwähnt

### Was nicht funktioniert
- **Kein Feld für Einwanderungsjahr** → AHV für Mehmet systematisch falsch berechnet
- **Keine Abkommen-Information** → wertvolles Wissen fehlt komplett
- **Keine Beitragsbefreiungsregel** → Fatima wird falsch als "Lücken-Person" behandelt
- **Fachsprache unverständlich** → Fatima kann die Empfehlungen nicht umsetzen
- **Empfehlungen unrealistisch** → PK-Einkauf für jemanden mit CHF 28'000 Ersparnissen
- **EL-Framing falsch** → Mehmet klappt das Fenster zu
- **Keine ausländischen Rentenfelder** → Mehmets potenzielle türkische Rente unsichtbar

### Fazit
WealthWise ist ein ausgezeichnetes Tool für gut verdienende, deutschsprachige Schweizer in der Mitte der Einkommensverteilung. Für Fatima – Einwanderin, tiefes Einkommen, keine 3a, komplexe AHV-Geschichte – ist es **benutzbar aber gefährlich**: Es zeigt falsche Lücken, gibt unrealistische Empfehlungen, und das wertvollste Sicherheitsnetz (EL) wird vom Ehemann weggeblinzelt weil das Framing stimmt nicht.

**Würde Fatima das Tool einer Freundin empfehlen?** Ja, aber mit dem Satz: "Lass deine Tochter dabei sitzen."

**Was müsste sich ändern damit es für Fatima wirklich nützlich ist:** Einwanderungsfeld, Abkommen-Hinweis, Beitragsbefreiungsregel, EL-Framing als Rechtsanspruch, einfachere Sprache, und Empfehlungen die zu tiefen Einkommen passen. Mit diesen Änderungen würde WealthWise für eine der verletzlichsten Gruppen – Eingewanderte Frauen mit Teilzeitkarriere – zu einem lebensverändernden Tool.
