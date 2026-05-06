/**
 * WealthWise Calculation Engine
 * =============================
 * Schweizer Vorsorgeberechnungen (AHV/PK/3a/Vermögen) inkl.:
 *   - AHV Skala 44 mit Beitragslücken, Erziehungsgutschriften, Vorbezug/Aufschub
 *   - PK-Berechnung Rente / Kapital / Mix
 *   - Kapitalbezugssteuer (vereinfacht, progressiv)
 *   - Gestaffelter 3a-Bezug
 *   - Jahres-Cashflow von heute bis Alter 95
 *   - Szenario-Analyse (optimistisch / neutral / pessimistisch)
 *   - Sustainability Score 0-100
 *
 * Reines JS (keine Frameworks). Exportiert auf window.WW.
 *
 * Quellen: AHV 2026, BVG 2026, BFS HABE 2022, BFS Sterbetafeln 2024.
 */
(function (global) {
  'use strict';

  // ============================================================
  // KONSTANTEN
  // ============================================================
  const CONSTANTS = {
    // AHV 2026
    AHV_REFERENCE_AGE: 65,
    AHV_FULL_CONTRIBUTION_YEARS: 44,
    AHV_EARLY_REDUCTION_PER_YEAR: 6.8,   // % pro Vorbezugsjahr
    AHV_DELAY_INCREASE_PER_YEAR: 5.2,    // % pro Aufschubjahr
    AHV_MAX_DELAY_YEARS: 5,
    AHV_MIN_MONTHLY: 1260,               // Min. AHV-Rente 2026
    AHV_MAX_MONTHLY: 2520,               // Max. AHV-Rente 2026
    AHV_PLAFOND_FACTOR: 1.5,             // Ehepaar plafoniert: 150% der Maxrente
    AHV_PLAFOND_MONTHLY: 3780,           // 2520 × 1.5
    AHV_CHILD_CREDIT_YEARLY: 44100,      // Erziehungsgutschrift CHF/Jahr (max.)

    // BVG 2026
    BVG_MIN_CONVERSION_RATE: 6.8,        // %
    BVG_TYPICAL_CONVERSION_RATE: 5.4,    // %
    PK_3A_MAX_WITH_PK: 7258,             // 3a-Maximum mit PK
    PK_3A_MAX_WITHOUT_PK: 36288,         // 3a-Maximum ohne PK (20% Lohn, max.)

    // Lebenserwartung BFS Sterbetafeln 2024 (Restlebenserwartung in Jahren ab Alter)
    LIFE_EXPECTANCY: {
      male:   { 50: 33.2, 55: 28.6, 60: 24.1, 65: 19.8, 70: 15.7, 75: 11.9 },
      female: { 50: 36.5, 55: 31.8, 60: 27.1, 65: 22.5, 70: 18.0, 75: 13.7 },
    },

    // Default Inflation
    DEFAULT_INFLATION_RATE: 0.015,       // 1.5% p.a.

    // Anlagerenditen (real, nach Kosten)
    RETURNS: {
      conservative: 0.01,
      balanced: 0.025,
      growth: 0.045,
    },

    // Kapitalbezugssteuer (vereinfacht, progressive Stufen)
    CAPITAL_TAX_BRACKETS: [
      { upTo:   50000, rate: 0.020 },
      { upTo:  100000, rate: 0.030 },
      { upTo:  200000, rate: 0.045 },
      { upTo:  500000, rate: 0.060 },
      { upTo: 1000000, rate: 0.080 },
      { upTo: Infinity, rate: 0.095 },
    ],

    // AHV Skala 44 — vereinfachte Stufenwerte (mtl. Rente nach AHV-Durchschnittseinkommen)
    AHV_SCALE_44: [
      { avgIncome:      0, monthlyRent: 1260 },
      { avgIncome:  15120, monthlyRent: 1260 },
      { avgIncome:  21600, monthlyRent: 1313 },
      { avgIncome:  28800, monthlyRent: 1400 },
      { avgIncome:  36000, monthlyRent: 1505 },
      { avgIncome:  43200, monthlyRent: 1627 },
      { avgIncome:  50400, monthlyRent: 1764 },
      { avgIncome:  57600, monthlyRent: 1890 },
      { avgIncome:  64800, monthlyRent: 2013 },
      { avgIncome:  72000, monthlyRent: 2138 },
      { avgIncome:  79200, monthlyRent: 2261 },
      { avgIncome:  86400, monthlyRent: 2385 },
      { avgIncome:  90720, monthlyRent: 2520 },
    ],
  };

  // ============================================================
  // UTIL
  // ============================================================
  function fmtCHF(n) {
    return new Intl.NumberFormat('de-CH', { maximumFractionDigits: 0 })
      .format(Math.round(n || 0));
  }

  function calculateAge(birthDate, atDate) {
    const ref = atDate ? new Date(atDate) : new Date();
    const dob = new Date(birthDate);
    let age = ref.getFullYear() - dob.getFullYear();
    const m = ref.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
    return age;
  }

  function getLifeExpectancy(gender, currentAge) {
    const table = CONSTANTS.LIFE_EXPECTANCY[gender === 'm' ? 'male' : 'female'];
    const ages = Object.keys(table).map(Number).sort((a, b) => a - b);
    let pick = ages[0];
    for (const a of ages) if (a <= currentAge) pick = a;
    return currentAge + table[pick]; // absolutes Alter
  }

  // Annuitäten-Formel: monatliche Entnahme bei gegebener Rendite
  function calculatePMT(monthlyRate, totalMonths, presentValue) {
    if (monthlyRate === 0) return presentValue / totalMonths;
    const f = Math.pow(1 + monthlyRate, totalMonths);
    return presentValue * monthlyRate * f / (f - 1);
  }

  // ============================================================
  // KAPITALBEZUGSSTEUER (vereinfacht, progressive Stufen)
  // ============================================================
  function calculateCapitalWithdrawalTax(capital) {
    if (!capital || capital <= 0) return 0;
    let tax = 0;
    let remaining = capital;
    let prev = 0;
    for (const b of CONSTANTS.CAPITAL_TAX_BRACKETS) {
      const slice = Math.min(remaining, b.upTo - prev);
      if (slice <= 0) break;
      tax += slice * b.rate;
      remaining -= slice;
      prev = b.upTo;
      if (remaining <= 0) break;
    }
    return Math.round(tax);
  }

  // ============================================================
  // AHV — Skala 44 mit allen Korrekturen
  // ============================================================
  function calculateAhvPro(person, civilStatus) {
    const cs = civilStatus || person.civilStatus || 'ledig';

    // 1) Massgebendes Durchschnittseinkommen (inkl. Erziehungsgutschriften)
    let avgIncome = person.grossIncome || 0;
    if (person.hasChildCredits && person.numberOfChildren > 0) {
      // Bei Verheirateten hälftig aufgeteilt
      const split = (cs === 'verheiratet' || cs === 'married') ? 0.5 : 1;
      avgIncome += CONSTANTS.AHV_CHILD_CREDIT_YEARLY * split;
    }

    // 2) Rente nach Skala 44 (lineare Interpolation)
    const scale = CONSTANTS.AHV_SCALE_44;
    let monthly = scale[scale.length - 1].monthlyRent;
    for (let i = 0; i < scale.length - 1; i++) {
      const a = scale[i], b = scale[i + 1];
      if (avgIncome >= a.avgIncome && avgIncome < b.avgIncome) {
        const t = (avgIncome - a.avgIncome) / (b.avgIncome - a.avgIncome);
        monthly = a.monthlyRent + t * (b.monthlyRent - a.monthlyRent);
        break;
      }
    }
    monthly = Math.round(monthly);

    // 3) Kürzung wegen Beitragslücken
    const fullYears = CONSTANTS.AHV_FULL_CONTRIBUTION_YEARS;
    const years = (person.ahvContributionYears || fullYears) - (person.ahvContributionGaps || 0);
    let gapReduction = 0;
    if (years < fullYears) {
      const missing = Math.max(0, fullYears - years);
      gapReduction = missing / fullYears;
      monthly = Math.round(monthly * (1 - gapReduction));
    }

    // 4) Vorbezug / Aufschub
    let earlyReduction = 0;
    let delayIncrease = 0;
    const ra = person.retirementAge || CONSTANTS.AHV_REFERENCE_AGE;
    if (ra < CONSTANTS.AHV_REFERENCE_AGE) {
      const earlyYears = CONSTANTS.AHV_REFERENCE_AGE - ra;
      earlyReduction = earlyYears * CONSTANTS.AHV_EARLY_REDUCTION_PER_YEAR / 100;
      monthly = Math.round(monthly * (1 - earlyReduction));
    } else if (ra > CONSTANTS.AHV_REFERENCE_AGE) {
      const delay = Math.min(ra - CONSTANTS.AHV_REFERENCE_AGE, CONSTANTS.AHV_MAX_DELAY_YEARS);
      delayIncrease = delay * CONSTANTS.AHV_DELAY_INCREASE_PER_YEAR / 100;
      monthly = Math.round(monthly * (1 + delayIncrease));
    }

    // 5) Jahresrente + 13. AHV-Rente (ab Dezember 2026)
    const yearlyRente = monthly * 12;
    const yearlyInkl13 = monthly * 13;

    return {
      monthlyRente: monthly,
      yearlyRente,
      yearlyInkl13,
      avgIncomeUsed: Math.round(avgIncome),
      reductionForGaps: gapReduction,
      reductionForEarlyRetirement: earlyReduction,
      increaseForDelay: delayIncrease,
    };
  }

  // Haushalts-AHV mit Plafonierung Ehepaar
  function calculateAhvHousehold(p1, p2, civilStatus) {
    const r1 = calculateAhvPro(p1, civilStatus);
    const r2 = p2 ? calculateAhvPro(p2, civilStatus) : null;
    const cs = civilStatus || 'ledig';
    let combinedMonthly = r1.monthlyRente + (r2 ? r2.monthlyRente : 0);
    let plafonReduction = 0;
    if (r2 && (cs === 'verheiratet' || cs === 'married')) {
      const cap = CONSTANTS.AHV_PLAFOND_MONTHLY;
      if (combinedMonthly > cap) {
        plafonReduction = combinedMonthly - cap;
        combinedMonthly = cap;
      }
    }
    return {
      person1: r1,
      person2: r2,
      combinedMonthly,
      combinedYearly: combinedMonthly * 12,
      combinedYearlyInkl13: combinedMonthly * 13,
      plafonReduction,
    };
  }

  // ============================================================
  // PENSIONSKASSE — Rente / Kapital / Mix
  // ============================================================
  function calculatePkRente(person) {
    const cap = person.pkCapitalAt65 || 0;
    const rate = (person.pkConversionRate || CONSTANTS.BVG_TYPICAL_CONVERSION_RATE) / 100;
    const yearly = cap * rate;
    return {
      yearlyRente: Math.round(yearly),
      monthlyRente: Math.round(yearly / 12),
      capital: cap,
      conversionRate: rate * 100,
    };
  }

  function calculatePkHousehold(p1, p2) {
    const r1 = calculatePkRente(p1);
    const r2 = p2 && p2.pkCapitalAt65 ? calculatePkRente(p2) : null;
    return {
      person1: r1,
      person2: r2,
      combinedMonthly: r1.monthlyRente + (r2 ? r2.monthlyRente : 0),
      combinedYearly: r1.yearlyRente + (r2 ? r2.yearlyRente : 0),
    };
  }

  // ============================================================
  // RENTE vs. KAPITAL
  // ============================================================
  function calculateRenteVsKapital(person, opts) {
    opts = opts || {};
    const yearsInRetirement = opts.yearsInRetirement || 25;
    const investmentReturn = opts.investmentReturn || CONSTANTS.RETURNS.balanced;

    const capital = person.pkCapitalAt65 || 0;
    const convRate = (person.pkConversionRate || CONSTANTS.BVG_TYPICAL_CONVERSION_RATE) / 100;
    const ra = person.retirementAge || 65;

    // === Option A: 100% Rente ===
    const monthlyRente = Math.round(capital * convRate / 12);
    const totalRente = monthlyRente * 12 * yearsInRetirement;

    // === Option B: 100% Kapital (mit Anlagerendite) ===
    const capitalTax = calculateCapitalWithdrawalTax(capital);
    const netCapital = capital - capitalTax;
    const monthlyKapital = Math.round(
      calculatePMT(investmentReturn / 12, yearsInRetirement * 12, netCapital)
    );
    let yearWhenExhausted = null;
    let bal = netCapital;
    for (let y = 1; y <= yearsInRetirement; y++) {
      bal = bal * (1 + investmentReturn) - monthlyKapital * 12;
      if (bal <= 0 && yearWhenExhausted === null) {
        yearWhenExhausted = ra + y;
        break;
      }
    }
    const totalKapital = monthlyKapital * 12 * yearsInRetirement;

    // === Option C: 50/50 Mix ===
    const mixCapShare = 0.5;
    const mixCap = Math.round(capital * mixCapShare);
    const mixRente = capital - mixCap;
    const mixMonthlyRente = Math.round(mixRente * convRate / 12);
    const mixCapTax = calculateCapitalWithdrawalTax(mixCap);
    const mixNet = mixCap - mixCapTax;
    const mixMonthlyKap = Math.round(
      calculatePMT(investmentReturn / 12, yearsInRetirement * 12, mixNet)
    );
    const mixMonthly = mixMonthlyRente + mixMonthlyKap;
    const totalMix = mixMonthly * 12 * yearsInRetirement;

    // === Break-Even (ab welchem Alter ist Rente kumuliert > Kapital netto?) ===
    let breakEvenAge = null;
    let cumRente = 0;
    for (let y = 1; y <= 40; y++) {
      cumRente += monthlyRente * 12;
      if (cumRente >= netCapital) { breakEvenAge = ra + y; break; }
    }

    // === Empfehlung ===
    const lifeExp = getLifeExpectancy(person.gender || 'm', ra);
    const recommendation = (breakEvenAge !== null && breakEvenAge < lifeExp)
      ? 'rente_tendenz' : 'kapital_tendenz';

    return {
      capital,
      conversionRate: convRate * 100,
      yearsInRetirement,
      investmentReturn,

      option_rente: {
        monthlyIncome: monthlyRente,
        totalOverPeriod: totalRente,
        capitalTax: 0,
        advantages: [
          'Lebenslange Sicherheit – kein Langlebigkeitsrisiko',
          'Kein Anlagerisiko',
          'Einfach und planbar',
        ],
        disadvantages: [
          'Kein Restkapital für Erben',
          'Nicht flexibel anpassbar',
          'Wenig Inflationsschutz (PK-Renten meist nicht angepasst)',
        ],
      },
      option_kapital: {
        monthlyIncome: monthlyKapital,
        totalOverPeriod: totalKapital,
        capitalTax,
        netCapital,
        yearWhenExhausted,
        advantages: [
          'Flexibilität bei Entnahme',
          'Restkapital vererbbar',
          'Mögliche Rendite auf Kapital',
        ],
        disadvantages: [
          'Langlebigkeitsrisiko – Geld kann ausgehen',
          'Anlagerisiko trägt Versicherter',
          'Eigenverantwortung für Verwaltung',
        ],
      },
      option_mix: {
        monthlyIncome: mixMonthly,
        totalOverPeriod: totalMix,
        capitalTax: mixCapTax,
        mixRatio: '50% Rente / 50% Kapital',
        advantages: [
          'Basis-Sicherheit durch Rente',
          'Flexibilität durch Kapital',
          'Steuerlich oft optimal (gestaffelt)',
        ],
        disadvantages: [
          'Komplexer zu planen',
          'Teilweises Anlagerisiko',
        ],
      },

      breakEvenAge,
      lifeExpectancy: Math.round(lifeExp),
      recommendation,
    };
  }

  // ============================================================
  // GESTAFFELTER 3a-BEZUG
  // ============================================================
  function calculateStaggered3aWithdrawal(person) {
    const accounts = Math.max(1, person.pillar3aAccounts || 1);
    const total = person.pillar3aBalance || 0;
    const ra = person.retirementAge || 65;
    const perAccount = Math.round(total / accounts);

    // Frühestens 5 Jahre vor Referenzalter, gestaffelt 1/Jahr
    const earliestAge = Math.max(60, ra - accounts + 1);
    const currentAge = person.birthDate ? calculateAge(person.birthDate) : ra - 5;
    const baseYear = new Date().getFullYear();

    const plan = [];
    for (let i = 0; i < accounts; i++) {
      const wAge = earliestAge + i;
      plan.push({
        year: baseYear + (wAge - currentAge),
        age: wAge,
        amount: perAccount,
        account: `3a-Konto ${i + 1}`,
        tax: calculateCapitalWithdrawalTax(perAccount),
      });
    }
    const taxAllAtOnce = calculateCapitalWithdrawalTax(total);
    const taxStaggered = plan.reduce((s, p) => s + p.tax, 0);
    return {
      withdrawalPlan: plan,
      taxAllAtOnce,
      taxStaggered,
      taxSaving: Math.max(0, taxAllAtOnce - taxStaggered),
    };
  }

  // expose part 1
  global.WW = global.WW || {};
  Object.assign(global.WW, {
    CONSTANTS,
    fmtCHF, calculateAge, getLifeExpectancy, calculatePMT,
    calculateCapitalWithdrawalTax,
    calculateAhvPro, calculateAhvHousehold,
    calculatePkRente, calculatePkHousehold,
    calculateRenteVsKapital,
    calculateStaggered3aWithdrawal,
  });

})(window);
