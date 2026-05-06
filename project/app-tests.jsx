/**
 * WealthWise Tests
 * ================
 * Interaktive Test-Szenarien für die Berechnungs-Engine.
 * Lädt: wealthwise-calc.js + wealthwise-cashflow.js
 */
const { useState, useMemo } = React;
const WW = window.WW;
const fmt = WW.fmtCHF;

/* -------- Test Cases -------- */
const TESTS = [
  {
    id: 'thomas',
    title: 'Test 1 · Ehepaar, beide arbeiten, komfortabel',
    desc: 'Thomas (55) und Sandra (53), gut situiert, knapp aber machbar.',
    expectation: 'Erwartung: Gelb/Grün – tendenziell ausgeglichen.',
    data: {
      civilStatus: 'verheiratet',
      person1: {
        birthDate: '1971-04-12', gender: 'm', grossIncome: 120000,
        retirementAge: 63, ahvContributionYears: 44, ahvContributionGaps: 0,
        hasChildCredits: true, numberOfChildren: 2,
        pkCapitalAt65: 480000, pkConversionRate: 5.4, pkBezugsart: 'rente',
        has3a: true, pillar3aBalance: 85000, pillar3aAccounts: 2,
      },
      person2: {
        birthDate: '1973-08-21', gender: 'f', grossIncome: 75000,
        retirementAge: 65, ahvContributionYears: 44, ahvContributionGaps: 4,
        hasChildCredits: true, numberOfChildren: 2,
        pkCapitalAt65: 210000, pkConversionRate: 5.4, pkBezugsart: 'rente',
        has3a: true, pillar3aBalance: 62000, pillar3aAccounts: 1,
      },
      freeAssets: 200000,
      monthlyExpenses: 7000,
      riskProfile: 'balanced',
    },
  },
  {
    id: 'maria',
    title: 'Test 2 · Alleinstehend, tiefer Lohn',
    desc: 'Maria (58), ledig, knappe Vorsorgesituation.',
    expectation: 'Erwartung: Gelb – es wird knapp.',
    data: {
      civilStatus: 'ledig',
      person1: {
        birthDate: '1968-02-10', gender: 'f', grossIncome: 55000,
        retirementAge: 65, ahvContributionYears: 44, ahvContributionGaps: 2,
        pkCapitalAt65: 180000, pkConversionRate: 6.8, pkBezugsart: 'rente',
        has3a: true, pillar3aBalance: 45000, pillar3aAccounts: 1,
      },
      freeAssets: 50000,
      monthlyExpenses: 4500,
      riskProfile: 'conservative',
    },
  },
  {
    id: 'peter',
    title: 'Test 3 · Gutverdienend, Frühpensionierung',
    desc: 'Peter (52), Frühpensionierung mit 60 — 5 Jahre ohne AHV/PK!',
    expectation: 'Erwartung: Rot – 5 Jahre Vorbezugslücke.',
    data: {
      civilStatus: 'geschieden',
      person1: {
        birthDate: '1974-11-03', gender: 'm', grossIncome: 180000,
        retirementAge: 60, ahvContributionYears: 44, ahvContributionGaps: 0,
        pkCapitalAt65: 800000, pkConversionRate: 5.0, pkBezugsart: 'mix', pkKapitalanteil: 50,
        has3a: true, pillar3aBalance: 120000, pillar3aAccounts: 3,
      },
      freeAssets: 500000,
      monthlyExpenses: 10000,
      riskProfile: 'growth',
    },
  },
  {
    id: 'rentekap',
    title: 'Test 4 · Rente vs. Kapital — Break-Even',
    desc: 'PK-Kapital 600k, Umwandlungssatz 5.4%. Break-Even ~80–83 Jahre.',
    expectation: 'Erwartung: Break-Even-Alter zwischen 80 und 84.',
    isComparison: true,
    data: {
      person: {
        birthDate: '1960-01-01', gender: 'm',
        retirementAge: 65, pkCapitalAt65: 600000, pkConversionRate: 5.4,
      },
    },
  },

  // ---------- PRO FEATURES ----------
  {
    id: 'bridging',
    title: 'Test 5 · Überbrückungsrente bei Frühpensionierung',
    desc: 'Peter, 55, CHF 150k, PK 600k, Pension mit 60, AHV erst ab 63 (Vorbezug).',
    expectation: 'Erwartung: 3 Jahre Überbrückung, Kosten ~CHF 90\'000–110\'000.',
    kind: 'bridging',
    data: {
      civilStatus: 'ledig',
      person1: {
        birthDate: '1971-01-01', gender: 'm', grossIncome: 150000,
        retirementAge: 60, ahvStartAge: 63,
        ahvContributionYears: 44, ahvContributionGaps: 0,
        pkCapitalAt65: 600000, pkConversionRate: 5.4, pkBezugsart: 'rente',
        has3a: true, pillar3aBalance: 80000, pillar3aAccounts: 2,
      },
      freeAssets: 200000,
      monthlyExpenses: 6500,
      riskProfile: 'balanced',
    },
  },
  {
    id: 'einkauf',
    title: 'Test 6 · PK-Einkauf Rechner',
    desc: 'Einkauf CHF 50\'000, 5 Jahre vor Pension. Steuerersparnis ~30%.',
    expectation: 'Erwartung: Zusatzrente ~CHF 180/Mt., Steuerersparnis ~CHF 15\'000.',
    kind: 'einkauf',
    data: {
      civilStatus: 'ledig',
      person1: {
        birthDate: '1966-01-01', gender: 'm', grossIncome: 120000,
        retirementAge: 65, ahvContributionYears: 44,
        pkCapitalAt65: 500000, pkConversionRate: 5.4, pkBezugsart: 'rente',
        has3a: true, pillar3aBalance: 60000,
      },
      freeAssets: 100000,
      monthlyExpenses: 5500,
      pkEinkaufBetrag: 50000,
      riskProfile: 'balanced',
    },
  },
  {
    id: 'tax',
    title: 'Test 7 · Steuervergleich vor/nach Pensionierung',
    desc: 'CHF 120k Lohn vs. Renteneinkommen. Typischerweise 30-50% tiefere Steuern.',
    expectation: 'Erwartung: Jährliche Steuerersparnis CHF 5\'000–15\'000.',
    kind: 'tax',
    data: {
      civilStatus: 'ledig',
      person1: {
        birthDate: '1964-01-01', gender: 'm', grossIncome: 120000,
        retirementAge: 65, ahvContributionYears: 44,
        pkCapitalAt65: 500000, pkConversionRate: 5.4, pkBezugsart: 'rente',
        has3a: true, pillar3aBalance: 70000,
      },
      freeAssets: 150000,
      monthlyExpenses: 6000,
      riskProfile: 'balanced',
    },
  },
  {
    id: 'ahvtiming',
    title: 'Test 8 · AHV Vorbezug vs. Normal vs. Aufschub',
    desc: 'Max-Rente (CHF 2\'520). Break-Even Vorbezug bei ~78, Aufschub ~79.',
    expectation: 'Erwartung: 5 Optionen mit Break-Even-Analyse und Empfehlung.',
    kind: 'ahvtiming',
    data: {
      civilStatus: 'ledig',
      person1: {
        birthDate: '1964-01-01', gender: 'm', grossIncome: 100000,
        retirementAge: 65, ahvContributionYears: 44,
        pkCapitalAt65: 400000, pkConversionRate: 5.4, pkBezugsart: 'rente',
      },
      monthlyExpenses: 5000,
    },
  },
  {
    id: 'mortgage',
    title: 'Test 9 · Hypothek-Tragbarkeit im Alter',
    desc: 'Liegenschaft CHF 800k, Hypothek CHF 500k. Vor Pension tragbar, danach kritisch.',
    expectation: 'Erwartung: Jetzt tragbar (~28%), Pension NICHT tragbar (~39%), Amortisation ~CHF 150k.',
    kind: 'mortgage',
    data: {
      civilStatus: 'verheiratet',
      person1: {
        birthDate: '1966-01-01', gender: 'm', grossIncome: 100000,
        retirementAge: 65, ahvContributionYears: 44,
        pkCapitalAt65: 400000, pkConversionRate: 5.4, pkBezugsart: 'rente',
      },
      person2: {
        birthDate: '1968-01-01', gender: 'f', grossIncome: 20000,
        retirementAge: 65, ahvContributionYears: 40, ahvContributionGaps: 4,
        pkCapitalAt65: 100000, pkConversionRate: 5.4, pkBezugsart: 'rente',
      },
      freeAssets: 100000,
      monthlyExpenses: 6500,
      hasProperty: true,
      propertyValue: 800000,
      mortgageRemaining: 500000,
      riskProfile: 'balanced',
    },
  },
];

