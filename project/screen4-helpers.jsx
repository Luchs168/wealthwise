/* =========================================================
   WealthWise · Screen 4 Helpers
   Pure-functional calculation + chart utilities for the analysis screen.
   Exposed on window as window.ww4 for use by app-screen4.jsx.
   ========================================================= */

const fmt = (n) => {
  if (n == null || isNaN(n)) return "0";
  const r = Math.round(n);
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(r);
};
const fmtSign = (n) => (n >= 0 ? "+ CHF " : "− CHF ") + fmt(Math.abs(n));

/* ---------- AHV Adjustments ---------- */
const AHV_FRUEHBEZUG_KUERZUNG = 0.068; // pro Jahr
const AHV_AUFSCHUB_FAKTOR = {
  0: 1.0, 1: 1.052, 2: 1.108, 3: 1.171, 4: 1.240, 5: 1.315
};
function adjustAHV(baseAHV, retirementAge, refAge = 65) {
  const diff = retirementAge - refAge;
  if (diff < 0) {
    // Vorbezug: -6.8% pro Jahr (linear)
    return baseAHV * (1 - AHV_FRUEHBEZUG_KUERZUNG * Math.abs(diff));
  } else if (diff > 0) {
    const yrs = Math.min(diff, 5);
    return baseAHV * AHV_AUFSCHUB_FAKTOR[yrs];
  }
  return baseAHV;
}

/* ---------- Kantonale Kapitalbezugssteuer (Näherung auf 500k) ---------- */
const KANTON_KAPITAL_RATES = {
  ZH: 0.065, BE: 0.080, LU: 0.055, ZG: 0.045, BS: 0.120,
  AG: 0.070, SG: 0.075, VD: 0.090, GE: 0.085, TI: 0.060,
};
function kantonRate(kanton) {
  const k = (kanton || "").toUpperCase().slice(0, 2);
  return KANTON_KAPITAL_RATES[k] != null ? KANTON_KAPITAL_RATES[k] : 0.07;
}
/** Vereinfachte progressive Kapitalbezugssteuer */
function kapitalbezugssteuer(amount, kanton) {
  if (!amount || amount <= 0) return 0;
  const rate = kantonRate(kanton);
  // Progressive Staffelung: kleinere Beträge tiefer besteuert
  const factor = amount < 100000 ? 0.6 : amount < 250000 ? 0.8 : 1.0;
  return Math.round(amount * rate * factor);
}

/* ---------- Vereinfachte Einkommenssteuer ---------- */
function incomeTax(income, kanton, isPaar) {
  if (!income || income <= 0) return 0;
  const baseRates = {
    ZH: 0.20, BE: 0.24, LU: 0.21, ZG: 0.14, BS: 0.25,
    AG: 0.22, SG: 0.22, VD: 0.26, GE: 0.27, TI: 0.23,
  };
  const k = (kanton || "").toUpperCase().slice(0, 2);
  let rate = baseRates[k] != null ? baseRates[k] : 0.22;
  // Progressiv: tieferes Einkommen → tieferer Satz
  const personalIncome = isPaar ? income / 2 : income;
  if (personalIncome < 60000) rate *= 0.55;
  else if (personalIncome < 90000) rate *= 0.75;
  else if (personalIncome < 130000) rate *= 0.92;
  else if (personalIncome > 200000) rate *= 1.08;
  return Math.round(income * rate);
}

/* ---------- Capital Projection ---------- */
/**
 * Project wealth year by year from current age to age 95.
 * Inputs:
 *   currentAge: starting age
 *   retirementAge: when income switches from saving to drawdown
 *   startCapital: liquid retirement capital today (3a + freizügigkeit + cash + securities)
 *   monthlySaving: pre-retirement monthly saving (sparquote)
 *   pensions: monthly pensions in retirement (AHV + PK rente component)
 *   target: monthly target income in retirement
 *   capitalAddedAtRetirement: e.g. PK Kapitalbezug, added at retirement year start
 *   rendite: yearly real return (decimal, e.g. 0.02)
 *   inflation: yearly inflation (decimal)
 *   maxAge: end of projection (default 95)
 * Returns: array of { age, year, wealth }
 */
