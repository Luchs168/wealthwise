const { useState, useEffect, useMemo, useRef } = React;
const useAnsprache = window.useAnsprache || (() => ({ isPaar: false, t: (du) => du }));

/* ---------- Helpers ---------- */
const fmtCHF = (n) => {
  if (n == null || isNaN(n)) return "0";
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(Math.round(n));
};
const parseNum = (s) => {
  const n = Number(String(s).replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
};

/* ---------- Icons ---------- */
const Icon = {
  Check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="5 12 10 17 19 7"/></svg>,
  Arrow: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>,
  ArrowLeft: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/></svg>,
  Info: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8.01"/></svg>,
  Bolt: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  List: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg>,
  Plus: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
};

/* ---------- BFS-Kategorien ---------- */
const CATEGORIES = [
  { key: "wohnen", label: "Wohnen & Energie", emoji: "🏠", hint: "Miete oder Hypothekarzins, Nebenkosten, Strom, Heizung", change: 1.0 },
  { key: "lebensmittel", label: "Lebensmittel & Haushalt", emoji: "🛒", hint: "Einkäufe, Getränke, Reinigung, Haushaltartikel", change: 1.0 },
  { key: "mobilitaet", label: "Mobilität & Verkehr", emoji: "🚗", hint: "Auto (Leasing, Benzin, Versicherung, Parking), ÖV-Abos, Velo", change: 0.7 },
  { key: "gesundheit", label: "Gesundheit & Versicherungen", emoji: "🏥", hint: "Krankenkasse, Zusatzversicherungen, Zahnarzt, Selbstbehalte", change: 1.2 },
  { key: "freizeit", label: "Freizeit & Kultur", emoji: "🎭", hint: "Hobbys, Sport, Ausgang, Streaming, Bücher, Vereine", change: 1.3 },
  { key: "ferien", label: "Ferien & Reisen", emoji: "✈️", hint: "Ferien, Kurztrips, Übernachtungen (monatlicher Durchschnitt)", change: 1.2 },
  { key: "kleidung", label: "Kleidung & persönlicher Bedarf", emoji: "👔", hint: "Kleidung, Schuhe, Körperpflege, Coiffeur", change: 0.7 },
  { key: "kommunikation", label: "Kommunikation & Medien", emoji: "📱", hint: "Handy, Internet, TV, Zeitungen", change: 1.0 },
  { key: "auswaertsEssen", label: "Auswärts essen & Ausgehen", emoji: "🍽️", hint: "Restaurants, Take-away, Kantine, Café, Bars", change: 0.6 },
  { key: "bildung", label: "Bildung & Kinder", emoji: "📚", hint: "Kurse, Weiterbildung, Schulmaterial, Betreuung", change: 0.3, optional: true },
  { key: "steuern", label: "Steuern", emoji: "💰", hint: "Bundes-, Kantons- und Gemeindesteuern (monatlicher Durchschnitt). Tipp: Letzte Steuerrechnung / 12.", change: 0.65 },
  { key: "sonstiges", label: "Sonstiges", emoji: "🔄", hint: "Geschenke, Spenden, Haustiere, Unvorhergesehenes", change: 1.0 },
];

/* ---------- Top Bar / Progress ---------- */
function TopBar() {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">W</div>
        <span>WealthWise</span>
        <span style={{ color: "var(--ink-300)", margin: "0 4px" }}>/</span>
        <span style={{ color: "var(--ink-500)", fontWeight: 500, fontSize: 14 }}>Vorsorgeplanung</span>
      </div>
      <div className="top-actions">
        <span className="top-save">Automatisch gespeichert</span>
        <a href="WealthWise - Screen 1 Situation.html">Hilfe</a>
        <a href="#">Abmelden</a>
      </div>
    </header>
  );
}

