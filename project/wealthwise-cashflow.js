/**
 * WealthWise Cashflow Engine
 * ==========================
 * Jahres-Cashflow von heute bis Alter 95, Szenarien, Sustainability Score.
 * Ergänzt window.WW.
 */
(function (global) {
  'use strict';
  const WW = global.WW;
  if (!WW) throw new Error('wealthwise-calc.js must be loaded first');

  const C = WW.CONSTANTS;

  // ============================================================
  // YEAR-BY-YEAR CASHFLOW
  // ============================================================
  function calculateYearlyCashflow(data) {
    const p1 = data.person1;
    const p2 = data.person2 || null;
    const civilStatus = data.civilStatus || 'ledig';
    const inflationRate = data.inflationRate != null
      ? data.inflationRate : C.DEFAULT_INFLATION_RATE;
    const investmentReturn = data.investmentReturn != null
      ? data.investmentReturn : C.RETURNS[data.riskProfile || 'balanced'];

    const currentAge = WW.calculateAge(p1.birthDate);
    const ra1 = p1.retirementAge || 65;
    const ra2 = p2 ? (p2.retirementAge || 65) : null;
    const endAge = data.endAge || 95;

    // Pre-compute renten
    const ahv = WW.calculateAhvHousehold(p1, p2, civilStatus);
    const pk  = WW.calculatePkHousehold(p1, p2);

    // PK-Kapitalbezug-Strategie
    function pkKapitalShare(p) {
      if (!p) return 0;
      if (p.pkBezugsart === 'kapital') return 1;
      if (p.pkBezugsart === 'mix') return (p.pkKapitalanteil || 50) / 100;
      return 0;
    }
    const cap1 = (p1.pkCapitalAt65 || 0) * pkKapitalShare(p1);
    const cap2 = p2 ? (p2.pkCapitalAt65 || 0) * pkKapitalShare(p2) : 0;
    // Renten-Anteil reduziert sich entsprechend (PK)
    const pk1Monthly = pk.person1.monthlyRente * (1 - pkKapitalShare(p1));
    const pk2Monthly = pk.person2 ? pk.person2.monthlyRente * (1 - pkKapitalShare(p2)) : 0;

    // Startvermögen
    const start3a = (p1.has3a ? (p1.pillar3aBalance || 0) : 0)
      + (p2 && p2.has3a ? (p2.pillar3aBalance || 0) : 0);
    let wealth = (data.freeAssets || 0) + start3a;

    // Property
    const hasProperty = !!data.hasProperty;
    const monthlyMortgage = data.monthlyMortgageCost || 0;

    // Ausgaben Basis (real, wird inflationiert)
    const baseExpensesYear = (data.monthlyExpenses || 0) * 12;

    const cashflow = [];

    for (let age = currentAge; age <= endAge; age++) {
      const year = new Date().getFullYear() + (age - currentAge);
      const yearsFromNow = age - currentAge;

      // Inflation
      const expFactor = Math.pow(1 + inflationRate, yearsFromNow);
      const inflatedExpenses = Math.round(baseExpensesYear * expFactor);

      // Einmalige Ausgaben
      const oneTime = (data.oneTimeExpenses || [])
        .filter(e => e.year === year)
        .reduce((s, e) => s + e.amount, 0);

      // Pensionsstatus
      const p1Retired = age >= ra1;
      const p2Retired = p2 ? (age >= (p2.birthDate
        ? WW.calculateAge(p2.birthDate) + (ra2 - WW.calculateAge(p2.birthDate))
        : ra2)) : false;
      // Vereinfacht: Status pro Jahr
      const ra2InP1Years = p2 && p2.birthDate
        ? ra2 + (currentAge - WW.calculateAge(p2.birthDate))
        : ra2;
      const p2RetiredSimple = p2 ? (age >= ra2InP1Years) : false;

      const isRetirementYearP1 = age === ra1;
      const isRetirementYearP2 = p2 ? (age === ra2InP1Years) : false;

      let employmentIncome = 0;
      let ahvIncome = 0, pkRenteIncome = 0;
      let pkKapitalWithdrawal = 0, pillar3aWithdrawal = 0;
      let assetReturn = 0, assetConsumption = 0;

      // ---- Erwerbseinkommen (Person 1) ----
      if (!p1Retired) employmentIncome += (p1.grossIncome || 0);
      // ---- Erwerbseinkommen (Person 2) ----
      if (p2 && !p2RetiredSimple) employmentIncome += (p2.grossIncome || 0);

      // ---- Sparen vor Pensionierung ----
      if (employmentIncome > 0) {
        const netIncome = employmentIncome * 0.72; // grobe AHV/PK/Steuer-Abzüge
        const saving = Math.max(0, netIncome - inflatedExpenses
          - (hasProperty ? monthlyMortgage * 12 : 0));
        wealth += saving;
      }

      // ---- AHV-Renten (anteilig wenn nur 1 pensioniert) ----
      if (p1Retired && (!p2 || p2RetiredSimple)) {
        // Beide pensioniert (oder Single) → volle Haushalts-AHV
        ahvIncome = ahv.combinedYearlyInkl13;
      } else if (p1Retired) {
        ahvIncome = ahv.person1.yearlyInkl13;
      } else if (p2RetiredSimple) {
        ahvIncome = (ahv.person2 ? ahv.person2.yearlyInkl13 : 0);
      }

      // ---- PK-Renten ----
      if (p1Retired) pkRenteIncome += pk1Monthly * 12;
      if (p2 && p2RetiredSimple) pkRenteIncome += pk2Monthly * 12;

      // ---- Kapitalbezüge im Pensionsjahr ----
      if (isRetirementYearP1 && cap1 > 0) {
        pkKapitalWithdrawal += cap1;
        const tax = WW.calculateCapitalWithdrawalTax(cap1);
        wealth += (cap1 - tax);
      }
      if (isRetirementYearP2 && cap2 > 0) {
        pkKapitalWithdrawal += cap2;
        const tax = WW.calculateCapitalWithdrawalTax(cap2);
        wealth += (cap2 - tax);
      }
      // 3a Bezug im Pensionsjahr (vereinfacht: alles auf einmal abzüglich Steuer)
      if (isRetirementYearP1 && start3a > 0 && yearsFromNow === (ra1 - currentAge)) {
        pillar3aWithdrawal = start3a;
        const tax = WW.calculateCapitalWithdrawalTax(start3a);
        wealth -= tax; // 3a war schon im wealth, nur Steuer abziehen
      }

      // ---- Anlagerendite auf Vermögen ----
      if (p1Retired || p2RetiredSimple) {
        assetReturn = Math.round(Math.max(0, wealth) * investmentReturn);
        wealth += assetReturn;
      }

      // ---- Ausgabenlücke aus Vermögen ----
      const totalRenten = ahvIncome + pkRenteIncome;
      const totalExpThisYear = inflatedExpenses + oneTime
        + (hasProperty ? monthlyMortgage * 12 : 0);
      if (p1Retired || p2RetiredSimple) {
        const gap = totalExpThisYear - totalRenten;
        if (gap > 0) {
          assetConsumption = gap;
          wealth -= gap;
        }
      }

      // ---- Steuerschätzung ----
      const taxableIncome = ahvIncome + pkRenteIncome + employmentIncome;
      const taxRate = (p1Retired || p2RetiredSimple) ? 0.08 : 0.15;
      const estimatedTax = Math.round(taxableIncome * taxRate);
      // Steuern aus Vermögen / Renten abziehen (vereinfacht)
      if (p1Retired || p2RetiredSimple) wealth -= estimatedTax;

      cashflow.push({
        year, age,
        employmentIncome: Math.round(employmentIncome),
        ahvIncome: Math.round(ahvIncome),
        pkRenteIncome: Math.round(pkRenteIncome),
        pkKapitalWithdrawal: Math.round(pkKapitalWithdrawal),
        pillar3aWithdrawal: Math.round(pillar3aWithdrawal),
        assetIncome: Math.round(assetReturn),
        assetConsumption: Math.round(assetConsumption),
        totalIncome: Math.round(employmentIncome + ahvIncome + pkRenteIncome + assetReturn),
        livingExpenses: inflatedExpenses,
        mortgageCosts: hasProperty ? monthlyMortgage * 12 : 0,
        oneTimeExpenses: oneTime,
        taxes: estimatedTax,
        totalExpenses: Math.round(totalExpThisYear + estimatedTax),
        wealthEndOfYear: Math.round(wealth),
        isRetirementYear: isRetirementYearP1 || isRetirementYearP2,
        isCapitalWithdrawalYear: pkKapitalWithdrawal > 0,
      });
    }

    return cashflow;
  }

  // ============================================================
  // PRO-ANALYSE (aggregiert)
  // ============================================================
  function calculateProAnalysis(data) {
    const p1 = data.person1;
    const p2 = data.person2 || null;
    const civilStatus = data.civilStatus || 'ledig';

    const ahv = WW.calculateAhvHousehold(p1, p2, civilStatus);
    const pk  = WW.calculatePkHousehold(p1, p2);
    const cashflow = calculateYearlyCashflow(data);

    // Geld aufgebraucht?
    let ageWhenBroke = null;
    for (const c of cashflow) {
      if (c.age >= (p1.retirementAge || 65) && c.wealthEndOfYear <= 0) {
        ageWhenBroke = c.age;
        break;
      }
    }

    // Erstes vollpensioniertes Jahr für "monthlyIncome.total"
    const firstRetiredYear = cashflow.find(c => c.isRetirementYear)
      || cashflow.find(c => c.ahvIncome > 0 && c.pkRenteIncome > 0);
    const monthlyIncomeTotal = firstRetiredYear
      ? Math.round((firstRetiredYear.ahvIncome + firstRetiredYear.pkRenteIncome) / 12)
      : Math.round((ahv.combinedYearlyInkl13 + pk.combinedYearly) / 12);

    const monthlyExpenses = data.monthlyExpenses || 0;

    return {
      ahv, pk,
      yearlyCashflow: cashflow,
      ageWhenBroke,
      monthlyIncome: { total: monthlyIncomeTotal },
      monthlyExpenses,
      surplus: monthlyIncomeTotal - monthlyExpenses,
    };
  }

  // ============================================================
  // SZENARIEN
  // ============================================================
  function calculateScenarios(data) {
    const optimistic = calculateProAnalysis(Object.assign({}, data, {
      inflationRate: 0.01,
      investmentReturn: C.RETURNS.growth,
    }));
    const neutral = calculateProAnalysis(Object.assign({}, data, {
      inflationRate: C.DEFAULT_INFLATION_RATE,
      investmentReturn: C.RETURNS[data.riskProfile || 'balanced'],
    }));
    const pessimistic = calculateProAnalysis(Object.assign({}, data, {
      inflationRate: 0.025,
      investmentReturn: C.RETURNS.conservative,
    }));
    return { optimistic, neutral, pessimistic };
  }

  // ============================================================
  // SUSTAINABILITY SCORE 0-100
  // ============================================================
  function calculateSustainabilityScore(result) {
    let score = 50;
    const cov = result.monthlyExpenses > 0
      ? result.monthlyIncome.total / result.monthlyExpenses : 1;

    if (cov >= 1.2) score += 30;
    else if (cov >= 1.0) score += 20;
    else if (cov >= 0.9) score += 5;
    else if (cov >= 0.8) score -= 10;
    else score -= 30;

    if (!result.ageWhenBroke) score += 20;
    else if (result.ageWhenBroke > 90) score += 10;
    else if (result.ageWhenBroke > 85) score += 0;
    else if (result.ageWhenBroke > 80) score -= 10;
    else score -= 20;

    return Math.max(0, Math.min(100, score));
  }

  // ============================================================
  // EXPOSE
  // ============================================================
  Object.assign(WW, {
    calculateYearlyCashflow,
    calculateProAnalysis,
    calculateScenarios,
    calculateSustainabilityScore,
  });

})(window);