function projectWealth({
  currentAge, retirementAge, startCapital, monthlySaving,
  pensions, target, capitalAddedAtRetirement = 0,
  rendite = 0.02, inflation = 0.01, maxAge = 95, currentYear = new Date().getFullYear()
}) {
  const out = [];
  let wealth = startCapital;
  let inflatedTarget = target;
  for (let age = currentAge; age <= maxAge; age++) {
    const year = currentYear + (age - currentAge);
    if (age < retirementAge) {
      // Aufbauphase
      wealth = wealth * (1 + rendite) + monthlySaving * 12;
    } else if (age === retirementAge) {
      // PK-Kapitalbezug zum Pensionierungsjahr
      wealth = wealth + capitalAddedAtRetirement;
      const gap = inflatedTarget - pensions;
      if (gap > 0) wealth = wealth - gap * 12;
      else wealth = wealth + (-gap) * 12 * 0.3; // Überschuss teilweise gespart
      wealth = wealth * (1 + rendite);
    } else {
      const gap = inflatedTarget - pensions;
      if (gap > 0) wealth = wealth - gap * 12;
      else wealth = wealth + (-gap) * 12 * 0.3;
      wealth = wealth * (1 + rendite);
      inflatedTarget = inflatedTarget * (1 + inflation);
    }
    out.push({ age, year, wealth: Math.max(wealth, -50000) });
    if (wealth < -50000) break;
  }
  return out;
}

/** Find age at which wealth crosses zero. Returns null if never. */
function findReachAge(timeline) {
  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i].wealth <= 0) return timeline[i].age;
  }
  return null;
}

