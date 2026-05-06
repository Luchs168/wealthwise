/**
 * WealthWise Pro Features
 * =======================
 * Professionelle Zusatzberechnungen:
 *   - Überbrückungsrente (zwischen Pension und AHV-Bezug)
 *   - PK-Einkauf Rechner (ROI, Steuerersparnis, Sperrfrist)
 *   - Steuervergleich vor/nach Pension
 *   - AHV-Timing Analyse (Vorbezug/Normal/Aufschub + Break-Even)
 *   - Hypothek-Tragbarkeit vor/nach Pension
 * Ergänzt window.WW.
 */
(function (global) {
  'use strict';
  const WW = global.WW;
  if (!WW) throw new Error('wealthwise-calc.js + wealthwise-cashflow.js must load first');

  const C = WW.CONSTANTS;

  // ============================================================
  // 1) ÜBERBRÜCKUNGSRENTE
  // ============================================================
  function calculateBridgingPension(person, household) {
    const ra = person.retirementAge || 65;
    // AHV Start: bei Vorbezug = person.ahvStartAge oder min. 62
    const ahvStartAge = person.ahvStartAge || ra;
    const effectiveAhvStart = Math.max(ahvStartAge, 62);

    const needsBridging = ra < effectiveAhvStart;
    const bridgingYears = needsBridging ? (effectiveAhvStart - ra) : 0;

    if (!needsBridging) {
      return {
        needsBridging: false,
        bridgingYears: 0,
        monthlyGapDuringBridging: 0,
        totalBridgingCost: 0,
        fundingSources: [],
        note: 'Keine Überbrückung nötig – AHV-Bezug startet mit Pensionierung.',
      };
    }

    // In Überbrückungsphase: nur PK-Rente (wenn Rente gewählt), keine AHV
    const pkMonthly = (person.pkBezugsart === 'kapital') ? 0
      : WW.calculatePkRente(person).monthlyRente
        * (person.pkBezugsart === 'mix' ? (1 - (person.pkKapitalanteil || 50) / 100) : 1);

    const hh = household || {};
    const monthlyExpShare = (hh.monthlyExpenses || 0)
      * (household && household.person2 ? 0.55 : 1); // Anteil Person 1 bei Paar
    const monthlyGap = Math.max(0, monthlyExpShare - pkMonthly);
    const totalCost = monthlyGap * 12 * bridgingYears;

    // Finanzierungsquellen identifizieren
    const sources = [];
    const free = hh.freeAssets || 0;
    const p3a = person.pillar3aBalance || 0;
    const pkCap = (person.pkBezugsart === 'kapital' || person.pkBezugsart === 'mix')
      ? (person.pkCapitalAt65 || 0) : 0;

    if (free >= totalCost) {
      sources.push(`Freies Vermögen (CHF ${WW.fmtCHF(free)}) deckt die Überbrückung vollständig.`);
    } else if (free > 0) {
      sources.push(`Freies Vermögen deckt CHF ${WW.fmtCHF(free)} von CHF ${WW.fmtCHF(totalCost)}.`);
    }
    if (p3a > 0) sources.push(`3a-Guthaben (CHF ${WW.fmtCHF(p3a)}) als Reserve einsetzbar.`);
    if (pkCap > 0) sources.push(`PK-Kapitalanteil (CHF ${WW.fmtCHF(pkCap)}) bietet Liquidität.`);
    sources.push('Viele Pensionskassen bieten eine Überbrückungsrente – bei der PK erfragen.');

    return {
      needsBridging: true,
      bridgingYears,
      monthlyGapDuringBridging: Math.round(monthlyGap),
      totalBridgingCost: Math.round(totalCost),
      fundingSources: sources,
    };
  }

  // ============================================================
  // 2) PK-EINKAUF RECHNER
  // ============================================================
  function calculatePkEinkauf(person, einkaufBetrag, yearsBeforeRetirement) {
    const betrag = Math.max(0, einkaufBetrag || 0);
    const years = Math.max(0, yearsBeforeRetirement || 0);
    const pkZins = 0.02; // vereinfachter PK-Zins

    // 1) Zusätzliches Kapital bei 65
    const additionalCapital = Math.round(betrag * Math.pow(1 + pkZins, years));

    // 2) Zusätzliche monatliche Rente
    const uws = (person.pkConversionRate || C.BVG_TYPICAL_CONVERSION_RATE) / 100;
    const additionalMonthlyRente = Math.round(additionalCapital * uws / 12);

    // 3) Steuerersparnis (marginaler Satz ~30%)
    const marginalRate = 0.30;
    const taxSavingOnPurchase = Math.round(betrag * marginalRate);

    // 4) Netto-Kosten
    const netCost = betrag - taxSavingOnPurchase;

    // 5) ROI — Zusatzrente über Restlebenszeit vs. Netto-Kosten
    const ra = person.retirementAge || 65;
    const lifeExp = WW.getLifeExpectancy(person.gender || 'm', ra);
    const yearsInRetirement = Math.max(1, Math.round(lifeExp - ra));
    const totalAdditionalRente = additionalMonthlyRente * 12 * yearsInRetirement;
    const returnOnInvestment = netCost > 0 ? totalAdditionalRente / netCost : 0;

    // 6) Warning — Sperrfrist 3 Jahre
    let warning = null;
    if (years < 3 && (person.pkBezugsart === 'kapital' || person.pkBezugsart === 'mix')) {
      warning = 'Achtung: Bei Kapitalbezug innerhalb von 3 Jahren nach dem Einkauf kann die Steuerersparnis zurückgefordert werden!';
    }

    // 7) Recommendation
    let recommendation;
    if (returnOnInvestment > 1.5) recommendation = 'Ein PK-Einkauf scheint sich zu lohnen.';
    else if (returnOnInvestment >= 1.0) recommendation = 'Ein PK-Einkauf könnte sich lohnen.';
    else recommendation = 'Ein PK-Einkauf lohnt sich vermutlich nicht.';
    recommendation += ' Besprich den Einkauf mit deiner Pensionskasse und einem Steuerberater.';

    return {
      einkaufBetrag: betrag,
      yearsBeforeRetirement: years,
      additionalMonthlyRente,
      additionalCapital,
      taxSavingOnPurchase,
      netCost,
      totalAdditionalRenteOverLifetime: Math.round(totalAdditionalRente),
      returnOnInvestment: Math.round(returnOnInvestment * 100) / 100,
      recommendation,
      warning,
    };
  }

  // ============================================================
  // 3) STEUERVERGLEICH VOR vs. NACH PENSIONIERUNG
  // ============================================================
  function effectiveTaxRate(taxableIncome) {
    if (taxableIncome <= 30000) return 0.03;
    if (taxableIncome <= 60000) return 0.08;
    if (taxableIncome <= 100000) return 0.15;
    if (taxableIncome <= 150000) return 0.20;
    return 0.25;
  }

  function calculateTaxComparison(person, household, ahvResult, pkResult) {
    const gross = person.grossIncome || 0;

    // VOR Pensionierung
    const sozialabgaben = gross * (0.053 + 0.011 + 0.08); // AHV+ALV+PK-AN
    const berufskosten = 2000;
    const pillar3a = person.has3a ? C.PK_3A_MAX_WITH_PK : 0;
    const versicherung = 3500;
    const preDeductions = sozialabgaben + berufskosten + pillar3a + versicherung;
    const preTaxable = Math.max(0, gross - preDeductions);
    const preTaxRate = effectiveTaxRate(preTaxable);
    const preTax = Math.round(preTaxable * preTaxRate);

    // NACH Pensionierung (mit Rente)
    const ahvIncomeYear = ahvResult
      ? (ahvResult.yearlyInkl13 || ahvResult.combinedYearlyInkl13 || 0)
      : 0;
    const pkIncomeYear = pkResult
      ? (pkResult.yearlyRente || pkResult.combinedYearly || 0)
      : 0;
    const otherIncome = 0;
    const retGross = ahvIncomeYear + pkIncomeYear + otherIncome;
    const retDeductions = versicherung; // nur Versicherungspauschale
    const retTaxable = Math.max(0, retGross - retDeductions);
    const retTaxRate = effectiveTaxRate(retTaxable);
    const retTax = Math.round(retTaxable * retTaxRate);

    const yearlyTaxSaving = preTax - retTax;
    const totalTaxSavingOver20Years = yearlyTaxSaving * 20;

    return {
      beforeRetirement: {
        grossIncome: gross,
        deductions: Math.round(preDeductions),
        taxableIncome: Math.round(preTaxable),
        effectiveRate: preTaxRate,
        estimatedTax: preTax,
      },
      afterRetirement: {
        ahvIncome: Math.round(ahvIncomeYear),
        pkRenteIncome: Math.round(pkIncomeYear),
        otherIncome,
        deductions: retDeductions,
        taxableIncome: Math.round(retTaxable),
        effectiveRate: retTaxRate,
        estimatedTax: retTax,
      },
      yearlyTaxSaving,
      totalTaxSavingOver20Years,
      note: 'Kantonal stark unterschiedlich. Für genaue Werte einen Steuerrechner oder Berater konsultieren.',
    };
  }

  // ============================================================
  // 4) AHV VORBEZUG vs. AUFSCHUB
  // ============================================================
  function calculateAhvTimingAnalysis(person, civilStatus) {
    const REF = C.AHV_REFERENCE_AGE;
    const options = [];

    // Basis-Rente bei 65 (ohne Vorbezug/Aufschub)
    const basePerson = Object.assign({}, person, { retirementAge: REF });
    const baseResult = WW.calculateAhvPro(basePerson, civilStatus);
    const baseMonthly = baseResult.monthlyRente;

    const configs = [
      { startAge: 63, adj: -2 * C.AHV_EARLY_REDUCTION_PER_YEAR / 100, label: 'Vorbezug 2 Jahre (63)' },
      { startAge: 64, adj: -1 * C.AHV_EARLY_REDUCTION_PER_YEAR / 100, label: 'Vorbezug 1 Jahr (64)' },
      { startAge: 65, adj: 0,                                        label: 'Normal (65)' },
      { startAge: 66, adj: +1 * C.AHV_DELAY_INCREASE_PER_YEAR / 100, label: 'Aufschub 1 Jahr (66)' },
      { startAge: 67, adj: +2 * C.AHV_DELAY_INCREASE_PER_YEAR / 100, label: 'Aufschub 2 Jahre (67)' },
    ];

    for (const cfg of configs) {
      const monthly = Math.round(baseMonthly * (1 + cfg.adj));
      const yearly = monthly * 13; // inkl. 13. Rente
      const cumAt = (targetAge) => {
        const years = Math.max(0, targetAge - cfg.startAge);
        return Math.round(yearly * years);
      };
      options.push({
        label: cfg.label,
        startAge: cfg.startAge,
        monthlyRente: monthly,
        yearlyRente: yearly,
        reductionOrIncrease: cfg.adj === 0 ? '0%'
          : (cfg.adj > 0 ? `+${(cfg.adj * 100).toFixed(1)}%` : `${(cfg.adj * 100).toFixed(1)}%`),
        cumulativeAt80: cumAt(80),
        cumulativeAt85: cumAt(85),
        cumulativeAt90: cumAt(90),
      });
    }

    // Break-Even Vorbezug (63) vs Normal (65)
    // J_vor * R_vor = (J_vor - 2) * R_normal, gesucht: J_vor (ab startAge 63)
    const R_vor = options[0].yearlyRente;
    const R_norm = options[2].yearlyRente;
    // cumVor(age) = R_vor * (age - 63); cumNorm(age) = R_norm * (age - 65)
    // equal: R_vor*(age-63) = R_norm*(age-65)  →  age = (63*R_vor - 65*R_norm)/(R_vor - R_norm)
    const beVn = (R_vor !== R_norm)
      ? Math.round((63 * R_vor - 65 * R_norm) / (R_vor - R_norm)) : null;

    // Break-Even Normal vs Aufschub (67)
    const R_auf = options[4].yearlyRente;
    const beNa = (R_norm !== R_auf)
      ? Math.round((65 * R_norm - 67 * R_auf) / (R_norm - R_auf)) : null;

    const lifeExp = Math.round(WW.getLifeExpectancy(person.gender || 'm', REF));

    let recommendation;
    if (beVn && beVn < lifeExp) {
      recommendation = `Vorbezug lohnt sich finanziell nicht – ab Alter ${beVn} überholt die normale Rente den Vorbezug, und die Lebenserwartung liegt bei ~${lifeExp}. Vorbezug nur wählen, wenn du das Geld früh brauchst.`;
    } else {
      recommendation = `Der finanzielle Break-Even für den Aufschub liegt bei Alter ${beNa || '–'} (Lebenserwartung ~${lifeExp}).`;
    }
    recommendation += ' Die Entscheidung hängt von deiner persönlichen Situation, Gesundheit und finanziellen Lage ab.';

    return {
      options,
      breakEvenVorbezugVsNormal: beVn,
      breakEvenNormalVsAufschub: beNa,
      lifeExpectancy: lifeExp,
      recommendation,
    };
  }

  // ============================================================
  // 5) HYPOTHEK-TRAGBARKEIT
  // ============================================================
  function calculateMortgageAffordability(household, retirementMonthlyIncome) {
    if (!household || !household.hasProperty) return null;

    const propValue = household.propertyValue || 0;
    const mortgage = household.mortgageRemaining || 0;
    const grossYearly = (household.person1 ? (household.person1.grossIncome || 0) : 0)
      + (household.person2 ? (household.person2.grossIncome || 0) : 0);
    const retYearly = (retirementMonthlyIncome || 0) * 12;

    // Wohnkosten (kalkulatorisch)
    const calcInterest = mortgage * 0.05;      // 5%
    const nebenkosten = propValue * 0.01;      // 1%
    const amortisation = 0;                    // angenommen, bereits auf 65% LTV
    const housingCost = calcInterest + nebenkosten + amortisation;

    const currentRatio = grossYearly > 0 ? housingCost / grossYearly : 1;
    const retirementRatio = retYearly > 0 ? housingCost / retYearly : 1;

    const isAffordableNow = currentRatio <= 0.33;
    const isAffordableInRetirement = retirementRatio <= 0.33;

    // Maximal tragbare Hypothek nach Pension:
    // 0.33 * retYearly >= mortgageMax * 0.05 + propValue * 0.01
    // mortgageMax = (0.33 * retYearly - propValue * 0.01) / 0.05
    const maxAffordableMortgage = Math.max(0,
      Math.round((0.33 * retYearly - propValue * 0.01) / 0.05));
    const requiredAmortization = Math.max(0, mortgage - maxAffordableMortgage);

    let recommendation;
    if (isAffordableInRetirement) {
      recommendation = 'Eure Hypothek ist auch nach der Pensionierung tragbar.';
    } else {
      recommendation = `Eure Hypothek überschreitet die Tragbarkeit nach der Pensionierung (${Math.round(retirementRatio * 100)}% statt max. 33%). Ihr müsstet ca. CHF ${WW.fmtCHF(requiredAmortization)} amortisieren, um die Tragbarkeit sicherzustellen.`;
    }

    return {
      isAffordableNow,
      isAffordableInRetirement,
      currentHousingCostRatio: Math.round(currentRatio * 1000) / 1000,
      retirementHousingCostRatio: Math.round(retirementRatio * 1000) / 1000,
      housingCostYearly: Math.round(housingCost),
      maxAffordableMortgage,
      requiredAmortization,
      recommendation,
    };
  }

  // ============================================================
  // INTEGRATION in calculateProAnalysis
  // ============================================================
  const originalProAnalysis = WW.calculateProAnalysis;

  WW.calculateProAnalysis = function (data) {
    const base = originalProAnalysis(data);
    const p1 = data.person1;
    const civilStatus = data.civilStatus || 'ledig';

    // 1) Überbrückungsrente (Person 1)
    const bridgingPension = calculateBridgingPension(p1, data);

    // 2) PK-Einkauf (nur wenn in Daten angefragt)
    let pkEinkauf = null;
    if (data.pkEinkaufBetrag && data.pkEinkaufBetrag > 0) {
      const currentAge = WW.calculateAge(p1.birthDate);
      const yrs = Math.max(0, (p1.retirementAge || 65) - currentAge);
      pkEinkauf = calculatePkEinkauf(p1, data.pkEinkaufBetrag, yrs);
    }

    // 3) Steuervergleich
    const taxComparison = calculateTaxComparison(
      p1, data, base.ahv, base.pk
    );

    // 4) AHV-Timing
    const ahvTimingAnalysis = calculateAhvTimingAnalysis(p1, civilStatus);

    // 5) Hypothek-Tragbarkeit
    const mortgageAffordability = calculateMortgageAffordability(
      data, base.monthlyIncome.total
    );

    return Object.assign({}, base, {
      bridgingPension,
      pkEinkauf,
      taxComparison,
      ahvTimingAnalysis,
      mortgageAffordability,
    });
  };

  // ============================================================
  // EXPOSE
  // ============================================================
  Object.assign(WW, {
    calculateBridgingPension,
    calculatePkEinkauf,
    calculateTaxComparison,
    calculateAhvTimingAnalysis,
    calculateMortgageAffordability,
  });

})(window);