/* -------- Status Badge -------- */
function Status({ ok, label }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 999,
      fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600,
      letterSpacing: '0.04em', textTransform: 'uppercase',
      background: ok ? '#ecfdf5' : '#fef2f2',
      color: ok ? '#15803d' : '#b91c1c',
      border: `1px solid ${ok ? '#a7f3d0' : '#fecaca'}`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%',
        background: ok ? '#22c55e' : '#ef4444',
      }} />
      {label}
    </span>
  );
}

/* -------- Standard Test -------- */
function StandardTest({ test }) {
  const result = useMemo(() => WW.calculateProAnalysis(test.data), [test]);
  const score = WW.calculateSustainabilityScore(result);
  const ahv = result.ahv;
  const pk = result.pk;
  // Deckungsgrad: Renten + Vermögensverzehr über Restlebenserwartung
  const retireAge = Math.min(
    test.data.person1.plannedRetirementAge || 65,
    test.data.person2 ? (test.data.person2.plannedRetirementAge || 65) : 999
  );
  const yearsInRetirement = Math.max(1, 90 - retireAge); // Planhorizont 90
  const totalAssets = (test.data.freeAssets || 0)
    + (test.data.person1.thirdPillar?.balance || 0)
    + (test.data.person2?.thirdPillar?.balance || 0);
  const assetDrawdownMonthly = totalAssets / (yearsInRetirement * 12);
  const effectiveIncome = result.monthlyIncome.total + assetDrawdownMonthly;
  const cov = result.monthlyExpenses > 0
    ? effectiveIncome / result.monthlyExpenses : 1;
  // Verdict berücksichtigt auch, ob Vermögen lebenslang reicht
  const lastsForLife = !result.ageWhenBroke || result.ageWhenBroke >= 90;
  const verdict = (cov >= 1.0 && lastsForLife) ? 'green'
    : (cov >= 0.9) ? 'yellow' : 'red';
  const verdictLabel = verdict === 'green' ? 'Grün' : verdict === 'yellow' ? 'Gelb' : 'Rot';

  return (
    <div className="tc">
      <div className="tc-head">
        <div>
          <div className="tc-title">{test.title}</div>
          <div className="tc-desc">{test.desc}</div>
        </div>
        <Status ok={verdict === 'green'} label={`Verdict: ${verdictLabel}`} />
      </div>

      <div className="tc-grid">
        <div className="metric">
          <div className="m-label">AHV (Plafoniert)</div>
          <div className="m-val">CHF {fmt(ahv.combinedMonthly)}<span className="u">/ Mt.</span></div>
          <div className="m-sub">
            P1: {fmt(ahv.person1.monthlyRente)}
            {ahv.person2 ? ` · P2: ${fmt(ahv.person2.monthlyRente)}` : ''}
            {ahv.plafonReduction > 0 ? ` · Plafond-Kürzung: ${fmt(ahv.plafonReduction)}` : ''}
          </div>
        </div>
        <div className="metric">
          <div className="m-label">PK-Rente</div>
          <div className="m-val">CHF {fmt(pk.combinedMonthly)}<span className="u">/ Mt.</span></div>
          <div className="m-sub">
            P1: {fmt(pk.person1.monthlyRente)}
            {pk.person2 ? ` · P2: ${fmt(pk.person2.monthlyRente)}` : ''}
          </div>
        </div>
        <div className="metric">
          <div className="m-label">Verfügbar / Mt. (inkl. Vermögen)</div>
          <div className="m-val">CHF {fmt(effectiveIncome)}</div>
          <div className="m-sub">Renten {fmt(result.monthlyIncome.total)} + Verzehr {fmt(assetDrawdownMonthly)} · Ausgaben {fmt(result.monthlyExpenses)}</div>
        </div>
        <div className="metric">
          <div className="m-label">Deckungsgrad</div>
          <div className="m-val" style={{ color: verdict === 'green' ? '#15803d' : verdict === 'yellow' ? '#b45309' : '#b91c1c' }}>
            {(cov * 100).toFixed(0)}%
          </div>
          <div className="m-sub">Differenz: {result.surplus >= 0 ? '+' : '−'} CHF {fmt(Math.abs(result.surplus))} / Mt.</div>
        </div>
        <div className="metric">
          <div className="m-label">Vermögen aufgebraucht</div>
          <div className="m-val" style={{ color: result.ageWhenBroke ? '#b91c1c' : '#15803d' }}>
            {result.ageWhenBroke ? `mit ${result.ageWhenBroke}` : 'reicht'}
          </div>
          <div className="m-sub">{result.ageWhenBroke ? 'Liquidität endet vorzeitig' : 'Lebenslang gedeckt'}</div>
        </div>
        <div className="metric">
          <div className="m-label">Sustainability Score</div>
          <div className="m-val">{score} / 100</div>
          <div className="score-bar"><i style={{ width: `${score}%`, background: score >= 70 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444' }}/></div>
        </div>
      </div>

      <div className="tc-expect">{test.expectation}</div>
    </div>
  );
}

/* -------- Rente vs Kapital Test -------- */
function ComparisonTest({ test }) {
  const result = useMemo(() => WW.calculateRenteVsKapital(test.data.person, {
    yearsInRetirement: 25,
    investmentReturn: 0.025,
  }), [test]);

  return (
    <div className="tc">
      <div className="tc-head">
        <div>
          <div className="tc-title">{test.title}</div>
          <div className="tc-desc">{test.desc}</div>
        </div>
        <Status ok={result.breakEvenAge >= 78 && result.breakEvenAge <= 86}
                label={`Break-Even: ${result.breakEvenAge}`} />
      </div>

      <div className="rk-grid">
        <div className="rk">
          <div className="rk-h">100% Rente</div>
          <div className="rk-amt">CHF {fmt(result.option_rente.monthlyIncome)}<span>/ Mt.</span></div>
          <div className="rk-tot">Total über 25 J.: CHF {fmt(result.option_rente.totalOverPeriod)}</div>
          <div className="rk-tax">Kapitalsteuer: —</div>
        </div>
        <div className="rk">
          <div className="rk-h">100% Kapital</div>
          <div className="rk-amt">CHF {fmt(result.option_kapital.monthlyIncome)}<span>/ Mt.</span></div>
          <div className="rk-tot">Total über 25 J.: CHF {fmt(result.option_kapital.totalOverPeriod)}</div>
          <div className="rk-tax">Kapitalsteuer: CHF {fmt(result.option_kapital.capitalTax)}</div>
          {result.option_kapital.yearWhenExhausted && (
            <div className="rk-warn">⚠ Aufgebraucht mit {result.option_kapital.yearWhenExhausted}</div>
          )}
        </div>
        <div className="rk recommended">
          <div className="rk-h">Mix 50/50</div>
          <div className="rk-amt">CHF {fmt(result.option_mix.monthlyIncome)}<span>/ Mt.</span></div>
          <div className="rk-tot">Total über 25 J.: CHF {fmt(result.option_mix.totalOverPeriod)}</div>
          <div className="rk-tax">Kapitalsteuer: CHF {fmt(result.option_mix.capitalTax)}</div>
        </div>
      </div>

      <div className="tc-expect">
        {test.expectation} ·
        Lebenserwartung: {result.lifeExpectancy} ·
        Empfehlung: <b>{result.recommendation === 'rente_tendenz' ? 'Rente tendenziell' : 'Kapital tendenziell'}</b>
      </div>
    </div>
  );
}

/* -------- App -------- */
function BridgingTest({ test }) {
  const result = useMemo(() => WW.calculateProAnalysis(test.data), [test]);
  const b = result.bridgingPension;
  const inRange = b.totalBridgingCost >= 60000 && b.totalBridgingCost <= 130000;
  return (
    <div className="tc">
      <div className="tc-head">
        <div>
          <div className="tc-title">{test.title}</div>
          <div className="tc-desc">{test.desc}</div>
        </div>
        <Status ok={b.needsBridging && inRange} label={b.needsBridging ? `${b.bridgingYears} Jahre` : 'Keine Überbrückung'} />
      </div>
      <div className="tc-grid">
        <div className="metric">
          <div className="m-label">Überbrückungsjahre</div>
          <div className="m-val">{b.bridgingYears} J.</div>
          <div className="m-sub">Pension mit {test.data.person1.retirementAge}, AHV ab {test.data.person1.ahvStartAge || 65}</div>
        </div>
        <div className="metric">
          <div className="m-label">Monatliche Lücke</div>
          <div className="m-val">CHF {fmt(b.monthlyGapDuringBridging)}</div>
          <div className="m-sub">Ausgaben minus PK-Rente</div>
        </div>
        <div className="metric">
          <div className="m-label">Totale Überbrückungskosten</div>
          <div className="m-val" style={{ color: '#b91c1c' }}>CHF {fmt(b.totalBridgingCost)}</div>
          <div className="m-sub">Finanzierung nötig aus Vermögen / PK-Kapital</div>
        </div>
      </div>
      <div className="tc-list">
        <div className="tc-list-h">Finanzierungsquellen</div>
        <ul>{b.fundingSources.map((s, i) => <li key={i}>{s}</li>)}</ul>
      </div>
      <div className="tc-expect">{test.expectation}</div>
    </div>
  );
}

function EinkaufTest({ test }) {
  const result = useMemo(() => WW.calculateProAnalysis(test.data), [test]);
  const e = result.pkEinkauf;
  if (!e) return <div className="tc"><div className="tc-title">{test.title}</div><div className="tc-desc">Kein Einkauf-Betrag in Daten.</div></div>;
  const ok = e.additionalMonthlyRente >= 100 && e.additionalMonthlyRente <= 300;
  return (
    <div className="tc">
      <div className="tc-head">
        <div>
          <div className="tc-title">{test.title}</div>
          <div className="tc-desc">{test.desc}</div>
        </div>
        <Status ok={ok} label={`+CHF ${fmt(e.additionalMonthlyRente)}/Mt.`} />
      </div>
      <div className="tc-grid">
        <div className="metric">
          <div className="m-label">Einkauf-Betrag</div>
          <div className="m-val">CHF {fmt(e.einkaufBetrag)}</div>
          <div className="m-sub">{e.yearsBeforeRetirement} Jahre vor Pension</div>
        </div>
        <div className="metric">
          <div className="m-label">Zusätzliches Kapital @ 65</div>
          <div className="m-val">CHF {fmt(e.additionalCapital)}</div>
          <div className="m-sub">inkl. PK-Zins 2% p.a.</div>
        </div>
        <div className="metric">
          <div className="m-label">Zusatzrente / Mt.</div>
          <div className="m-val" style={{ color: '#15803d' }}>+CHF {fmt(e.additionalMonthlyRente)}</div>
          <div className="m-sub">UWS {test.data.person1.pkConversionRate}%</div>
        </div>
        <div className="metric">
          <div className="m-label">Steuerersparnis</div>
          <div className="m-val">CHF {fmt(e.taxSavingOnPurchase)}</div>
          <div className="m-sub">~30% marginaler Steuersatz</div>
        </div>
        <div className="metric">
          <div className="m-label">Netto-Kosten</div>
          <div className="m-val">CHF {fmt(e.netCost)}</div>
          <div className="m-sub">Einkauf minus Steuerersparnis</div>
        </div>
        <div className="metric">
          <div className="m-label">ROI</div>
          <div className="m-val" style={{ color: e.returnOnInvestment >= 1 ? '#15803d' : '#b45309' }}>{e.returnOnInvestment.toFixed(2)}×</div>
          <div className="m-sub">Zusatzrente über Lebenszeit / Netto-Kosten</div>
        </div>
      </div>
      {e.warning && <div className="tc-warn">⚠ {e.warning}</div>}
      <div className="tc-reco">{e.recommendation}</div>
      <div className="tc-expect">{test.expectation}</div>
    </div>
  );
}

function TaxTest({ test }) {
  const result = useMemo(() => WW.calculateProAnalysis(test.data), [test]);
  const t = result.taxComparison;
  const ok = t.yearlyTaxSaving >= 2000;
  return (
    <div className="tc">
      <div className="tc-head">
        <div>
          <div className="tc-title">{test.title}</div>
          <div className="tc-desc">{test.desc}</div>
        </div>
        <Status ok={ok} label={`−CHF ${fmt(t.yearlyTaxSaving)}/Jahr`} />
      </div>
      <div className="tc-compare">
        <div className="tc-col">
          <div className="tc-col-h">Vor Pensionierung</div>
          <div className="tc-row"><span>Bruttoeinkommen</span><b>CHF {fmt(t.beforeRetirement.grossIncome)}</b></div>
          <div className="tc-row"><span>Abzüge</span><b>−CHF {fmt(t.beforeRetirement.deductions)}</b></div>
          <div className="tc-row"><span>Steuerbar</span><b>CHF {fmt(t.beforeRetirement.taxableIncome)}</b></div>
          <div className="tc-row"><span>Effektiver Satz</span><b>{(t.beforeRetirement.effectiveRate * 100).toFixed(0)}%</b></div>
          <div className="tc-row tc-row-total"><span>Steuern / Jahr</span><b style={{ color: '#b91c1c' }}>CHF {fmt(t.beforeRetirement.estimatedTax)}</b></div>
        </div>
        <div className="tc-col">
          <div className="tc-col-h">Nach Pensionierung</div>
          <div className="tc-row"><span>AHV (inkl. 13.)</span><b>CHF {fmt(t.afterRetirement.ahvIncome)}</b></div>
          <div className="tc-row"><span>PK-Rente</span><b>CHF {fmt(t.afterRetirement.pkRenteIncome)}</b></div>
          <div className="tc-row"><span>Abzüge</span><b>−CHF {fmt(t.afterRetirement.deductions)}</b></div>
          <div className="tc-row"><span>Steuerbar</span><b>CHF {fmt(t.afterRetirement.taxableIncome)}</b></div>
          <div className="tc-row"><span>Effektiver Satz</span><b>{(t.afterRetirement.effectiveRate * 100).toFixed(0)}%</b></div>
          <div className="tc-row tc-row-total"><span>Steuern / Jahr</span><b style={{ color: '#15803d' }}>CHF {fmt(t.afterRetirement.estimatedTax)}</b></div>
        </div>
        <div className="tc-col tc-col-savings">
          <div className="tc-col-h">Ersparnis</div>
          <div className="m-val" style={{ color: '#15803d', fontSize: 32, margin: '16px 0 4px' }}>CHF {fmt(t.yearlyTaxSaving)}</div>
          <div className="m-sub">pro Jahr</div>
          <div className="tc-row tc-row-total"><span>Über 20 Jahre</span><b style={{ color: '#15803d' }}>CHF {fmt(t.totalTaxSavingOver20Years)}</b></div>
          <div className="tc-note">{t.note}</div>
        </div>
      </div>
      <div className="tc-expect">{test.expectation}</div>
    </div>
  );
}

function AhvTimingTest({ test }) {
  const result = useMemo(() => WW.calculateProAnalysis(test.data), [test]);
  const a = result.ahvTimingAnalysis;
  return (
    <div className="tc">
      <div className="tc-head">
        <div>
          <div className="tc-title">{test.title}</div>
          <div className="tc-desc">{test.desc}</div>
        </div>
        <Status ok={!!a.breakEvenVorbezugVsNormal} label={`Break-Even Vorbezug: ${a.breakEvenVorbezugVsNormal || '–'}`} />
      </div>
      <div className="ahv-timing-table">
        <div className="att-head">
          <div>Option</div><div>Rente / Mt.</div><div>Änderung</div>
          <div>@ 80</div><div>@ 85</div><div>@ 90</div>
        </div>
        {a.options.map((o, i) => {
          const isNormal = o.startAge === 65;
          return (
            <div key={i} className={`att-row ${isNormal ? 'att-row-normal' : ''}`}>
              <div><b>{o.label}</b></div>
              <div>CHF {fmt(o.monthlyRente)}</div>
              <div style={{ color: o.reductionOrIncrease.startsWith('-') ? '#b91c1c' : o.reductionOrIncrease === '0%' ? '#64748b' : '#15803d' }}>{o.reductionOrIncrease}</div>
              <div>CHF {fmt(o.cumulativeAt80)}</div>
              <div>CHF {fmt(o.cumulativeAt85)}</div>
              <div>CHF {fmt(o.cumulativeAt90)}</div>
            </div>
          );
        })}
      </div>
      <div className="tc-kpis">
        <div className="kpi"><div className="kpi-l">Break-Even Vorbezug vs Normal</div><div className="kpi-v">Alter {a.breakEvenVorbezugVsNormal || '–'}</div></div>
        <div className="kpi"><div className="kpi-l">Break-Even Normal vs Aufschub</div><div className="kpi-v">Alter {a.breakEvenNormalVsAufschub || '–'}</div></div>
        <div className="kpi"><div className="kpi-l">Lebenserwartung</div><div className="kpi-v">Alter {a.lifeExpectancy}</div></div>
      </div>
      <div className="tc-reco">{a.recommendation}</div>
      <div className="tc-expect">{test.expectation}</div>
    </div>
  );
}

function MortgageTest({ test }) {
  const result = useMemo(() => WW.calculateProAnalysis(test.data), [test]);
  const m = result.mortgageAffordability;
  if (!m) return <div className="tc"><div className="tc-title">{test.title}</div><div className="tc-desc">hasProperty fehlt.</div></div>;
  return (
    <div className="tc">
      <div className="tc-head">
        <div>
          <div className="tc-title">{test.title}</div>
          <div className="tc-desc">{test.desc}</div>
        </div>
        <Status ok={m.isAffordableInRetirement} label={m.isAffordableInRetirement ? 'Tragbar' : 'Nicht tragbar'} />
      </div>
      <div className="tc-grid">
        <div className="metric">
          <div className="m-label">Tragbarkeit jetzt</div>
          <div className="m-val" style={{ color: m.isAffordableNow ? '#15803d' : '#b91c1c' }}>{(m.currentHousingCostRatio * 100).toFixed(0)}%</div>
          <div className="m-sub">Max. 33% {m.isAffordableNow ? '✓' : '✗'}</div>
        </div>
        <div className="metric">
          <div className="m-label">Tragbarkeit nach Pension</div>
          <div className="m-val" style={{ color: m.isAffordableInRetirement ? '#15803d' : '#b91c1c' }}>{(m.retirementHousingCostRatio * 100).toFixed(0)}%</div>
          <div className="m-sub">{m.isAffordableInRetirement ? 'Innerhalb der Regel' : 'Kritisch'}</div>
        </div>
        <div className="metric">
          <div className="m-label">Wohnkosten / Jahr</div>
          <div className="m-val">CHF {fmt(m.housingCostYearly)}</div>
          <div className="m-sub">Zins 5% + Nebenkosten 1%</div>
        </div>
        <div className="metric">
          <div className="m-label">Max. tragbare Hypothek</div>
          <div className="m-val">CHF {fmt(m.maxAffordableMortgage)}</div>
          <div className="m-sub">Nach Pension, bei 33%-Regel</div>
        </div>
        <div className="metric">
          <div className="m-label">Nötige Amortisation</div>
          <div className="m-val" style={{ color: m.requiredAmortization > 0 ? '#b45309' : '#15803d' }}>CHF {fmt(m.requiredAmortization)}</div>
          <div className="m-sub">bis zur Pension</div>
        </div>
      </div>
      <div className="tc-reco">{m.recommendation}</div>
      <div className="tc-expect">{test.expectation}</div>
    </div>
  );
}

/* -------- App -------- */
function App() {
  const [debug, setDebug] = useState(false);

  return (
    <div className="app" data-screen-label="Tests">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">W</div>
          <span>WealthWise</span>
          <span style={{ color: 'var(--ink-300)', margin: '0 4px' }}>/</span>
          <span style={{ color: 'var(--ink-500)', fontWeight: 500, fontSize: 14 }}>Berechnungs-Engine · Tests</span>
        </div>
        <div className="top-actions">
          <a href="WealthWise - Screen 1 Situation.html">Screen 1</a>
          <a href="WealthWise - Screen 4 Analyse.html">Screen 4</a>
          <button className="btn-mini" onClick={() => setDebug(d => !d)}>
            {debug ? 'Debug aus' : 'Debug an'}
          </button>
        </div>
      </header>

      <main>
        <div className="page-head">
          <div className="eyebrow">QA · Berechnungs-Engine</div>
          <h1 className="title">Test-Szenarien</h1>
          <p className="subtitle">
            9 Vorsorge- und Pro-Feature-Tests, durchgerechnet mit <code>wealthwise-calc.js</code> + <code>wealthwise-cashflow.js</code> + <code>wealthwise-pro-features.js</code>.
            Alle Berechnungen live im Browser.
          </p>
        </div>

        {TESTS.map(t => {
          if (t.isComparison) return <ComparisonTest key={t.id} test={t} />;
          if (t.kind === 'bridging')  return <BridgingTest    key={t.id} test={t} />;
          if (t.kind === 'einkauf')   return <EinkaufTest     key={t.id} test={t} />;
          if (t.kind === 'tax')       return <TaxTest         key={t.id} test={t} />;
          if (t.kind === 'ahvtiming') return <AhvTimingTest   key={t.id} test={t} />;
          if (t.kind === 'mortgage')  return <MortgageTest    key={t.id} test={t} />;
          return <StandardTest key={t.id} test={t} />;
        })}

        {debug && (
          <pre className="debug">{JSON.stringify(
            TESTS.map(t => ({
              id: t.id,
              result: t.isComparison
                ? WW.calculateRenteVsKapital(t.data.person, { yearsInRetirement: 25, investmentReturn: 0.025 })
                : WW.calculateProAnalysis(t.data),
            })), null, 2)}</pre>
        )}

        <div className="footer-info">
          Stand: AHV-Rentenskala 2026 (max. CHF 2'520, 13. Rente),
          BVG-Mindestumwandlungssatz 6.8 %, BFS Sterbetafeln 2024.
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