/* ---------- SVG Path builder ---------- */
function buildPath(points, xScale, yScale) {
  if (!points.length) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${xScale(p.x).toFixed(1)},${yScale(p.y).toFixed(1)}`).join(" ");
}

/* ---------- Chart-Karte: Wealth Line Chart (single or multi) ---------- */
function WealthChart({ series, retirementAge, currentAge, height = 320, showZero = true }) {
  // series: [{ name, color, points: [{age, wealth}] }]
  if (!series || !series.length) return null;
  const W = 800, H = height, padL = 64, padR = 16, padT = 16, padB = 36;
  const allPts = series.flatMap(s => s.points);
  if (!allPts.length) return null;
  const minAge = currentAge;
  const maxAge = Math.max(...allPts.map(p => p.age));
  const maxW = Math.max(...allPts.map(p => p.wealth), 100000);
  const minW = Math.min(...allPts.map(p => p.wealth), 0);

  const xScale = (age) => padL + ((age - minAge) / (maxAge - minAge || 1)) * (W - padL - padR);
  const yScale = (w) => padT + (1 - (w - minW) / (maxW - minW || 1)) * (H - padT - padB);

  // Y-axis ticks (5 levels)
  const yTicks = [];
  const step = (maxW - minW) / 4;
  for (let i = 0; i <= 4; i++) yTicks.push(minW + step * i);
  // X-axis ticks (every 5y)
  const xTicks = [];
  for (let a = Math.ceil(minAge / 5) * 5; a <= maxAge; a += 5) xTicks.push(a);

  return (
    <svg className="chart-canvas" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {/* Grid lines */}
      {yTicks.map((t, i) => (
        <g key={`y${i}`}>
          <line className="grid" x1={padL} x2={W - padR} y1={yScale(t)} y2={yScale(t)} />
          <text className="axis-label" x={padL - 8} y={yScale(t) + 3} textAnchor="end">
            {t >= 1000000 ? `${(t / 1000000).toFixed(1)}M` : t >= 1000 ? `${Math.round(t / 1000)}k` : Math.round(t)}
          </text>
        </g>
      ))}
      {xTicks.map((a, i) => (
        <g key={`x${i}`}>
          <line className="grid" x1={xScale(a)} x2={xScale(a)} y1={padT} y2={H - padB} />
          <text className="axis-label" x={xScale(a)} y={H - padB + 16} textAnchor="middle">{a}</text>
        </g>
      ))}
      {/* Zero line */}
      {showZero && minW < 0 && (
        <line className="zero-line" x1={padL} x2={W - padR} y1={yScale(0)} y2={yScale(0)} />
      )}
      {/* Pension marker */}
      {retirementAge >= minAge && retirementAge <= maxAge && (
        <g>
          <line className="pension-line" x1={xScale(retirementAge)} x2={xScale(retirementAge)} y1={padT} y2={H - padB} />
          <text className="axis-label" x={xScale(retirementAge)} y={padT - 4} textAnchor="middle">
            Pensionierung
          </text>
        </g>
      )}
      {/* Series lines */}
      {series.map((s, i) => {
        const path = buildPath(s.points.map(p => ({ x: p.age, y: p.wealth })), xScale, yScale);
        return (
          <path
            key={i}
            className={`vermoegen ${s.cls || ""}`}
            d={path}
            stroke={s.color}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
      {/* Marker where main series crosses zero */}
      {series[0] && (() => {
        const zeroPt = series[0].points.find(p => p.wealth <= 0);
        if (!zeroPt) return null;
        return <circle className="marker" cx={xScale(zeroPt.age)} cy={yScale(0)} r={6} />;
      })()}
      {/* Axis lines */}
      <line className="axis" x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} />
      <line className="axis" x1={padL} x2={padL} y1={padT} y2={H - padB} />
      {/* Axis titles */}
      <text className="axis-label" x={W - padR} y={H - padB + 30} textAnchor="end">Alter</text>
      <text className="axis-label" x={padL} y={padT - 4} textAnchor="start">Vermögen (CHF)</text>
    </svg>
  );
}

/* ---------- Recommendations ---------- */
function generateRecommendations(ctx) {
  const recs = [];
  const yearsToRetire = Math.max(0, ctx.retirementAge - ctx.currentAge);
  const monthlyGap = ctx.gap;
  const reachAge = ctx.reachAge;

  // 1. PK-Einkauf
  if (yearsToRetire >= 3 && ctx.pkKapital > 0) {
    const einkaufBetrag = Math.min(yearsToRetire * 15000, 100000);
    const renteIncrease = Math.round(einkaufBetrag * 0.055 / 12);
    recs.push({
      key: "pk-einkauf",
      icon: "🏦",
      priority: "mid",
      title: "Pensionskassen-Einkauf prüfen",
      text: "Ein freiwilliger Einkauf in die Pensionskasse erhöht euer Alterskapital und ist steuerlich voll absetzbar. Besonders sinnvoll in den letzten Jahren vor der Pensionierung – wenn das Einkommen am höchsten ist.",
      potential: `Bei einem Einkauf von CHF ${fmt(einkaufBetrag)} steigt die monatliche Rente um ca. CHF ${fmt(renteIncrease)}. Die Steuerersparnis im Einkaufsjahr beträgt typisch 25–35% des Einkaufsbetrags.`,
      detail: "Wichtig: Nach einem Einkauf darf das Kapital frühestens 3 Jahre später als Kapital bezogen werden (sonst Aufrechnung). Maximaler Einkauf gemäss persönlichem Vorsorgeausweis (Rubrik 'Maximal möglicher Einkauf')."
    });
  }

  // 2. 3a maximieren
  if (ctx.j3aJaehrlich != null && ctx.j3aJaehrlich < 7258) {
    const diff = 7258 - (ctx.j3aJaehrlich || 0);
    const total = diff * yearsToRetire;
    recs.push({
      key: "saeule-3a",
      icon: "💰",
      priority: diff > 3000 ? "high" : "mid",
      title: "Säule 3a ausschöpfen",
      text: "Ihr nutzt das 3a-Maximum (CHF 7'258 in 2025) noch nicht voll aus. Jeder zusätzlich einbezahlte Franken ist vom steuerbaren Einkommen abziehbar und wird steuerfrei verzinst.",
      potential: `Differenz: CHF ${fmt(diff)} pro Jahr. Bis zur Pensionierung = CHF ${fmt(total)} mehr Kapital (ohne Rendite). Mit 2% Rendite über ${yearsToRetire} Jahre: ca. CHF ${fmt(total * 1.1)}.`,
      detail: "Tipp: Mehrere 3a-Konten staffeln (typisch 3–5), damit der Bezug bei Pensionierung gestaffelt erfolgen kann – das senkt die Kapitalbezugssteuer dank Progressionsbruch deutlich."
    });
  }

  // 3. Pensionierung verschieben
  if (reachAge != null && reachAge < 85) {
    recs.push({
      key: "pension-aufschub",
      icon: "⏰",
      priority: reachAge < 78 ? "high" : "mid",
      title: "Pensionierung aufschieben",
      text: "Ein späterer Pensionierungszeitpunkt wirkt mehrfach: höhere AHV (+5.2% pro Jahr Aufschub), zusätzliche PK-Beiträge, mehr Kapitalverzinsung und weniger Entnahmejahre.",
      potential: "Bereits 2 Jahre länger arbeiten verlängert die Reichweite des Kapitals typisch um 4–6 Jahre. Im Slider unten könnt ihr den Effekt direkt simulieren.",
      detail: "Der AHV-Aufschub ist bis maximal 5 Jahre (Alter 70) möglich. Der Zuschlag ist lebenslang. Bei der PK gibt es kantonal/kassenspezifisch unterschiedliche Modelle für eine Weiterversicherung über 65 hinaus."
    });
  }

  // 4. Ausgaben reduzieren
  if (monthlyGap > 1000) {
    recs.push({
      key: "ausgaben",
      icon: "📉",
      priority: monthlyGap > 2500 ? "high" : "mid",
      title: "Zielbudget anpassen",
      text: "Eine Reduktion des Zielbudgets um CHF 500 pro Monat verlängert die Reichweite des Kapitals um typisch 3–5 Jahre und reduziert den Druck im Alter spürbar.",
      potential: `Aktuelle Lücke: CHF ${fmt(monthlyGap)}/Monat. Schon CHF 300 weniger pro Monat reduzieren den Kapitalverzehr jährlich um CHF ${fmt(3600)}.`,
      detail: "Häufigste Reduktionsfelder im Alter: Mobilität (Zweitwagen?), Wohnen (kleinere Wohnung nach Auszug der Kinder), Ferien (Saisonpläne statt Spontanreisen)."
    });
  }

  // 5. Hypothek
  if (ctx.hasProperty && ctx.belehnung > 0.5) {
    recs.push({
      key: "hypothek",
      icon: "🏠",
      priority: "mid",
      title: "Hypothek vor Pensionierung prüfen",
      text: "Bei der Pensionierung berechnen Banken die Tragbarkeit auf Basis des Renteneinkommens. Liegt die Belehnung über 50–65% oder die Tragbarkeit über einem Drittel, wird oft eine Amortisation verlangt.",
      potential: `Aktuelle Belehnung: ${Math.round(ctx.belehnung * 100)}%. Eine Amortisation auf 65% reduziert das Risiko einer Refinanzierungs-Verweigerung im Alter.`,
      detail: "Eine indirekte Amortisation über die Säule 3a ist steuerlich attraktiver als direkte Amortisation, solange das Hypothekarvolumen die kalkulatorische Tragbarkeit zulässt."
    });
  }

  // 6. 3a in Wertschriften
  if (ctx.j3aAnlageform === "konto" && yearsToRetire >= 5) {
    const guthaben = ctx.j3aGuthaben || 0;
    const diff = guthaben * 0.025 * yearsToRetire; // grobe Differenz
    recs.push({
      key: "3a-wertschriften",
      icon: "📈",
      priority: yearsToRetire >= 8 ? "high" : "low",
      title: "3a in Wertschriften umschichten",
      text: `Bei einem Anlagehorizont von ${yearsToRetire} Jahren bieten Wertschriften historisch eine deutlich höhere Rendite als ein 3a-Sparkonto (heute oft <1%). Die Volatilität glättet sich über lange Zeiträume.`,
      potential: `Schätzung der Differenz Sparkonto vs. Wertschriften (40–60% Aktienanteil) bis zur Pensionierung: ca. CHF ${fmt(diff)} mehr.`,
      detail: "Übliche Anbieter: VIAC, frankly, Finpension. Achten auf TER unter 0.5% und globale Diversifikation. Aktienanteil typisch 60–80% bei 8+ Jahren Anlagehorizont."
    });
  }

  // 7. Beratung (immer)
  recs.push({
    key: "beratung",
    icon: "👤",
    priority: "low",
    title: "Persönliche Beratung in Betracht ziehen",
    text: "Für die definitive Umsetzung empfehlen wir ein Gespräch mit einer unabhängigen Fachperson. WealthWise gibt eine fundierte Orientierung – eine individuelle Beratung berücksichtigt steuerliche, erbrechtliche und persönliche Faktoren.",
    potential: "Mit dieser Analyse seid ihr optimal vorbereitet. Bringt sie zum Beratungsgespräch mit – das spart Zeit und führt zu konkreteren Empfehlungen.",
    detail: "Tipp: Bevorzugt unabhängige Beratung (gegen Honorar) statt provisionsbasierter Beratung. So sind die Empfehlungen frei von Produktinteressen."
  });

  return recs.slice(0, 6);
}

/* ---------- Expose ---------- */
window.ww4 = {
  fmt, fmtSign,
  adjustAHV, AHV_AUFSCHUB_FAKTOR, AHV_FRUEHBEZUG_KUERZUNG,
  kantonRate, kapitalbezugssteuer, incomeTax,
  projectWealth, findReachAge,
  WealthChart,
  generateRecommendations,
};