function ProgressBar({ current = 3 }) {
  const steps = [
    { n: 1, label: "Situation" },
    { n: 2, label: "Vorsorge" },
    { n: 3, label: "Ausgaben" },
    { n: 4, label: "Analyse" },
  ];
  return (
    <div className="progress-wrap">
      <div className="steps">
        {steps.map(s => {
          const state = s.n < current ? "done" : s.n === current ? "active" : "";
          return (
            <div key={s.n} className={`step ${state}`}>
              <div className="step-bar"><i /></div>
              <div className="step-meta">
                <span>{String(s.n).padStart(2, "0")}</span>
                <b>{s.label}</b>
                {state === "done" && (
                  <span className="check-badge"><Icon.Check width={8} height={8} strokeWidth={4}/></span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Section A: Modus-Wahl ---------- */
function ModeChooser({ mode, setMode, isPaar, t }) {
  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">A</span>
          {t("Wie möchtest du deine Ausgaben erfassen?", "Wie möchtet ihr eure Ausgaben erfassen?")}
        </h2>
      </div>
      <div className="option-grid-2">
        <button
          className={`option-card ${mode === "simple" ? "active" : ""}`}
          onClick={() => setMode("simple")}
        >
          <div className="option-icon"><Icon.Bolt width={22} height={22} /></div>
          <div style={{ flex: 1 }}>
            <div className="option-title">Einfach</div>
            <div className="option-sub">Einen Gesamtbetrag angeben. Dauert 1 Minute.</div>
            <span className="quick-badge">Schnell &amp; einfach</span>
          </div>
        </button>
        <button
          className={`option-card ${mode === "detailed" ? "active" : ""}`}
          onClick={() => setMode("detailed")}
        >
          <div className="option-icon"><Icon.List width={22} height={22} /></div>
          <div style={{ flex: 1 }}>
            <div className="option-title">Detailliert</div>
            <div className="option-sub">Nach Kategorien aufteilen. Genauer, dauert etwas länger.</div>
          </div>
        </button>
      </div>
    </section>
  );
}

/* ---------- BFS Quelle Banner ---------- */
function SourceLine({ bfs }) {
  if (!bfs) return null;
  return (
    <div className="bfs-source">
      <Icon.Info width={14} height={14} />
      <span>{bfs.isFallback ? `Durchschnittswerte: ${bfs.source}` : `Quelle: ${bfs.source}`}</span>
    </div>
  );
}

/* ---------- Section B – Einfach ---------- */
function SimpleBlock({ totalSimple, setTotalSimple, bfs, htyp, t, isPaar }) {
  const avg = bfs && bfs[htyp] ? bfs[htyp].total : 0;
  const yearly = (totalSimple || 0) * 12;
  const ratio = avg > 0 ? Math.min((totalSimple || 0) / avg, 2) : 0;
  const typLabel = htyp === "einperson" ? "Einzelhaushalt"
                 : htyp === "mitKindern" ? "Haushalt mit Kindern" : "Zweipersonenhaushalt";

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">B</span>
          Monatliche Gesamtausgaben
        </h2>
      </div>

      <div className="person-card">
        <div className="field" style={{ maxWidth: 460 }}>
          <label htmlFor="total-simple">
            {t("Wie viel gibst du im Monat insgesamt aus?", "Wie viel gebt ihr im Monat insgesamt aus?")}
          </label>
          <div className="amount-wrap" style={{ maxWidth: "none" }}>
            <span className="amount-prefix">CHF</span>
            <input
              id="total-simple"
              type="text"
              inputMode="numeric"
              className="amount-input"
              value={totalSimple ? fmtCHF(totalSimple) : ""}
              placeholder={isPaar ? "z.B. 7'500" : "z.B. 4'800"}
              onChange={e => setTotalSimple(parseNum(e.target.value))}
            />
          </div>
          {totalSimple > 0 && (
            <div className="live-hint">= CHF {fmtCHF(yearly)} / Jahr</div>
          )}
        </div>

        <div className="info-box" style={{ marginTop: 18 }}>
          <div className="info-icon"><Icon.Info width={16} height={16} /></div>
          <div>
            Gemeint sind alle Ausgaben: Wohnen, Essen, Versicherungen, Mobilität, Freizeit, Steuern, etc.
            <br />
            <b>Tipp:</b> {t("Schau in deine Steuererklärung oder Kontoauszüge der letzten Monate für einen realistischen Wert.", "Schaut in eure Steuererklärung oder Kontoauszüge der letzten Monate für einen realistischen Wert.")}
          </div>
        </div>

        {totalSimple > 0 && avg > 0 && (
          <div className="comparison-card" style={{ marginTop: 18 }}>
            <div className="comp-head">
              <span className="comp-icon">📊</span>
              <span>Einordnung</span>
            </div>
            <div className="comp-bar">
              <div className="comp-bar-track">
                <div
                  className="comp-bar-fill"
                  style={{ width: `${Math.min((totalSimple / Math.max(avg, totalSimple)) * 100, 100)}%` }}
                />
                <div
                  className="comp-bar-marker"
                  style={{ left: `${Math.min((avg / Math.max(avg, totalSimple)) * 100, 100)}%` }}
                  title={`Durchschnitt CHF ${fmtCHF(avg)}`}
                />
              </div>
              <div className="comp-legend">
                <span><i className="dot dot-you" /> Du: CHF {fmtCHF(totalSimple)}</span>
                <span><i className="dot dot-avg" /> Ø: CHF {fmtCHF(avg)}</span>
              </div>
            </div>
            <div className="comp-foot">
              Durchschnitt Schweiz ({typLabel}): <b>CHF {fmtCHF(avg)} / Monat</b>
              <br />
              <span className="bfs-note">
                <Icon.Info width={13} height={13} />
                {bfs && bfs.isFallback ? bfs.source : `Quelle: ${bfs ? bfs.source : "BFS"}. Inkl. Steuern und Sozialversicherungen.`}
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Section B – Detailliert ---------- */
function DetailedBlock({ values, setValues, filledFromBFS, setFilledFromBFS, bfs, htyp, t, hasChildren, prefillWohnen }) {
  const avgs = bfs && bfs[htyp] ? bfs[htyp].values : {};
  const avgTotal = bfs && bfs[htyp] ? bfs[htyp].total : 0;
  const [showBildung, setShowBildung] = useState(hasChildren || !!values.bildung);

  // Prefill Wohnen aus Schritt 2 Immobilie
  useEffect(() => {
    if (prefillWohnen > 0 && !values.wohnen && !values._wohnenPrefilled) {
      setValues({ ...values, wohnen: prefillWohnen, _wohnenPrefilled: true });
    }
  }, [prefillWohnen]);

  const visible = CATEGORIES.filter(c => c.key !== "bildung" || showBildung);
  const total = visible.reduce((s, c) => s + (Number(values[c.key]) || 0), 0);
  const yearly = total * 12;
  const diff = total - avgTotal;
  const diffPct = avgTotal > 0 ? Math.round((diff / avgTotal) * 100) : 0;

  const fillEmpty = () => {
    const next = { ...values };
    const filled = { ...filledFromBFS };
    visible.forEach(c => {
      if (!next[c.key] || next[c.key] === 0) {
        next[c.key] = avgs[c.key] || 0;
        filled[c.key] = true;
      }
    });
    setValues(next);
    setFilledFromBFS(filled);
  };

  const updateField = (k, v) => {
    setValues({ ...values, [k]: v });
    if (filledFromBFS[k]) {
      const cp = { ...filledFromBFS }; delete cp[k];
      setFilledFromBFS(cp);
    }
  };

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">B</span>
          {t("Deine monatlichen Ausgaben nach Kategorie", "Eure monatlichen Ausgaben nach Kategorie")}
        </h2>
      </div>
      <p style={{ color: "var(--ink-500)", marginTop: -8, marginBottom: 22, fontSize: 15 }}>
        {t("Trage pro Kategorie den ungefähren Monatsbetrag ein. Lass Felder leer wenn unsicher – wir ergänzen einen Durchschnittswert.",
           "Tragt pro Kategorie den ungefähren Monatsbetrag ein. Lasst Felder leer wenn unsicher – wir ergänzen einen Durchschnittswert.")}
      </p>

      <div className="cat-list">
        {visible.map(c => {
          const v = values[c.key] || 0;
          const avg = avgs[c.key] || 0;
          const isFilled = !!filledFromBFS[c.key];
          return (
            <div className="cat-row" key={c.key}>
              <div className="cat-icon">{c.emoji}</div>
              <div className="cat-meta">
                <div className="cat-name">{c.label}</div>
                <div className="cat-hint">{c.hint}</div>
              </div>
              <div className="cat-input">
                <div className="amount-wrap" style={{ maxWidth: "none" }}>
                  <span className="amount-prefix">CHF</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={`amount-input ${isFilled ? "is-filled-bfs" : ""}`}
                    value={v ? fmtCHF(v) : ""}
                    placeholder={`Ø ${fmtCHF(avg)}`}
                    onChange={e => updateField(c.key, parseNum(e.target.value))}
                  />
                  {isFilled && <span className="bfs-tag">Ø</span>}
                </div>
                <div className="cat-avg">(Ø CHF {fmtCHF(avg)})</div>
              </div>
            </div>
          );
        })}
        {!showBildung && (
          <button type="button" className="add-row" onClick={() => setShowBildung(true)}>
            <Icon.Plus width={14} height={14} />
            <span>Bildung &amp; Kinder hinzufügen</span>
          </button>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-start", marginTop: 18 }}>
        <button type="button" className="btn-secondary btn" onClick={fillEmpty}>
          {Object.keys(filledFromBFS).length > 0 ? "✓ Mit BFS-Durchschnitt ergänzt" : "Leere Felder mit Durchschnitt füllen"}
        </button>
      </div>

      <div className="comparison-card" style={{ marginTop: 22 }}>
        <div className="comp-head">
          <span>Total monatliche Ausgaben:</span>
          <span className="comp-total-amount">CHF {fmtCHF(total)}</span>
        </div>
        <div style={{ color: "var(--ink-500)", fontSize: 13, marginBottom: 14 }}>
          = CHF {fmtCHF(yearly)} / Jahr
        </div>
        {avgTotal > 0 && (
          <>
            <div className="comp-bar">
              <div className="comp-bar-track">
                <div
                  className="comp-bar-fill"
                  style={{ width: `${Math.min((total / Math.max(avgTotal, total, 1)) * 100, 100)}%` }}
                />
                <div
                  className="comp-bar-marker"
                  style={{ left: `${Math.min((avgTotal / Math.max(avgTotal, total, 1)) * 100, 100)}%` }}
                />
              </div>
              <div className="comp-legend">
                <span><i className="dot dot-you" /> Du: CHF {fmtCHF(total)}</span>
                <span><i className="dot dot-avg" /> Ø: CHF {fmtCHF(avgTotal)}</span>
              </div>
            </div>
            <div className="comp-foot" style={{ marginTop: 12 }}>
              Differenz: <b style={{ color: diff > 0 ? "var(--red-600)" : diff < 0 ? "var(--green-600)" : "var(--ink-700)" }}>
                {diff >= 0 ? "+" : "−"} CHF {fmtCHF(Math.abs(diff))} ({diff >= 0 ? "+" : "−"}{Math.abs(diffPct)} %)
              </b>
              <br />
              <span className="bfs-note">
                <Icon.Info width={13} height={13} />
                {bfs && bfs.isFallback ? bfs.source : `Quelle: ${bfs ? bfs.source : "BFS"}`}
              </span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

/* ---------- Section C – Veränderungen im Alter ---------- */
function ChangesBlock({ t }) {
  const decrease = ["Arbeitsweg / Pendeln", "Berufskleidung", "Auswärtsverpflegung (Kantine)", "Berufsauslagen", "PK-Beiträge (Arbeitnehmeranteil)", "AHV/IV/EO-Beiträge", "Steuern (tieferes Einkommen)", "Hypothekaramortisation (falls abgeschlossen)"];
  const same = ["Wohnen (Miete/Hypothekarzins)", "Lebensmittel", "Versicherungen (Krankenkasse)", "Kommunikation"];
  const increase = ["Freizeit & Hobbys (mehr Zeit)", "Reisen (mehr Ferien möglich)", "Gesundheitskosten (steigen mit Alter)", "Haushaltshilfe (im höheren Alter)"];

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">C</span>
          Was ändert sich nach der Pensionierung?
        </h2>
      </div>
      <p style={{ color: "var(--ink-500)", marginTop: -8, marginBottom: 22, fontSize: 15 }}>
        {t("Manche Ausgaben fallen weg, andere kommen dazu. So schätzen wir deinen Bedarf im Alter realistischer.",
           "Manche Ausgaben fallen weg, andere kommen dazu. So schätzen wir euren Bedarf im Alter realistischer.")}
      </p>
      <div className="changes-grid">
        <div className="change-col change-decrease">
          <div className="change-head">
            <span className="change-arrow">↓</span>
            <span>Fällt weg oder sinkt</span>
          </div>
          <ul>{decrease.map((x,i) => <li key={i}>{x}</li>)}</ul>
        </div>
        <div className="change-col change-same">
          <div className="change-head">
            <span className="change-arrow">=</span>
            <span>Bleibt etwa gleich</span>
          </div>
          <ul>{same.map((x,i) => <li key={i}>{x}</li>)}</ul>
        </div>
        <div className="change-col change-increase">
          <div className="change-head">
            <span className="change-arrow">↑</span>
            <span>Kommt dazu oder steigt</span>
          </div>
          <ul>{increase.map((x,i) => <li key={i}>{x}</li>)}</ul>
        </div>
      </div>
    </section>
  );
}

/* ---------- Section D – Zielbetrag ---------- */
function GoalBlock({ todayMonthly, futureMonthly, goal, setGoal, customAmount, setCustomAmount, t }) {
  const opts = [
    { key: "today", title: "Wie heute", value: todayMonthly, sub: "Gleicher Lebensstandard beibehalten.", pct: 100 },
    { key: "recommended", title: "Empfehlung", value: futureMonthly, sub: "Berücksichtigt typische Veränderungen bei der Pensionierung.", pct: 85, recommended: true },
    { key: "custom", title: "Eigener Betrag", value: customAmount, sub: "Eigenen Zielbetrag festlegen.", pct: null, custom: true },
  ];
  const finalAmount = goal === "today" ? todayMonthly : goal === "recommended" ? futureMonthly : customAmount;

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">D</span>
          {t("Wie viel möchtest du im Alter zur Verfügung haben?", "Wie viel möchtet ihr im Alter zur Verfügung haben?")}
        </h2>
      </div>
      <p style={{ color: "var(--ink-500)", marginTop: -8, marginBottom: 22, fontSize: 15 }}>
        Dies ist der Betrag, den wir in der Analyse als Ziel verwenden.
      </p>

      <div className="option-grid-3 goal-grid">
        {opts.map(o => (
          <button
            key={o.key}
            type="button"
            className={`goal-card ${goal === o.key ? "active" : ""}`}
            onClick={() => setGoal(o.key)}
          >
            {o.recommended && <span className="goal-badge">Empfohlen</span>}
            <div className="goal-card-title">{o.title}</div>
            <div className="goal-card-amount">
              CHF {fmtCHF(o.value || 0)}<span className="unit"> / Mt.</span>
            </div>
            {o.pct != null && (
              <div className="goal-card-pct">{o.pct} % des heutigen Budgets</div>
            )}
            <div className="goal-card-sub">{o.sub}</div>
          </button>
        ))}
      </div>

      {goal === "custom" && (
        <div className="person-card" style={{ marginTop: 18 }}>
          <div className="field" style={{ maxWidth: 460 }}>
            <label htmlFor="custom-amount">Eigener Zielbetrag pro Monat</label>
            <div className="amount-wrap" style={{ maxWidth: "none" }}>
              <span className="amount-prefix">CHF</span>
              <input
                id="custom-amount"
                type="text"
                inputMode="numeric"
                className="amount-input"
                value={customAmount ? fmtCHF(customAmount) : ""}
                placeholder="z.B. 6'500"
                onChange={e => setCustomAmount(parseNum(e.target.value))}
              />
            </div>
          </div>
        </div>
      )}

      {finalAmount > 0 && (
        <div className="goal-summary">
          <div>
            Zielbetrag: <b>CHF {fmtCHF(finalAmount)} / Monat</b> = <b>CHF {fmtCHF(finalAmount * 12)} / Jahr</b>
          </div>
          <div className="info-box" style={{ marginTop: 12 }}>
            <div className="info-icon"><Icon.Info width={16} height={16} /></div>
            <div>
              {t("Dieser Betrag dient als Grundlage für die Analyse. Du kannst ihn in Schritt 4 jederzeit anpassen und verschiedene Szenarien vergleichen.",
                 "Dieser Betrag dient als Grundlage für die Analyse. Ihr könnt ihn in Schritt 4 jederzeit anpassen und verschiedene Szenarien vergleichen.")}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Section E – Sparquote ---------- */
function SparquoteBlock({ totalIncome, totalExpenses }) {
  if (!totalIncome || totalIncome === 0) return null;
  const monthly = totalIncome / 12;
  const sparquote = monthly - totalExpenses;
  const pct = monthly > 0 ? Math.round((sparquote / monthly) * 100) : 0;
  const negative = sparquote < 0;

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num" style={{ fontFamily: "inherit", fontSize: "inherit", color: "var(--navy-700)" }}>💡</span>
          Aktuelle Sparquote
        </h2>
      </div>
      <div className={`sparquote-card ${negative ? "is-negative" : ""}`}>
        <div className="sq-row">
          <span>Brutto-Einkommen</span>
          <b>CHF {fmtCHF(monthly)} / Monat</b>
        </div>
        <div className="sq-row">
          <span>Ausgaben</span>
          <b>CHF {fmtCHF(totalExpenses)} / Monat</b>
        </div>
        <div className="sq-divider" />
        <div className="sq-row sq-total">
          <span>Sparquote</span>
          <div style={{ textAlign: "right" }}>
            <b style={{ fontSize: 22, color: negative ? "var(--red-600)" : "var(--green-600)" }}>
              CHF {fmtCHF(sparquote)} / Monat
            </b>
            <div style={{ fontSize: 13, color: "var(--ink-500)" }}>({pct} %)</div>
          </div>
        </div>
        {negative ? (
          <div className="warning-box" style={{ marginTop: 14 }}>
            <Icon.Info width={16} height={16} />
            <span>Die Ausgaben übersteigen das Einkommen. Bitte prüfe, ob die Werte korrekt sind.</span>
          </div>
        ) : (
          <div className="info-box" style={{ marginTop: 14 }}>
            <div className="info-icon"><Icon.Info width={16} height={16} /></div>
            <div>Diese Sparquote fliesst bis zur Pensionierung in den Vermögensaufbau ein und wird in der Analyse berücksichtigt.</div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Section F – Zusammenfassung ---------- */
function SummaryBlock({ todayMonthly, goalMonthly, sparquote }) {
  const diff = goalMonthly - todayMonthly;
  const diffPct = todayMonthly > 0 ? Math.round((diff / todayMonthly) * 100) : 0;
  const sqPct = sparquote.monthlyIncome > 0 ? Math.round((sparquote.value / sparquote.monthlyIncome) * 100) : 0;

  return (
    <section className="block">
      <div className="summary-card">
        <div className="summary-head">
          <span className="summary-icon">📊</span>
          <h2 className="summary-title">Zusammenfassung Budget</h2>
        </div>

        <div className="summary-section">
          <div className="summary-row">
            <span>Heutige Ausgaben</span>
            <span className="val">CHF {fmtCHF(todayMonthly)} / Monat</span>
          </div>
          <div className="summary-row sub">
            <span></span>
            <span className="val" style={{ color: "var(--ink-500)" }}>CHF {fmtCHF(todayMonthly * 12)} / Jahr</span>
          </div>
        </div>

        <div className="summary-section">
          <div className="summary-row">
            <span>Zielbetrag im Alter</span>
            <span className="val">CHF {fmtCHF(goalMonthly)} / Monat</span>
          </div>
          <div className="summary-row sub">
            <span></span>
            <span className="val" style={{ color: "var(--ink-500)" }}>CHF {fmtCHF(goalMonthly * 12)} / Jahr</span>
          </div>
        </div>

        <div className="summary-section">
          <div className="summary-row">
            <span>Differenz</span>
            <span className="val" style={{ color: diff < 0 ? "var(--green-600)" : diff > 0 ? "var(--red-600)" : "inherit" }}>
              {diff >= 0 ? "+" : "−"} CHF {fmtCHF(Math.abs(diff))} / Monat
            </span>
          </div>
          <div className="summary-row sub">
            <span></span>
            <span className="val" style={{ color: "var(--ink-500)" }}>
              ({diff >= 0 ? "+" : "−"}{Math.abs(diffPct)} %)
            </span>
          </div>
        </div>

        {sparquote.monthlyIncome > 0 && (
          <div className="summary-section">
            <div className="summary-row">
              <span>Sparquote bis Pensionierung</span>
              <span className="val" style={{ color: sparquote.value < 0 ? "var(--red-600)" : "var(--green-600)" }}>
                CHF {fmtCHF(sparquote.value)} / Monat
              </span>
            </div>
            <div className="summary-row sub">
              <span></span>
              <span className="val" style={{ color: "var(--ink-500)" }}>({sqPct} %)</span>
            </div>
          </div>
        )}

        <div className="info-box" style={{ marginTop: 14 }}>
          <div className="info-icon"><Icon.Info width={16} height={16} /></div>
          <div>Im nächsten Schritt zeigen wir, ob die Einnahmen diesen Betrag decken.</div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Heutige Ausgaben aus Modus ableiten ---------- */
function todayFromMode(mode, simple, detailed) {
  if (mode === "simple") return Number(simple) || 0;
  return CATEGORIES.reduce((s, c) => s + (Number(detailed[c.key]) || 0), 0);
}

/* Geschätztes Budget im Alter aus heutigem Wert */
function estimateFuture(mode, simple, detailed) {
  if (mode === "simple") {
    return Math.round((Number(simple) || 0) * 0.85);
  }
  return CATEGORIES.reduce((s, c) => s + (Number(detailed[c.key]) || 0) * c.change, 0);
}

/* ---------- App ---------- */
function App() {
  const { isPaar, t } = useAnsprache();
  const _saved = (window.wwStore && window.wwStore.get && window.wwStore.get()) || {};
  const _exp = _saved.expenses || {};

  const [mode, setMode] = useState(_exp.mode || "simple");
  const [simpleTotal, setSimpleTotal] = useState(_exp.simpleTotal || 0);
  const [detailed, setDetailed] = useState(_exp.detailed || {});
  const [filledFromBFS, setFilledFromBFS] = useState(_exp.filledFromBFS || {});
  const [goal, setGoal] = useState(_exp.goal || "recommended");
  const [customAmount, setCustomAmount] = useState(_exp.customAmount || 0);

  const [bfs, setBfs] = useState(null);
  const hasChildren = !!_saved.hasChildren;
  const htyp = isPaar ? (hasChildren ? "mitKindern" : "zweipersonOhneKinder") : "einperson";

  // Total Income from store (Schritt 2)
  const p1 = _saved.person1 || {};
  const p2 = _saved.person2 || {};
  const totalIncome = (Number(p1.grossIncome) || 0) + (Number(p2.grossIncome) || 0);

  // Wohnen-Vorschlag aus Immobilie
  const propVal = Number(_saved.propertyValue) || 0;
  const prefillWohnen = (_saved.hasProperty && propVal > 0)
    ? Math.round((propVal * 0.015) / 12 + (propVal * 0.01) / 12) // grobe Heuristik: 1.5% Hypothekarzins + 1% Nebenkosten
    : 0;

  // BFS laden
  useEffect(() => {
    if (!window.wwBFS) return;
    let mounted = true;
    window.wwBFS.get().then(data => {
      if (mounted) setBfs(data);
    });
    return () => { mounted = false; };
  }, []);

  // Live-Berechnungen
  const todayMonthly = useMemo(() => todayFromMode(mode, simpleTotal, detailed), [mode, simpleTotal, detailed]);
  const futureMonthly = useMemo(() => estimateFuture(mode, simpleTotal, detailed), [mode, simpleTotal, detailed]);

  const goalMonthly = goal === "today" ? todayMonthly : goal === "recommended" ? futureMonthly : customAmount;

  const sparquote = {
    monthlyIncome: totalIncome / 12,
    value: (totalIncome / 12) - todayMonthly,
  };

  // Save back to store
  useEffect(() => {
    if (!window.wwStore) return;
    window.wwStore.set({
      expenses: { mode, simpleTotal, detailed, filledFromBFS, goal, customAmount },
      monthlyExpenses: todayMonthly,
      retirementBudget: goalMonthly,
    });
  }, [mode, simpleTotal, detailed, filledFromBFS, goal, customAmount, todayMonthly, goalMonthly]);

  return (
    <div className="app" data-screen-label="03 Ausgaben">
      <TopBar />
      <ProgressBar current={3} />

      <main>
        <div className="page-head">
          <div className="eyebrow">Schritt 3 · Ausgaben</div>
          <h1 className="title">{t("Wie viel gibst du aus?", "Wie viel gebt ihr aus?")}</h1>
          <p className="subtitle">
            {t("Dein heutiges Budget ist die Grundlage für die Berechnung, wie viel du im Alter brauchst.",
               "Euer heutiges Budget ist die Grundlage für die Berechnung, wie viel ihr im Alter braucht.")}
          </p>
        </div>

        <ModeChooser mode={mode} setMode={setMode} isPaar={isPaar} t={t} />

        {mode === "simple" ? (
          <SimpleBlock
            totalSimple={simpleTotal}
            setTotalSimple={setSimpleTotal}
            bfs={bfs}
            htyp={htyp}
            t={t}
            isPaar={isPaar}
          />
        ) : (
          <DetailedBlock
            values={detailed}
            setValues={setDetailed}
            filledFromBFS={filledFromBFS}
            setFilledFromBFS={setFilledFromBFS}
            bfs={bfs}
            htyp={htyp}
            t={t}
            hasChildren={hasChildren}
            prefillWohnen={prefillWohnen}
          />
        )}

        <ChangesBlock t={t} />

        {/* Geschätztes Budget Box */}
        {todayMonthly > 0 && (
          <div className="estimate-future-card">
            <div className="estimate-head">Geschätztes Budget im Alter</div>
            <div className="estimate-rows">
              <div className="estimate-row">
                <span>Heute</span>
                <b>CHF {fmtCHF(todayMonthly)} / Monat</b>
              </div>
              <div className="estimate-row highlight">
                <span>Im Alter (geschätzt)</span>
                <b>CHF {fmtCHF(futureMonthly)} / Monat</b>
              </div>
            </div>
            <div className="estimate-note">
              Das entspricht ca. <b>{Math.round((futureMonthly / Math.max(todayMonthly, 1)) * 100)} %</b> des heutigen Budgets.
            </div>
            <div className="info-box" style={{ marginTop: 14 }}>
              <div className="info-icon"><Icon.Info width={16} height={16} /></div>
              <div>Basierend auf typischen Veränderungen bei der Pensionierung. Der Wert kann unten manuell angepasst werden.</div>
            </div>
          </div>
        )}

        <GoalBlock
          todayMonthly={todayMonthly}
          futureMonthly={futureMonthly}
          goal={goal}
          setGoal={setGoal}
          customAmount={customAmount}
          setCustomAmount={setCustomAmount}
          t={t}
        />

        <SparquoteBlock totalIncome={totalIncome} totalExpenses={todayMonthly} />

        <SummaryBlock todayMonthly={todayMonthly} goalMonthly={goalMonthly} sparquote={sparquote} />

        <div className="disclaimer">
          ⚠️ WealthWise ersetzt keine professionelle Finanzberatung. Alle Berechnungen basieren auf vereinfachten Annahmen.
        </div>
      </main>

      <div className="footer">
        <div className="footer-meta">Schritt 3 von 4 · Ausgaben</div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="WealthWise - Screen 2 Vorsorge.html" className="btn btn-ghost" style={{textDecoration:"none"}}>
            <Icon.ArrowLeft width={16} height={16} /> Zurück
          </a>
          <button className="btn btn-primary" onClick={() => {
            try {
              window.ww && window.ww.track && window.ww.track("wizard_step", { step: 3, screen: "screen_3_ausgaben" });
            } catch (e) {}
            window.location.href = "WealthWise - Screen 4 Analyse.html";
          }}>
            Weiter zur Analyse <Icon.Arrow width={16} height={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Root() {
  const getCtx = () => {
    const s = (window.wwStore && window.wwStore.get && window.wwStore.get()) || {};
    return {
      currentStep: "ausgaben",
      person1: s.person1 || null,
      person2: s.person2 || null,
      civilStatus: s.civilStatus,
      monthlyExpenses: s.monthlyExpenses,
      retirementBudget: s.retirementBudget,
      hasProperty: s.hasProperty,
      propertyValue: s.propertyValue,
    };
  };
  return (
    <>
      <App />
      {window.WWChatPanel ? <window.WWChatPanel currentStep="ausgaben" getContext={getCtx} /> : null}
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
