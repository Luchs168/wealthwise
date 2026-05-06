/* WealthWise Chat – Trigger-Engine */
(function () {
  const INF = Number.POSITIVE_INFINITY;

  const triggers = [
    // Screen 1
    { id: "welcome_situation",
      condition: (d) => d.currentStep === "situation" && !d._welcomedSituation,
      cooldown: INF, priority: 100 },

    { id: "early_retirement_selected",
      condition: (d, p) =>
        d.person1 && d.person1.retirementAge < 65 &&
        d.person1.retirementAge !== (p && p.person1 && p.person1.retirementAge),
      cooldown: 60, priority: 90 },

    { id: "late_retirement_selected",
      condition: (d, p) =>
        d.person1 && d.person1.retirementAge > 65 &&
        d.person1.retirementAge !== (p && p.person1 && p.person1.retirementAge),
      cooldown: 60, priority: 80 },

    { id: "married_selected",
      condition: (d, p) =>
        d.civilStatus === "married" && d.civilStatus !== (p && p.civilStatus),
      cooldown: INF, priority: 70 },

    { id: "partner_added",
      condition: (d, p) =>
        d.person2 != null && (p == null || p.person2 == null),
      cooldown: INF, priority: 70 },

    // Screen 2
    { id: "welcome_vorsorge",
      condition: (d) => d.currentStep === "vorsorge" && !d._welcomedVorsorge,
      cooldown: INF, priority: 100 },

    { id: "low_income",
      condition: (d, p) =>
        d.person1 && d.person1.grossIncome > 0 && d.person1.grossIncome < 50000 &&
        d.person1.grossIncome !== (p && p.person1 && p.person1.grossIncome),
      cooldown: 120, priority: 60 },

    { id: "high_income",
      condition: (d, p) =>
        d.person1 && d.person1.grossIncome > 150000 &&
        d.person1.grossIncome !== (p && p.person1 && p.person1.grossIncome),
      cooldown: 120, priority: 60 },

    { id: "no_pension_fund",
      condition: (d, p) =>
        d.person1 && d.person1.hasPensionFund === false &&
        (p == null || !p.person1 || p.person1.hasPensionFund !== false),
      cooldown: INF, priority: 85 },

    { id: "low_pk_capital",
      condition: (d) => {
        if (!d.person1 || !d.person1.pkCapitalAt65 || !d.person1.grossIncome) return false;
        const age = d.person1.age || 55;
        const expected = d.person1.grossIncome * Math.max(1, age - 25) * 0.15;
        return d.person1.pkCapitalAt65 < expected * 0.5;
      },
      cooldown: 120, priority: 75 },

    { id: "low_conversion_rate",
      condition: (d, p) =>
        d.person1 && d.person1.pkConversionRate > 0 && d.person1.pkConversionRate < 5.5 &&
        d.person1.pkConversionRate !== (p && p.person1 && p.person1.pkConversionRate),
      cooldown: 120, priority: 65 },

    { id: "no_3a",
      condition: (d, p) =>
        d.currentStep === "vorsorge" && d.person1 && d.person1.has3a === false &&
        (p == null || !p.person1 || p.person1.has3a !== false),
      cooldown: INF, priority: 60 },

    // Screen 3
    { id: "welcome_ausgaben",
      condition: (d) => d.currentStep === "ausgaben" && !d._welcomedAusgaben,
      cooldown: INF, priority: 100 },

    { id: "expenses_above_average",
      condition: (d, p) =>
        d.currentStep === "ausgaben" && d.monthlyExpenses > 6000 &&
        d.monthlyExpenses !== (p && p.monthlyExpenses),
      cooldown: 120, priority: 60 },

    { id: "expenses_very_low",
      condition: (d, p) =>
        d.currentStep === "ausgaben" && d.monthlyExpenses > 0 && d.monthlyExpenses < 2500 &&
        d.monthlyExpenses !== (p && p.monthlyExpenses),
      cooldown: 120, priority: 65 },

    { id: "expenses_include_mortgage",
      condition: (d, p) =>
        d.currentStep === "ausgaben" && d.hasProperty === true &&
        (p == null || p.hasProperty !== true),
      cooldown: INF, priority: 55 },

    // Screen 4
    { id: "welcome_analyse",
      condition: (d) => d.currentStep === "analyse" && !d._welcomedAnalyse,
      cooldown: INF, priority: 100 },

    { id: "result_green",
      condition: (d) => d.currentStep === "analyse" && d.analysisResult && d.analysisResult.status === "green",
      cooldown: INF, priority: 95 },

    { id: "result_yellow",
      condition: (d) => d.currentStep === "analyse" && d.analysisResult && d.analysisResult.status === "yellow",
      cooldown: INF, priority: 95 },

    { id: "result_red",
      condition: (d) => d.currentStep === "analyse" && d.analysisResult && d.analysisResult.status === "red",
      cooldown: INF, priority: 95 },

    { id: "bridging_needed",
      condition: (d) =>
        d.currentStep === "analyse" && d.analysisResult &&
        d.analysisResult.bridgingPension && d.analysisResult.bridgingPension.needsBridging === true,
      cooldown: INF, priority: 90 },

    { id: "mortgage_not_affordable",
      condition: (d) =>
        d.currentStep === "analyse" && d.analysisResult && d.analysisResult.mortgageAffordability &&
        d.analysisResult.mortgageAffordability.isAffordableInRetirement === false,
      cooldown: INF, priority: 90 },
  ];

  // Warnungen (rote Trigger-IDs → anderer visueller Stil)
  const WARNING_TRIGGERS = new Set([
    "mortgage_not_affordable", "bridging_needed", "result_red",
  ]);

  function checkTriggers(currentData, previousData, firedTriggers) {
    const now = Date.now();
    const matching = triggers.filter((t) => {
      const lastFired = firedTriggers.get(t.id) || 0;
      if (t.cooldown === INF) {
        if (firedTriggers.has(t.id)) return false;
      } else {
        if (now - lastFired < t.cooldown * 1000) return false;
      }
      try { return !!t.condition(currentData, previousData); } catch (e) { return false; }
    });
    if (matching.length === 0) return null;
    matching.sort((a, b) => b.priority - a.priority);
    return matching[0].id;
  }

  const QUICK_QUESTIONS = {
    situation: [
      "Was bedeutet AHV-Referenzalter?",
      "Warum ist der Wohnort wichtig?",
      "Was bringt eine Frühpensionierung?",
    ],
    vorsorge: [
      "Was ist der Umwandlungssatz?",
      "Wo finde ich meine AHV-Informationen?",
      "Was bedeutet koordinierter Lohn?",
    ],
    ausgaben: [
      "Wie viel geben Schweizer Haushalte durchschnittlich aus?",
      "Welche Kosten fallen im Alter weg?",
      "Was bedeutet die 80%-Regel?",
    ],
    analyse: [
      "Welche Annahmen stecken in der Berechnung?",
      "Was kann ich tun, wenn es knapp wird?",
      "Wie sicher sind diese Zahlen?",
    ],
  };

  window.WW_CHAT_TRIGGERS = { triggers, checkTriggers, QUICK_QUESTIONS, WARNING_TRIGGERS };
})();
