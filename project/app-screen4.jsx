/* =========================================================
   WealthWise · Screen 4 · Eure Analyse
   Kernfrage: "Reicht euer Geld in der Rente?"
   Sections A–J, all live-recalculated.
   ========================================================= */

const { useState, useEffect, useMemo, useRef } = React;
const useAnsprache = window.useAnsprache || (() => ({ isPaar: false, t: (du) => du, names: ["du"] }));

// Helpers come from screen4-helpers.jsx as top-level globals; no destructuring needed.

/* ---------- Icons ---------- */
const Icon = {
  Check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="5 12 10 17 19 7"/></svg>,
  Arrow: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>,
  ArrowLeft: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/></svg>,
  Info: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8.01"/></svg>,
  Chev: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="6 9 12 15 18 9"/></svg>,
  Settings: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.4.6 1 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
};

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

function ProgressBar({ current = 4 }) {
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

/* ---------- A · Hero ---------- */
function HeroResult({ result, isPaar, t, setShowWhy, showWhy }) {
  const { variant, einnahmen, target, gap, capital, reachAge, retirementAge, surplus } = result;
  let cls, emoji, eyebrow, headline, body;
  if (variant === "good") {
    cls = "is-good";
    emoji = "✅";
    eyebrow = "Gute Nachricht!";
    headline = t("Deine Renten decken deinen Bedarf im Alter.", "Eure Renten decken euren Bedarf im Alter.");
    body = (
      <>
        Ihr habt einen <b>Überschuss von CHF {fmt(surplus)} pro Monat</b>. Zusätzlich steht Kapital von <b>CHF {fmt(capital)}</b> zur Verfügung.
      </>
    );
  } else if (variant === "warn") {
    cls = "is-warn";
    emoji = "⚠️";
    eyebrow = "Es reicht – aber nicht unbegrenzt";
    headline = t(
      `Deine Renten decken CHF ${fmt(einnahmen)} der gewünschten CHF ${fmt(target)} pro Monat.`,
      `Eure Renten decken CHF ${fmt(einnahmen)} der gewünschten CHF ${fmt(target)} pro Monat.`
    );
    body = (
      <>
        Monatliche Lücke: <b>CHF {fmt(gap)}</b>. Das Kapital von <b>CHF {fmt(capital)}</b> reicht voraussichtlich {reachAge != null ? <>bis Alter <b>{reachAge}</b></> : <>weit über das <b>95. Lebensjahr</b> hinaus</>}.
      </>
    );
  } else {
    cls = "is-bad";
    emoji = "🔴";
    eyebrow = "Es wird knapp";
    headline = t(
      `Deine Renten decken nur CHF ${fmt(einnahmen)} der gewünschten CHF ${fmt(target)} pro Monat.`,
      `Eure Renten decken nur CHF ${fmt(einnahmen)} der gewünschten CHF ${fmt(target)} pro Monat.`
    );
    body = (
      <>
        Monatliche Lücke: <b>CHF {fmt(gap)}</b>. Das Kapital von <b>CHF {fmt(capital)}</b> reicht voraussichtlich {reachAge != null ? <>bis Alter <b>{reachAge}</b></> : <>nicht lange</>}. Unten findet ihr Möglichkeiten, die Situation zu verbessern.
      </>
    );
  }

  // Reichweite-Balken (65 → 100)
  const minA = retirementAge, maxA = 100;
  const reachPct = reachAge != null ? Math.min(100, Math.max(0, ((reachAge - minA) / (maxA - minA)) * 100)) : 100;

  return (
    <section className="block">
      <div className={`hero-result ${cls}`}>
        <span className="hero-eyebrow"><span>{emoji}</span><span>{eyebrow}</span></span>
        <h2 className="hero-headline">{headline}</h2>
        <p className="hero-explain">{body}</p>

        <div className="hero-grid">
          <div className="hero-stat">
            <div className="hs-label">Einnahmen / Monat</div>
            <div className="hs-val">CHF {fmt(einnahmen)}</div>
            <div className="hs-sub">AHV + PK-Rente</div>
          </div>
          <div className="hero-stat">
            <div className="hs-label">Zielbetrag / Monat</div>
            <div className="hs-val">CHF {fmt(target)}</div>
            <div className="hs-sub">aus Schritt 3</div>
          </div>
          <div className="hero-stat">
            <div className="hs-label">{variant === "good" ? "Überschuss / Monat" : "Lücke / Monat"}</div>
            <div className="hs-val" style={{ color: variant === "good" ? "#15803d" : variant === "bad" ? "#991b1b" : "#854d0e" }}>
              {variant === "good" ? `+ CHF ${fmt(surplus)}` : `− CHF ${fmt(gap)}`}
            </div>
            <div className="hs-sub">{variant === "good" ? "Renten reichen" : "muss aus Kapital gedeckt werden"}</div>
          </div>
          <div className="hero-stat">
            <div className="hs-label">Verfügbares Kapital</div>
            <div className="hs-val">CHF {fmt(capital)}</div>
            <div className="hs-sub">bei Pensionierung</div>
          </div>
        </div>

        {variant !== "good" && reachAge != null && (
          <>
            <div className="reach-bar">
              <div className="reach-track">
                <div className="reach-fill" style={{ width: `${reachPct}%` }} />
                <div className="reach-marker" data-label={`bis Alter ${reachAge}`} style={{ left: `${reachPct}%` }} />
              </div>
              <div className="reach-axis">
                <span>{retirementAge}</span>
                <span>{Math.round((retirementAge + maxA) / 2)}</span>
                <span>{maxA}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Why-card */}
      <div className="why-card">
        <button className={`why-toggle ${showWhy ? "open" : ""}`} onClick={() => setShowWhy(!showWhy)}>
          <Icon.Info width={16} height={16} />
          <span>Wie wird das berechnet?</span>
          <Icon.Chev width={16} height={16} className="chev" />
        </button>
        {showWhy && (
          <div className="why-body">
            <p>Diese Berechnung basiert auf folgenden Daten und Annahmen:</p>
            <ul>
              <li>AHV-Rente: <code>CHF {fmt(result.ahv)} / Mt.</code> (aus Schritt 2)</li>
              <li>PK-Rente: <code>CHF {fmt(result.pk)} / Mt.</code> (aus Schritt 2)</li>
              <li>Zielbetrag im Alter: <code>CHF {fmt(target)} / Mt.</code> (aus Schritt 3)</li>
              <li>Verfügbares Kapital bei Pensionierung: <code>CHF {fmt(capital)}</code> (3a + Freizügigkeit + Vermögen + Sparquote bis Pensionierung)</li>
              <li>Annahme Inflation: <code>1.0 % p.a.</code></li>
              <li>Annahme Rendite auf Kapital: <code>2.0 % p.a.</code></li>
              <li>Lebenserwartung: <code>90 Jahre</code> (in Abschnitt C anpassbar)</li>
            </ul>
            <p style={{ marginTop: 12 }}>
              Die Reichweite ergibt sich aus <code>Kapital ÷ (Lücke × 12)</code>, wobei das Restkapital weiter rentiert und der Zielbetrag jährlich an die Inflation angepasst wird.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- B · Pillars ---------- */
function PillarsBlock({ result, isPaar, names, t }) {
  const { ahv, pk, einnahmen, target, gap, surplus, ahvBreakdown, pkBreakdown } = result;
  const max = Math.max(einnahmen, target);
  const ahvPct = (ahv / max) * 100;
  const pkPct = (pk / max) * 100;
  const expPct = (target / max) * 100;
  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">B</span>
          {t("Deine Finanzen nach der Pensionierung", "Eure Finanzen nach der Pensionierung")}
        </h2>
      </div>
      <div className="pillar-grid">
        <div className="pillar income">
          <div className="pillar-title">Einnahmen</div>
          {isPaar && ahvBreakdown ? (
            <>
              <div className="pillar-row"><span>AHV (plafoniert)</span><b>CHF {fmt(ahv)}</b></div>
              {pkBreakdown.map((row, i) => (
                <div key={i} className="pillar-row"><span>PK {row.name}</span><b>CHF {fmt(row.amount)}</b></div>
              ))}
            </>
          ) : (
            <>
              <div className="pillar-row"><span>AHV-Rente</span><b>CHF {fmt(ahv)}</b></div>
              <div className="pillar-row"><span>PK-Rente</span><b>CHF {fmt(pk)}</b></div>
            </>
          )}
          <div className="pillar-divider" />
          <div className="pillar-total">
            <span>Total</span>
            <span>CHF {fmt(einnahmen)}<span className="unit"> / Mt.</span></span>
          </div>
        </div>
        <div className="pillar expense">
          <div className="pillar-title">Ausgaben</div>
          <div className="pillar-row"><span>Zielbetrag im Alter</span><b>CHF {fmt(target)}</b></div>
          <div className="pillar-row sub"><span>= jährlich</span><b>CHF {fmt(target * 12)}</b></div>
          <div className="pillar-divider" />
          <div className="pillar-total">
            <span>Total</span>
            <span>CHF {fmt(target)}<span className="unit"> / Mt.</span></span>
          </div>
          {gap > 0 ? (
            <div className="gap-row is-shortfall">
              <span>Monatliche Lücke</span>
              <b>− CHF {fmt(gap)}</b>
            </div>
          ) : (
            <div className="gap-row is-surplus">
              <span>Monatlicher Überschuss</span>
              <b>+ CHF {fmt(surplus)}</b>
            </div>
          )}
        </div>
      </div>

      {/* Bar visualization */}
      <div style={{ marginTop: 18 }}>
        <div className="pillar-bar-row">
          <span style={{ color: "var(--ink-700)", fontFamily: "var(--font-display)", fontWeight: 500 }}>Einnahmen</span>
          <div className="pillar-bar-track">
            <div className="pillar-bar-segment ahv" style={{ left: 0, width: `${ahvPct}%` }} title={`AHV: CHF ${fmt(ahv)}`} />
            <div className="pillar-bar-segment pk" style={{ left: `${ahvPct}%`, width: `${pkPct}%` }} title={`PK: CHF ${fmt(pk)}`} />
          </div>
          <span className="pillar-bar-amt">CHF {fmt(einnahmen)}</span>
        </div>
        <div className="pillar-bar-row">
          <span style={{ color: "var(--ink-700)", fontFamily: "var(--font-display)", fontWeight: 500 }}>Ausgaben</span>
          <div className="pillar-bar-track">
            <div className="pillar-bar-segment exp" style={{ left: 0, width: `${expPct}%` }} title={`Zielbetrag: CHF ${fmt(target)}`} />
          </div>
          <span className="pillar-bar-amt">CHF {fmt(target)}</span>
        </div>
        <div className="chart-legend" style={{ marginTop: 12 }}>
          <span><i className="legend-dot" style={{ background: "#1d4ed8" }} />AHV</span>
          <span><i className="legend-dot" style={{ background: "var(--green-500)" }} />PK-Rente</span>
          <span><i className="legend-dot" style={{ background: "#fb923c" }} />Ausgaben</span>
        </div>
      </div>
    </section>
  );
}

/* ---------- C · Wealth Projection ---------- */
function WealthBlock({ ctx, assumptions, setAssumptions, t }) {
  const [showAssumptions, setShowAssumptions] = useState(false);

  const timeline = useMemo(() => projectWealth({
    currentAge: ctx.currentAge,
    retirementAge: ctx.retirementAge,
    startCapital: ctx.startCapital,
    monthlySaving: ctx.monthlySaving,
    pensions: ctx.einnahmen,
    target: ctx.target,
    capitalAddedAtRetirement: 0,
    rendite: assumptions.rendite,
    inflation: assumptions.inflation,
    maxAge: assumptions.lifeExpectancy,
  }), [ctx, assumptions]);

  const reachAge = findReachAge(timeline);

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">C</span>
          Wie entwickelt sich euer Vermögen?
        </h2>
      </div>
      <div className="chart-card">
        <WealthChart
          series={[{ name: "Realistisch", color: "#3b82f6", cls: "v-realistisch", points: timeline.map(p => ({ age: p.age, wealth: p.wealth })) }]}
          retirementAge={ctx.retirementAge}
          currentAge={ctx.currentAge}
        />
        <div className="chart-legend">
          <span><i className="legend-dot dot-realistisch" />Vermögensverlauf</span>
          <span><i className="legend-dot dot-pension" />Pensionierung mit {ctx.retirementAge}</span>
          {reachAge != null && <span style={{ color: "var(--red-600)", fontWeight: 600 }}>● Kapital aufgebraucht: Alter {reachAge}</span>}
        </div>
      </div>

      <div className="assumptions-box">
        <div className="assumptions-head">
          <Icon.Settings width={18} height={18} />
          <span>Annahmen dieser Berechnung</span>
        </div>
        <div className="assumptions-list">
          <div className="assumption-item">
            <div className="ai-label">Rendite auf Kapital</div>
            <div className="ai-val">{(assumptions.rendite * 100).toFixed(1)} % p.a.</div>
          </div>
          <div className="assumption-item">
            <div className="ai-label">Inflation</div>
            <div className="ai-val">{(assumptions.inflation * 100).toFixed(1)} % p.a.</div>
          </div>
          <div className="assumption-item">
            <div className="ai-label">Lebenserwartung</div>
            <div className="ai-val">{assumptions.lifeExpectancy} Jahre</div>
          </div>
        </div>
        <button className="btn btn-ghost" style={{ marginTop: 14 }} onClick={() => setShowAssumptions(!showAssumptions)}>
          {showAssumptions ? "Schliessen" : "Annahmen anpassen"} <Icon.Chev width={14} height={14} />
        </button>
        {showAssumptions && (
          <div className="assumption-sliders">
            <div className="slider-row">
              <label>Rendite auf Kapital</label>
              <input type="range" min={0} max={5} step={0.1} value={assumptions.rendite * 100}
                onChange={e => setAssumptions({ ...assumptions, rendite: Number(e.target.value) / 100 })} />
              <span className="sl-val">{(assumptions.rendite * 100).toFixed(1)} %</span>
            </div>
            <div className="slider-row">
              <label>Inflation</label>
              <input type="range" min={0} max={3} step={0.1} value={assumptions.inflation * 100}
                onChange={e => setAssumptions({ ...assumptions, inflation: Number(e.target.value) / 100 })} />
              <span className="sl-val">{(assumptions.inflation * 100).toFixed(1)} %</span>
            </div>
            <div className="slider-row">
              <label>Lebenserwartung</label>
              <input type="range" min={80} max={100} step={1} value={assumptions.lifeExpectancy}
                onChange={e => setAssumptions({ ...assumptions, lifeExpectancy: Number(e.target.value) })} />
              <span className="sl-val">{assumptions.lifeExpectancy} J.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- D · Scenarios ---------- */
function ScenariosBlock({ ctx, t }) {
  const [active, setActive] = useState("realistisch");
  const scenarios = [
    { key: "optimistisch", label: "Optimistisch", color: "#22c55e", cls: "v-optimistisch", rendite: 0.04, inflation: 0.005 },
    { key: "realistisch", label: "Realistisch", color: "#3b82f6", cls: "v-realistisch", rendite: 0.02, inflation: 0.01 },
    { key: "pessimistisch", label: "Pessimistisch", color: "#f59e0b", cls: "v-pessimistisch", rendite: 0.005, inflation: 0.02 },
  ];

  const series = useMemo(() => scenarios.map(s => {
    const tl = projectWealth({
      currentAge: ctx.currentAge, retirementAge: ctx.retirementAge,
      startCapital: ctx.startCapital, monthlySaving: ctx.monthlySaving,
      pensions: ctx.einnahmen, target: ctx.target,
      rendite: s.rendite, inflation: s.inflation, maxAge: 95,
    });
    return { ...s, points: tl.map(p => ({ age: p.age, wealth: p.wealth })), reach: findReachAge(tl) };
  }), [ctx]);

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">D</span>
          Was wäre wenn? Szenarien vergleichen
        </h2>
      </div>
      <p style={{ color: "var(--ink-500)", marginTop: -8, marginBottom: 16, fontSize: 15 }}>
        {t("Vergleiche verschiedene Szenarien und sieh, wie sich deine Situation verändert.",
           "Vergleicht verschiedene Szenarien und seht, wie sich eure Situation verändert.")}
      </p>

      <div className="chart-card">
        <WealthChart
          series={series.map(s => ({ name: s.label, color: s.color, cls: s.cls, points: s.points }))}
          retirementAge={ctx.retirementAge}
          currentAge={ctx.currentAge}
        />
        <div className="chart-legend">
          {scenarios.map(s => (
            <span key={s.key}><i className={`legend-dot dot-${s.key}`} />{s.label}</span>
          ))}
        </div>

        <table className="bezug-table" style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th></th>
              {scenarios.map(s => <th key={s.key} className={s.key === active ? "is-active" : ""}>{s.label}</th>)}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Kapital reicht bis Alter</td>
              {series.map(s => <td key={s.key} className={s.key === active ? "is-active" : ""} style={{ color: s.color, fontWeight: 600 }}>
                {s.reach != null ? `bis ${s.reach}` : "lebenslang"}
              </td>)}
            </tr>
            <tr>
              <td>Rendite p.a.</td>
              {scenarios.map(s => <td key={s.key} className={s.key === active ? "is-active" : ""}>{(s.rendite * 100).toFixed(1)} %</td>)}
            </tr>
            <tr>
              <td>Inflation p.a.</td>
              {scenarios.map(s => <td key={s.key} className={s.key === active ? "is-active" : ""}>{(s.inflation * 100).toFixed(1)} %</td>)}
            </tr>
            <tr>
              <td>Monatliche Lücke (heute)</td>
              {scenarios.map(s => <td key={s.key} className={s.key === active ? "is-active" : ""}>CHF {fmt(ctx.gap)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ---------- E · Pensionierungszeitpunkt ---------- */
function TimingBlock({ ctx, t }) {
  const [age, setAge] = useState(ctx.retirementAge);
  const baseAhv = ctx.baseAhv;
  const adjustedAhv = adjustAHV(baseAhv, age);
  const ahvDiff = adjustedAhv - baseAhv;

  const yearsDiff = age - ctx.baseRetirementAge;
  const additionalSaving = yearsDiff * ctx.monthlySaving * 12;

  // PK rough: +5% pro zusätzliches Jahr
  const pkAdjusted = ctx.pk * (1 + yearsDiff * 0.05);
  const pkDiff = pkAdjusted - ctx.pk;

  const newEinnahmen = adjustedAhv + pkAdjusted;
  const newCapital = ctx.startCapital + additionalSaving;
  const newGap = Math.max(0, ctx.target - newEinnahmen);
  const tlNew = projectWealth({
    currentAge: ctx.currentAge, retirementAge: age,
    startCapital: ctx.startCapital, monthlySaving: ctx.monthlySaving,
    pensions: newEinnahmen, target: ctx.target,
    rendite: 0.02, inflation: 0.01, maxAge: 95,
  });
  const newReach = findReachAge(tlNew) || 95;
  const reachDiff = ctx.reachAge != null ? newReach - ctx.reachAge : 0;

  const year = new Date().getFullYear() + (age - ctx.currentAge);

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">E</span>
          Einfluss des Pensionierungszeitpunkts
        </h2>
      </div>
      <p style={{ color: "var(--ink-500)", marginTop: -8, marginBottom: 18, fontSize: 15 }}>
        {t("Sieh, wie sich ein früherer oder späterer Zeitpunkt auf deine Finanzen auswirkt.",
           "Seht, wie sich ein früherer oder späterer Zeitpunkt auf eure Finanzen auswirkt.")}
      </p>

      <div className="timing-card">
        <div className="timing-slider-wrap">
          <div>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-500)" }}>
              Pensionierungsalter
            </label>
            <input type="range" min={58} max={70} step={1} value={age}
              onChange={e => setAge(Number(e.target.value))}
              style={{ width: "100%", marginTop: 8, accentColor: "var(--navy-800)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-500)", marginTop: 4 }}>
              <span>58</span><span>62</span><span>65</span><span>68</span><span>70</span>
            </div>
          </div>
          <div className="timing-result">
            <div className="tr-label">Pensionierung mit</div>
            <div className="tr-val">{age} Jahren</div>
            <div className="tr-sub">im Jahr {year} · {age < 65 ? `${65 - age} J. Vorbezug` : age > 65 ? `${age - 65} J. Aufschub` : "Referenzalter"}</div>
          </div>
        </div>

        <div className="timing-impact-grid">
          <div className="timing-impact">
            <div className="ti-head">AHV-Rente</div>
            <div className="ti-val">CHF {fmt(adjustedAhv)} / Mt.</div>
            <div className={`ti-delta ${ahvDiff >= 0 ? "up" : "down"}`}>
              {fmtSign(ahvDiff)} ggü. CHF {fmt(baseAhv)}
            </div>
          </div>
          <div className="timing-impact">
            <div className="ti-head">PK-Rente (geschätzt)</div>
            <div className="ti-val">CHF {fmt(pkAdjusted)} / Mt.</div>
            <div className={`ti-delta ${pkDiff >= 0 ? "up" : "down"}`}>
              {fmtSign(pkDiff)} ggü. CHF {fmt(ctx.pk)}
            </div>
          </div>
          <div className="timing-impact">
            <div className="ti-head">Kapital reicht bis Alter</div>
            <div className="ti-val">{newReach}</div>
            <div className={`ti-delta ${reachDiff >= 0 ? "up" : "down"}`}>
              {reachDiff >= 0 ? "+" : ""}{reachDiff} J. ggü. Basisplan
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <table className="bezug-table">
            <thead>
              <tr>
                <th>Aufschubjahre</th>
                <th>0</th><th>1</th><th>2</th><th>3</th><th>4</th><th>5</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AHV-Faktor</td>
                {[0,1,2,3,4,5].map(y => <td key={y}>×{AHV_AUFSCHUB_FAKTOR[y].toFixed(3)}</td>)}
              </tr>
              <tr>
                <td>Bei Basis-Rente CHF {fmt(baseAhv)}</td>
                {[0,1,2,3,4,5].map(y => <td key={y} style={{ color: y === Math.max(0, age - 65) ? "var(--green-600)" : undefined, fontWeight: y === Math.max(0, age - 65) ? 600 : 400 }}>
                  CHF {fmt(baseAhv * AHV_AUFSCHUB_FAKTOR[y])}
                </td>)}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="info-box" style={{ marginTop: 14 }}>
          <div className="info-icon"><Icon.Info width={16} height={16} /></div>
          <div>
            Vorbezug ist ab Alter 63 möglich (Kürzung 6.8% pro Jahr, lebenslang). Aufschub bis maximal 5 Jahre erhöht die AHV dauerhaft. PK-Werte sind grobe Schätzungen – die genauen Zahlen stehen im Vorsorgeausweis eurer Pensionskasse.
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- F · PK-Bezug ---------- */
function BezugBlock({ ctx, t }) {
  const [variant, setVariant] = useState("rente");
  const [mixRente, setMixRente] = useState(50);
  const pkKapital = ctx.pkKapital;
  const pkRenteFull = ctx.pk;
  const kanton = ctx.kanton || "ZH";

  const computed = useMemo(() => {
    if (variant === "rente") {
      return { rente: pkRenteFull, kapital: 0, kapitalsteuer: 0, reach: null };
    }
    if (variant === "kapital") {
      const ks = kapitalbezugssteuer(pkKapital, kanton);
      return { rente: 0, kapital: pkKapital - ks, kapitalsteuer: ks, reach: null };
    }
    const renteAnteil = mixRente / 100;
    const kapAmt = pkKapital * (1 - renteAnteil);
    const ks = kapitalbezugssteuer(kapAmt, kanton);
    return { rente: pkRenteFull * renteAnteil, kapital: kapAmt - ks, kapitalsteuer: ks, reach: null };
  }, [variant, mixRente, pkKapital, pkRenteFull, kanton]);

  // For each variant, compute reach
  const reachFor = (rente, kap) => {
    const totalEinnahmen = ctx.ahv + rente;
    const tl = projectWealth({
      currentAge: ctx.currentAge, retirementAge: ctx.retirementAge,
      startCapital: ctx.startCapital, monthlySaving: ctx.monthlySaving,
      pensions: totalEinnahmen, target: ctx.target,
      capitalAddedAtRetirement: kap,
      rendite: 0.02, inflation: 0.01, maxAge: 95,
    });
    return findReachAge(tl);
  };

  const renteOnly = { rente: pkRenteFull, kap: 0, reach: reachFor(pkRenteFull, 0) };
  const kapitalOnly = { rente: 0, kap: pkKapital - kapitalbezugssteuer(pkKapital, kanton), reach: reachFor(0, pkKapital - kapitalbezugssteuer(pkKapital, kanton)) };
  const mixHalf = { rente: pkRenteFull * 0.5, kap: pkKapital * 0.5 - kapitalbezugssteuer(pkKapital * 0.5, kanton), reach: reachFor(pkRenteFull * 0.5, pkKapital * 0.5 - kapitalbezugssteuer(pkKapital * 0.5, kanton)) };

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">F</span>
          Rente, Kapital oder Mix?
        </h2>
      </div>
      <p style={{ color: "var(--ink-500)", marginTop: -8, marginBottom: 18, fontSize: 15 }}>
        Die Pensionskasse bietet verschiedene Bezugsformen. Die Wahl hat grosse Auswirkungen auf Steuern, Einkommen und Flexibilität.
      </p>

      <div className="bezug-grid">
        <button className={`bezug-card ${variant === "rente" ? "active" : ""}`} onClick={() => setVariant("rente")}>
          <div className="bezug-icon">🔁</div>
          <div className="bezug-title">100% Rente</div>
          <div className="bezug-amount">CHF {fmt(pkRenteFull)}<span className="unit"> / Mt.</span></div>
          <div className="bezug-pro">Regelmässiges, lebenslanges Einkommen</div>
          <div className="bezug-pro">Kein Anlagerisiko</div>
          <div className="bezug-con">Nicht vererbbar</div>
          <div className="bezug-con">Kein Inflationsschutz</div>
        </button>
        <button className={`bezug-card ${variant === "kapital" ? "active" : ""}`} onClick={() => setVariant("kapital")}>
          <div className="bezug-icon">💼</div>
          <div className="bezug-title">100% Kapital</div>
          <div className="bezug-amount">CHF {fmt(pkKapital)}<span className="unit"> einmalig</span></div>
          <div className="bezug-pro">Flexibel einsetzbar, vererbbar</div>
          <div className="bezug-pro">Höheres Renditepotenzial</div>
          <div className="bezug-con">Kein garantiertes Einkommen</div>
          <div className="bezug-con">Anlagerisiko, Eigenverantwortung</div>
        </button>
        <button className={`bezug-card ${variant === "mix" ? "active" : ""}`} onClick={() => setVariant("mix")}>
          <div className="bezug-icon">⚖️</div>
          <div className="bezug-title">Mix {variant === "mix" ? `(${mixRente}/${100-mixRente})` : "(50/50)"}</div>
          <div className="bezug-amount">flexibel</div>
          <div className="bezug-pro">Sicherheit + Flexibilität</div>
          <div className="bezug-pro">Anteile frei wählbar</div>
          <div className="bezug-con">Beide Risiken anteilig</div>
        </button>
      </div>

      {variant === "mix" && (
        <div className="bezug-mix-slider" style={{ marginBottom: 22 }}>
          <div>
            <label style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-500)" }}>
              Anteil Rente
            </label>
            <input type="range" min={0} max={100} step={5} value={mixRente}
              onChange={e => setMixRente(Number(e.target.value))}
              style={{ width: "100%", marginTop: 6, accentColor: "var(--navy-800)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-500)" }}>
              <span>0%</span><span>50%</span><span>100%</span>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, color: "var(--ink-900)" }}>
              {mixRente}% Rente · {100 - mixRente}% Kapital
            </div>
            <div style={{ fontSize: 14, color: "var(--ink-700)", marginTop: 6 }}>
              CHF {fmt(computed.rente)} / Mt. + CHF {fmt(computed.kapital)} einmalig (nach Kapitalbezugssteuer)
            </div>
          </div>
        </div>
      )}

      <table className="bezug-table">
        <thead>
          <tr>
            <th></th>
            <th className={variant === "rente" ? "is-active" : ""}>100% Rente</th>
            <th className={variant === "kapital" ? "is-active" : ""}>100% Kapital</th>
            <th className={variant === "mix" ? "is-active" : ""}>Mix 50/50</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Monatliches Einkommen aus PK</td>
            <td className={variant === "rente" ? "is-active" : ""}>CHF {fmt(renteOnly.rente)}</td>
            <td className={variant === "kapital" ? "is-active" : ""}>CHF 0</td>
            <td className={variant === "mix" ? "is-active" : ""}>CHF {fmt(mixHalf.rente)}</td>
          </tr>
          <tr>
            <td>Kapital (nach Kapitalbezugssteuer)</td>
            <td className={variant === "rente" ? "is-active" : ""}>CHF 0</td>
            <td className={variant === "kapital" ? "is-active" : ""}>CHF {fmt(kapitalOnly.kap)}</td>
            <td className={variant === "mix" ? "is-active" : ""}>CHF {fmt(mixHalf.kap)}</td>
          </tr>
          <tr>
            <td>Kapital reicht bis Alter</td>
            <td className={variant === "rente" ? "is-active" : ""}>lebenslang</td>
            <td className={variant === "kapital" ? "is-active" : ""}>{kapitalOnly.reach || "95+"}</td>
            <td className={variant === "mix" ? "is-active" : ""}>{mixHalf.reach || "95+"}</td>
          </tr>
          <tr>
            <td>Vererbbar</td>
            <td className={variant === "rente" ? "is-active" : ""}>Nein</td>
            <td className={variant === "kapital" ? "is-active" : ""}>Ja (Restbetrag)</td>
            <td className={variant === "mix" ? "is-active" : ""}>Teilweise</td>
          </tr>
          <tr>
            <td>Steuerbelastung</td>
            <td className={variant === "rente" ? "is-active" : ""}>jährlich als Einkommen</td>
            <td className={variant === "kapital" ? "is-active" : ""}>einmalig (privilegiert)</td>
            <td className={variant === "mix" ? "is-active" : ""}>kombiniert</td>
          </tr>
        </tbody>
      </table>

      <div className="info-box" style={{ marginTop: 16 }}>
        <div className="info-icon"><Icon.Info width={16} height={16} /></div>
        <div>
          Die Wahl zwischen Rente und Kapital ist eine der wichtigsten Entscheidungen bei der Pensionierung. Sie hängt von Gesundheit, Familiensituation, Risikobereitschaft und Lebensplanung ab. Eine persönliche Beratung ist hier sehr empfehlenswert.
        </div>
      </div>
    </section>
  );
}

/* ---------- G · Steuern ---------- */
function TaxBlock({ ctx, t }) {
  const kanton = ctx.kanton || "ZH";
  const heute = ctx.totalIncome;
  const heuteTax = incomeTax(heute, kanton, ctx.isPaar);
  const imAlter = ctx.einnahmen * 12;
  const imAlterTax = incomeTax(imAlter, kanton, ctx.isPaar);
  const ersparnis = heuteTax - imAlterTax;
  const ksAmt = kapitalbezugssteuer(ctx.pkKapital, kanton);
  const ksRate = ctx.pkKapital > 0 ? (ksAmt / ctx.pkKapital) * 100 : 0;

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">G</span>
          Steuerliche Auswirkungen
        </h2>
      </div>
      <p style={{ color: "var(--ink-500)", marginTop: -8, marginBottom: 18, fontSize: 15 }}>
        {t(`So verändern sich deine Steuern nach der Pensionierung. (Kanton: ${kanton})`,
           `So verändern sich eure Steuern nach der Pensionierung. (Kanton: ${kanton})`)}
      </p>

      <div className="tax-grid">
        <div className="tax-card">
          <div className="tx-head">📅 Heute (im Erwerbsleben)</div>
          <div className="tx-row"><span>Brutto-Einkommen / Jahr</span><b>CHF {fmt(heute)}</b></div>
          <div className="tx-row"><span>Geschätzter Steuersatz</span><b>~{Math.round((heuteTax / Math.max(heute, 1)) * 100)} %</b></div>
          <div className="tx-row emph"><span>Steuern / Jahr</span><b>CHF {fmt(heuteTax)}</b></div>
        </div>
        <div className="tax-card retired">
          <div className="tx-head">🌴 Im Alter (bei 100% Rente)</div>
          <div className="tx-row"><span>Renten-Einkommen / Jahr</span><b>CHF {fmt(imAlter)}</b></div>
          <div className="tx-row"><span>Geschätzter Steuersatz</span><b>~{Math.round((imAlterTax / Math.max(imAlter, 1)) * 100)} %</b></div>
          <div className="tx-row emph"><span>Steuern / Jahr</span><b>CHF {fmt(imAlterTax)}</b></div>
          {ersparnis > 0 && (
            <div className="tax-savings">
              <div className="ts-label">Ersparnis</div>
              <div className="ts-val">− CHF {fmt(ersparnis)} / Jahr</div>
            </div>
          )}
        </div>
      </div>

      {ctx.pkKapital > 0 && (
        <div className="tax-card" style={{ marginTop: 16, borderColor: "#fde047", background: "#fefce8" }}>
          <div className="tx-head">💰 Bei Kapitalbezug PK</div>
          <div className="tx-row"><span>Kapitalbezug</span><b>CHF {fmt(ctx.pkKapital)}</b></div>
          <div className="tx-row"><span>Effektiver Steuersatz ({kanton})</span><b>~{ksRate.toFixed(1)} %</b></div>
          <div className="tx-row emph"><span>Einmalige Kapitalbezugssteuer</span><b>CHF {fmt(ksAmt)}</b></div>
          <div className="tx-row"><span>Netto-Auszahlung</span><b>CHF {fmt(ctx.pkKapital - ksAmt)}</b></div>
        </div>
      )}

      <div className="info-box" style={{ marginTop: 16 }}>
        <div className="info-icon"><Icon.Info width={16} height={16} /></div>
        <div>
          Vereinfachte Berechnung basierend auf Kanton {kanton}. Die tatsächliche Steuer hängt von weiteren Faktoren ab (Abzüge, Vermögenssteuer, Gemeindesteuer-Faktor). Für eine exakte Berechnung empfehlen wir eine Fachperson oder den Steuerrechner eures Kantons.
        </div>
      </div>
    </section>
  );
}

/* ---------- H · Recommendations ---------- */
function RecommendationsBlock({ ctx, t }) {
  const [expanded, setExpanded] = useState(null);
  const recs = useMemo(() => generateRecommendations(ctx), [ctx]);

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">H</span>
          {t("Was kannst du tun?", "Was könnt ihr tun?")}
        </h2>
      </div>
      <p style={{ color: "var(--ink-500)", marginTop: -8, marginBottom: 18, fontSize: 15 }}>
        {t("Basierend auf deiner Situation zeigen wir mögliche Handlungsfelder.",
           "Basierend auf eurer Situation zeigen wir mögliche Handlungsfelder.")}
      </p>

      <div className="reco-list">
        {recs.map(r => (
          <div key={r.key} className={`reco-card priority-${r.priority}`}>
            <div className="reco-head">
              <span className="reco-icon">{r.icon}</span>
              <span className="reco-title">{r.title}</span>
              <span className={`reco-priority priority-${r.priority}`}>
                {r.priority === "high" ? "Hohe Priorität" : r.priority === "mid" ? "Mittel" : "Hinweis"}
              </span>
            </div>
            <p className="reco-text">{r.text}</p>
            <div className="reco-potential">
              <span style={{ flexShrink: 0 }}>💡</span>
              <span><b>Potenzial:</b> {r.potential}</span>
            </div>
            <button className="reco-expand" onClick={() => setExpanded(expanded === r.key ? null : r.key)}>
              {expanded === r.key ? "Weniger" : "Mehr erfahren"} <Icon.Chev width={14} height={14} />
            </button>
            {expanded === r.key && (
              <div className="reco-detail">{r.detail}</div>
            )}
          </div>
        ))}
      </div>

      <div className="info-box" style={{ marginTop: 18 }}>
        <div className="info-icon"><Icon.Info width={16} height={16} /></div>
        <div>
          Diese Empfehlungen sind allgemeine Hinweise basierend auf eurer Datenlage. Sie ersetzen keine individuelle Beratung. Steuerliche und rechtliche Aspekte können je nach persönlicher Situation variieren.
        </div>
      </div>
    </section>
  );
}

/* ---------- I · Overview ---------- */
function OverviewBlock({ ctx, t }) {
  const yearsUntil = Math.max(0, ctx.retirementAge - ctx.currentAge);
  const retirementYear = new Date().getFullYear() + yearsUntil;
  const additionalSaved = ctx.additionalSaved;

  return (
    <section className="block">
      <div className="overview-card">
        <div className="overview-head">
          <span className="overview-icon">📊</span>
          <h2 className="overview-title">Gesamtübersicht</h2>
        </div>
        <div className="overview-grid">
          <div>
            <div className="overview-section">
              <h4>Pensionierung</h4>
              <div className="overview-row"><span>Zeitpunkt</span><b>{retirementYear} (Alter {ctx.retirementAge})</b></div>
              <div className="overview-row"><span>Verbleibende Jahre</span><b>{yearsUntil} J.</b></div>
            </div>
            <div className="overview-section">
              <h4>Monatliche Einnahmen im Alter</h4>
              <div className="overview-row"><span>AHV-Rente</span><b>CHF {fmt(ctx.ahv)}</b></div>
              <div className="overview-row"><span>PK-Rente</span><b>CHF {fmt(ctx.pk)}</b></div>
              <div className="overview-row tot"><span>Total</span><b>CHF {fmt(ctx.einnahmen)} / Mt.</b></div>
            </div>
            <div className="overview-section">
              <h4>Monatlicher Bedarf</h4>
              <div className="overview-row"><span>Zielbetrag</span><b>CHF {fmt(ctx.target)} / Mt.</b></div>
              <div className="overview-row tot">
                <span>{ctx.gap > 0 ? "Lücke" : "Überschuss"}</span>
                <b style={{ color: ctx.gap > 0 ? "var(--red-600)" : "var(--green-600)" }}>
                  {ctx.gap > 0 ? `− CHF ${fmt(ctx.gap)}` : `+ CHF ${fmt(ctx.surplus)}`} / Mt.
                </b>
              </div>
            </div>
          </div>
          <div>
            <div className="overview-section">
              <h4>Kapital heute</h4>
              <div className="overview-row"><span>Säule 3a (Guthaben)</span><b>CHF {fmt(ctx.j3aGuthaben)}</b></div>
              <div className="overview-row"><span>Freizügigkeit</span><b>CHF {fmt(ctx.freizuegigkeit)}</b></div>
              <div className="overview-row"><span>Übriges Vermögen</span><b>CHF {fmt(ctx.bargeld + ctx.wertschriften)}</b></div>
              <div className="overview-row tot"><span>Total heute</span><b>CHF {fmt(ctx.kapitalHeute)}</b></div>
            </div>
            <div className="overview-section">
              <h4>Bis Pensionierung ({yearsUntil} J.)</h4>
              <div className="overview-row"><span>3a Beiträge + Wachstum</span><b>CHF {fmt(ctx.j3aProjektion - ctx.j3aGuthaben)}</b></div>
              <div className="overview-row"><span>Sparquote ({yearsUntil} J.)</span><b>CHF {fmt(additionalSaved)}</b></div>
              <div className="overview-row tot"><span>Kapital bei Pensionierung</span><b>CHF {fmt(ctx.projectedCapitalAtRet)}</b></div>
            </div>
            <div className="overview-section">
              <h4>Reichweite</h4>
              <div className="overview-row"><span>Kapital reicht bis</span><b>{ctx.reachAge ? `Alter ${ctx.reachAge}` : "lebenslang"}</b></div>
              <div className="overview-row"><span>Szenario</span><b>Realistisch (2% Rendite)</b></div>
            </div>
            {ctx.hasProperty && (
              <div className="overview-section">
                <h4>Immobilien</h4>
                <div className="overview-row"><span>Netto-Wert</span><b>CHF {fmt(ctx.propertyValue - ctx.hypothek)}</b></div>
                <div className="overview-row"><span>Tragbarkeit im Alter</span>
                  <b style={{ color: ctx.tragbarkeitOk ? "var(--green-600)" : "#ca8a04" }}>
                    {ctx.tragbarkeitOk ? "OK" : "Kritisch"}
                  </b>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- J · Actions ---------- */
function ActionsBlock({ t }) {
  const handlePdf = () => {
    if (window.wwExportPDF) window.wwExportPDF();
    else window.print();
  };
  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">J</span>
          {t("Wie weiter?", "Wie weiter?")}
        </h2>
      </div>
      <div className="actions-row">
        <button className="action-btn" onClick={handlePdf}>
          <span className="ab-icon">📄</span>
          <div className="ab-title">Als PDF exportieren</div>
          <div className="ab-sub">Vollständige Zusammenfassung mit allen Werten und Annahmen.</div>
        </button>
        <button className="action-btn" onClick={() => alert("E-Mail-Versand: in Demo nicht aktiv")}>
          <span className="ab-icon">📧</span>
          <div className="ab-title">Per E-Mail senden</div>
          <div className="ab-sub">Ergebnis an eine E-Mail-Adresse versenden.</div>
        </button>
        <button className="action-btn" onClick={() => alert("Kontakt zur Beratung: in Demo nicht aktiv")}>
          <span className="ab-icon">👤</span>
          <div className="ab-title">Beratung vereinbaren</div>
          <div className="ab-sub">{t("Mit dieser Analyse bist du optimal vorbereitet.", "Mit dieser Analyse seid ihr optimal vorbereitet.")}</div>
        </button>
        <button className="action-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <span className="ab-icon">🔄</span>
          <div className="ab-title">Szenarien anpassen</div>
          <div className="ab-sub">Zurück zu den Szenarien und Annahmen.</div>
        </button>
      </div>
    </section>
  );
}

/* ---------- App ---------- */
function App() {
  const ansprache = useAnsprache();
  const isPaar = ansprache.isPaar;
  const t = ansprache.t;
  const namesRaw = ansprache.names;
  const [showWhy, setShowWhy] = useState(false);
  const [assumptions, setAssumptions] = useState({ rendite: 0.02, inflation: 0.01, lifeExpectancy: 90 });

  // Read store ONCE (no live subscription on this screen — final analysis)
  const [savedSnapshot] = useState(() => {
    return (window.wwStore && window.wwStore.get && window.wwStore.get()) || {};
  });
  const _saved = savedSnapshot;
  // Merge persons[] (Vorsorge-Daten aus Schritt 2) mit person1/person2 (Profil aus Schritt 1)
  const _persons = Array.isArray(_saved.persons) ? _saved.persons : [];
  const _p1Vorsorge = _persons[0] || {};
  const _p2Vorsorge = _persons[1] || {};
  const p1 = { ..._saved.person1, ..._p1Vorsorge,
    pkYearlyRente: _p1Vorsorge.pkYearlyRente || _saved.person1?.pkYearlyRente,
    pkCapitalAt65: _p1Vorsorge.pkCapital || _p1Vorsorge.pkCapitalAt65 || _saved.person1?.pkCapitalAt65,
    pillar3aBalance: _p1Vorsorge.balance3a || _p1Vorsorge.pillar3aBalance || _saved.person1?.pillar3aBalance,
    pillar3aYearly: _p1Vorsorge.yearly3a || _p1Vorsorge.pillar3aYearly || _saved.person1?.pillar3aYearly,
    pillar3aForm: _p1Vorsorge.form3a || _p1Vorsorge.pillar3aForm || _saved.person1?.pillar3aForm,
    fzBalance: _p1Vorsorge.fzBalance ?? _saved.person1?.fzBalance,
    grossIncome: _p1Vorsorge.income || _saved.person1?.grossIncome,
    name: _saved.person1?.name || _p1Vorsorge.name,
    age: _saved.person1?.age || _p1Vorsorge.age,
    retirementAge: _saved.person1?.retirementAge || _p1Vorsorge.retirementAge,
  };
  const p2 = { ..._saved.person2, ..._p2Vorsorge,
    pkYearlyRente: _p2Vorsorge.pkYearlyRente || _saved.person2?.pkYearlyRente,
    pkCapitalAt65: _p2Vorsorge.pkCapital || _p2Vorsorge.pkCapitalAt65 || _saved.person2?.pkCapitalAt65,
    pillar3aBalance: _p2Vorsorge.balance3a || _p2Vorsorge.pillar3aBalance || _saved.person2?.pillar3aBalance,
    pillar3aYearly: _p2Vorsorge.yearly3a || _p2Vorsorge.pillar3aYearly || _saved.person2?.pillar3aYearly,
    pillar3aForm: _p2Vorsorge.form3a || _p2Vorsorge.pillar3aForm || _saved.person2?.pillar3aForm,
    fzBalance: _p2Vorsorge.fzBalance ?? _saved.person2?.fzBalance,
    grossIncome: _p2Vorsorge.income || _saved.person2?.grossIncome,
    name: _saved.person2?.name || _p2Vorsorge.name,
    age: _saved.person2?.age || _p2Vorsorge.age,
    retirementAge: _saved.person2?.retirementAge || _p2Vorsorge.retirementAge,
  };
  const namesKey = (namesRaw || []).join("|");

  // Derived context — depends only on stable values
  const ctx = useMemo(() => {
    const names = namesRaw || ["du"];
    const name1 = p1.name || names[0] || "Person 1";
    const name2 = p2.name || names[1] || "Person 2";
    const currentAge = Number(p1.age) || 55;
    const retirementAge = Number(p1.retirementAge || _saved.retirementAge) || 65;
    const baseRetirementAge = retirementAge;

    // AHV: Maximalrente-Schätzung wenn nicht aus Schritt 2 vorhanden
    // Solo: 2'520 CHF (Skala 44, durchschnittl. Einkommen)
    // Paar: plafoniert auf 3'675 (150% Max-Einzelrente)
    const ahvSolo = 2520;
    const baseAhvRaw = isPaar ? ahvSolo * 2 : ahvSolo;
    const baseAhv = isPaar ? Math.min(baseAhvRaw, 3675) : baseAhvRaw;

    // PK Rente: pkYearlyRente (jährlich) → monatlich; sonst aus Kapital schätzen mit pkRate
    const pkYearly1 = Number(p1.pkYearlyRente) || 0;
    const pkYearly2 = Number(p2.pkYearlyRente) || 0;
    const pkCap1 = Number(p1.pkCapitalAt65) || 0;
    const pkCap2 = Number(p2.pkCapitalAt65) || 0;
    const pkRate1 = Number(p1.pkRate) || 5.8;
    const pkRate2 = Number(p2.pkRate) || 5.8;
    const pk1 = pkYearly1 > 0 ? pkYearly1 / 12 : (pkCap1 * pkRate1 / 100) / 12;
    const pk2 = pkYearly2 > 0 ? pkYearly2 / 12 : (pkCap2 * pkRate2 / 100) / 12;
    const pk = pk1 + (isPaar ? pk2 : 0);
    const pkBreakdown = isPaar
      ? [{ name: name1, amount: pk1 }, { name: name2, amount: pk2 }]
      : [{ name: name1, amount: pk1 }];

    const ahv = adjustAHV(baseAhv, retirementAge);
    const einnahmen = ahv + pk;
    const target = Number(_saved.retirementBudget) || Number(_saved.monthlyExpenses) || 5000;
    const gap = Math.max(0, target - einnahmen);
    const surplus = Math.max(0, einnahmen - target);

    // 3a — korrekte Schlüssel
    const j3a1Bal = Number(p1.pillar3aBalance) || 0;
    const j3a2Bal = isPaar ? (Number(p2.pillar3aBalance) || 0) : 0;
    const j3aGuthaben = j3a1Bal + j3a2Bal;
    const j3aJaehrlich = (Number(p1.pillar3aYearly) || 0) + (isPaar ? Number(p2.pillar3aYearly) || 0 : 0);
    // Projektion: Guthaben + jährliche Beiträge bis Pensionierung (2% rendite)
    const yearsToRet = Math.max(0, retirementAge - currentAge);
    const j3aProjektion = j3aGuthaben * Math.pow(1.02, yearsToRet) + j3aJaehrlich * (Math.pow(1.02, yearsToRet) - 1) / 0.02;
    const j3aAnlageform = p1.pillar3aForm || (isPaar ? p2.pillar3aForm : null) || "wertschriften";

    // Freizügigkeit
    const freizuegigkeit = (Number(p1.fzBalance) || 0) + (isPaar ? Number(p2.fzBalance) || 0 : 0);
    const pkKapital = pkCap1 + (isPaar ? pkCap2 : 0);

    // Vermögen — korrekte Top-Level-Keys
    const bargeld = Number(_saved.cash) || 0;
    const wertschriften = Number(_saved.securities) || 0;
    const propertyValue = Number(_saved.property && _saved.property.value) || Number(_saved.propertyValue) || 0;
    const hypothek = Number(_saved.property && (_saved.property.mortgage ?? _saved.property.hypothek)) || Number(_saved.hypothek) || 0;
    const hasProperty = !!(_saved.property && _saved.property.has) && propertyValue > 0;
    const belehnung = propertyValue > 0 ? hypothek / propertyValue : 0;

    const totalIncome = (Number(p1.grossIncome) || 0) + (Number(p2.grossIncome) || 0);
    const monthlyExpenses = Number(_saved.monthlyExpenses) || 0;
    const monthlySaving = Math.max(0, totalIncome / 12 - monthlyExpenses);

    // Kapital heute (für Anzeige): Säule-3a Guthaben heute, Freizügigkeit, Bargeld, Wertschriften.
    // startCapital für die Projektion = Kapital heute (projectWealth addiert Sparquote+3a-Wachstum bis Pensionierung selbst).
    // Hinweis: j3aProjektion enthält bereits Wachstum + jährliche Beiträge bis Pensionierung. Damit wir nichts doppelt zählen,
    // verwenden wir für die Projektion das HEUTIGE 3a-Guthaben und überlassen das Wachstum der projectWealth-Funktion.
    const kapitalHeute = j3aGuthaben + freizuegigkeit + bargeld + wertschriften;
    const startCapital = kapitalHeute;
    // Sparquote inkl. 3a-Beiträge in monatlicher Form (für projectWealth)
    const monthlySavingTotal = monthlySaving + j3aJaehrlich / 12;
    const additionalSaved = Math.max(0, monthlySavingTotal * 12 * yearsToRet);
    // Projiziertes Kapital bei Pensionierung (mit 2% Rendite):
    const projectedCapitalAtRet = startCapital * Math.pow(1.02, yearsToRet) + monthlySavingTotal * 12 * (Math.pow(1.02, yearsToRet) - 1) / 0.02;

    // Reach age (default scenario 2/1)
    const tl = projectWealth({
      currentAge, retirementAge, startCapital, monthlySaving: monthlySavingTotal,
      pensions: einnahmen, target, rendite: 0.02, inflation: 0.01, maxAge: 95,
    });
    const reachAge = findReachAge(tl);

    // Tragbarkeit: Hypothekarzinsen + Amort + NK ≤ 1/3 Rente
    const hypoKost = hypothek * 0.05; // kalkulatorisch 5%
    const nebenkosten = propertyValue * 0.01;
    const tragbarkeitOk = hasProperty ? (hypoKost + nebenkosten) <= (einnahmen * 12) / 3 : true;

    return {
      isPaar, currentAge, retirementAge, baseRetirementAge,
      ahv, pk, baseAhv, einnahmen, target, gap, surplus,
      pkBreakdown, ahvBreakdown: isPaar,
      j3aProjektion, j3aGuthaben, j3aJaehrlich, j3aAnlageform,
      freizuegigkeit, pkKapital, bargeld, wertschriften,
      propertyValue, hypothek, hasProperty, belehnung, tragbarkeitOk,
      totalIncome, monthlyExpenses, monthlySaving, startCapital,
      reachAge, capital: projectedCapitalAtRet, kapitalHeute, projectedCapitalAtRet, additionalSaved,
      kanton: _saved.kanton,
    };
  }, [savedSnapshot, isPaar, namesKey]);

  // Hero variant
  const result = useMemo(() => {
    let variant;
    if (ctx.gap === 0) variant = "good";
    else if (ctx.reachAge != null && ctx.reachAge >= 85) variant = "warn";
    else if (ctx.reachAge == null) variant = "warn"; // never depleted
    else variant = "bad";
    if (ctx.gap === 0) variant = "good";
    return { ...ctx, variant };
  }, [ctx]);

  return (
    <div className="app" data-screen-label="04 Analyse">
      <TopBar />
      <ProgressBar current={4} />
      <main>
        <div className="page-head">
          <div className="eyebrow">Schritt 4 · Analyse</div>
          <h1 className="title">{t("Reicht dein Geld in der Rente?", "Reicht euer Geld in der Rente?")}</h1>
          <p className="subtitle">
            {t("Hier siehst du das Ergebnis deiner Planung – und was du tun kannst.",
               "Hier seht ihr das Ergebnis eurer Planung – und was ihr tun könnt.")}
          </p>
        </div>

        <HeroResult result={result} isPaar={isPaar} t={t} setShowWhy={setShowWhy} showWhy={showWhy} />
        <PillarsBlock result={result} isPaar={isPaar} names={namesRaw} t={t} />
        <WealthBlock ctx={ctx} assumptions={assumptions} setAssumptions={setAssumptions} t={t} />
        <ScenariosBlock ctx={ctx} t={t} />
        <TimingBlock ctx={ctx} t={t} />
        <BezugBlock ctx={ctx} t={t} />
        <TaxBlock ctx={ctx} t={t} />
        <RecommendationsBlock ctx={ctx} t={t} />
        <OverviewBlock ctx={ctx} t={t} />
        <ActionsBlock t={t} />

        <div className="disclaimer-block">
          <h4>⚠️ Wichtiger Hinweis</h4>
          <p>WealthWise ersetzt keine professionelle Finanzberatung. Alle Berechnungen basieren auf vereinfachten Annahmen und Schätzungen. Die tatsächliche finanzielle Situation kann aufgrund individueller Faktoren abweichen.</p>
          <ul>
            <li>Steuerberechnungen sind Näherungswerte</li>
            <li>Renditen sind nicht garantiert</li>
            <li>Gesetzliche Rahmenbedingungen können sich ändern</li>
            <li>Persönliche Umstände sind nicht vollständig abgebildet</li>
          </ul>
          <p style={{ marginTop: 8 }}>Für verbindliche Entscheidungen empfehlen wir, eine qualifizierte Fachperson beizuziehen.</p>
        </div>
      </main>

      <div className="footer">
        <div className="footer-meta">Schritt 4 von 4 · Analyse</div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="WealthWise - Screen 3 Ausgaben.html" className="btn btn-ghost" style={{textDecoration:"none"}}>
            <Icon.ArrowLeft width={16} height={16} /> Zurück
          </a>
          <button className="btn btn-primary" onClick={() => {
            try { window.ww && window.ww.track && window.ww.track("wizard_complete", { screen: "screen_4_analyse" }); } catch (e) {}
            if (window.wwExportPDF) window.wwExportPDF(); else window.print();
          }}>
            Als PDF exportieren <Icon.Arrow width={16} height={16} />
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
      currentStep: "analyse",
      person1: s.person1 || null,
      person2: s.person2 || null,
      civilStatus: s.civilStatus,
      monthlyExpenses: s.monthlyExpenses,
      retirementBudget: s.retirementBudget,
      hasProperty: s.hasProperty,
      propertyValue: s.propertyValue,
      kanton: s.kanton,
    };
  };
  return (
    <>
      <App />
      {window.WWChatPanel ? <window.WWChatPanel currentStep="analyse" getContext={getCtx} /> : null}
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
