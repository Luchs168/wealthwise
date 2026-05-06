/* WealthWise · Demo-Daten Loader
   Lädt die fiktive Persona "Thomas & Sandra Müller" in den wwStore und
   leitet auf Screen 4 weiter. Wird via window.wwLoadDemo() aufgerufen.
   ---------------------------------------------------------- */
(function () {
  "use strict";

  // Demo-Persona: Thomas (geb. 1969) & Sandra (geb. 1971), verheiratet, Wabern BE
  // Screen-1-Datum (heute) ist Mai 2026 → Thomas 56–57, Sandra 54–55
  const DEMO = {
    // Schritt 1 · Situation
    civilStatus: "married",
    selectedGoal: "rente",
    location: { plz: "3084", ort: "Wabern", gemeinde: "Köniz", kanton: "BE" },
    hasChildren: true,
    children: [
      { year: 1998 },
      { year: 2001 },
    ],
    person1: {
      name: "Thomas Müller",
      age: 57,
      gender: "m",
      retirementAge: 65,
    },
    person2: {
      name: "Sandra Müller",
      age: 55,
      gender: "f",
      retirementAge: 65,
    },

    // Schritt 2 · Vorsorge — persons-Array (Screen-2-Shape)
    persons: [
      {
        id: 1,
        name: "Thomas Müller",
        status: "erwerb",
        incomeMode: "manual",
        income: 120000,
        employmentGrade: 100,
        hasPK: true,
        pkMode: "manual",
        pkCapital: 520000,
        pkYearlyRente: 27560,
        has3a: true,
        balance3a: 72000,
        yearly3a: 7258,
        form3a: "wertschriften",
        hasFZ: true,
        fzBalance: 45000,
        currentRente: 0,
        age: 57,
        gender: "m",
        retirementAge: 65,
      },
      {
        id: 2,
        name: "Sandra Müller",
        status: "erwerb",
        incomeMode: "manual",
        income: 85000,
        employmentGrade: 80,
        hasPK: true,
        pkMode: "manual",
        pkCapital: 310000,
        pkYearlyRente: 17670,
        has3a: true,
        balance3a: 48000,
        yearly3a: 7258,
        form3a: "wertschriften",
        hasFZ: false,
        fzBalance: 0,
        currentRente: 0,
        age: 55,
        gender: "f",
        retirementAge: 65,
      },
    ],

    // AHV — Schätzung (greift auf persons.income + 44 Beitragsjahre zurück)
    ahvState: {
      mode: "unknown",
      j1: 44, e1: 120000,
      j2: 44, e2: 85000,
      fromDoc: false,
    },

    // Vermögen
    cash: 85000,
    securities: 120000,
    freeAssets: 205000,
    property: {
      has: true,
      type: "eigentumswohnung",
      use: "selbst",
      value: 850000,
      mortgage: 480000,
      rate: 1.8,
    },
    hasProperty: true,
    propertyValue: 850000,

    // Schritt 3 · Ausgaben
    expenses: {
      mode: "simple",
      simpleTotal: 9200,
      detailed: {},
      filledFromBFS: {},
      goal: "custom",
      customAmount: 7800,
    },
    monthlyExpenses: 9200,
    retirementBudget: 7800,
    sparquote: 3850,

    // Meta
    isDemo: true,
    demoLoadedAt: Date.now(),
  };

  function loadDemo() {
    if (!window.wwStore) {
      // store.js noch nicht geladen → kurz warten
      setTimeout(loadDemo, 50);
      return;
    }
    // Demo-Flag in sessionStorage, damit Screen 4 den Toast einmalig zeigt
    try { sessionStorage.setItem("ww.demoToast", "1"); } catch (e) {}
    window.wwStore.replace(DEMO);
    location.href = "WealthWise - Screen 4 Analyse.html";
  }

  function showDemoToastIfNeeded() {
    try {
      if (sessionStorage.getItem("ww.demoToast") !== "1") return;
      sessionStorage.removeItem("ww.demoToast");
    } catch (e) { return; }

    const el = document.createElement("div");
    el.className = "ww-demo-toast";
    el.innerHTML = `
      <div class="ww-demo-toast-icon">i</div>
      <div class="ww-demo-toast-body">
        <div class="ww-demo-toast-title">Demo-Daten geladen</div>
        <div class="ww-demo-toast-sub">Dies ist ein fiktives Beispiel zur Veranschaulichung. Du kannst alle Werte beliebig anpassen oder über die Schritte oben durchnavigieren.</div>
      </div>
      <button class="ww-demo-toast-close" aria-label="Schliessen">×</button>
    `;
    el.querySelector(".ww-demo-toast-close").onclick = () => el.classList.add("hide");
    setTimeout(() => el.classList.add("hide"), 8000);
    el.addEventListener("animationend", (ev) => {
      if (ev.animationName === "wwDemoToastOut") el.remove();
    });

    // CSS einmalig injizieren
    if (!document.getElementById("ww-demo-toast-style")) {
      const s = document.createElement("style");
      s.id = "ww-demo-toast-style";
      s.textContent = `
        .ww-demo-toast {
          position: fixed; top: 80px; right: 24px; z-index: 250;
          width: 360px; max-width: calc(100vw - 32px);
          background: #fff; color: #111f3a;
          border: 1px solid #d8dfeb; border-left: 4px solid #2a6fdb;
          border-radius: 12px; box-shadow: 0 12px 32px rgba(17, 31, 58, 0.14);
          padding: 14px 16px; padding-right: 40px;
          display: grid; grid-template-columns: 24px 1fr; gap: 12px;
          font-family: "Inter", system-ui, sans-serif;
          animation: wwDemoToastIn .3s ease;
        }
        .ww-demo-toast.hide { animation: wwDemoToastOut .25s ease forwards; }
        .ww-demo-toast-icon {
          width: 24px; height: 24px; border-radius: 50%;
          background: #2a6fdb; color: #fff;
          display: grid; place-items: center;
          font-weight: 700; font-size: 14px; font-style: italic;
        }
        .ww-demo-toast-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
        .ww-demo-toast-sub { font-size: 13px; line-height: 1.45; color: #4a5568; }
        .ww-demo-toast-close {
          position: absolute; top: 8px; right: 10px;
          background: transparent; border: 0; cursor: pointer;
          font-size: 20px; line-height: 1; color: #718096;
          padding: 4px 8px; border-radius: 6px;
        }
        .ww-demo-toast-close:hover { background: #f0f4fa; }
        @keyframes wwDemoToastIn  { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wwDemoToastOut { to   { opacity: 0; transform: translateY(-12px); } }
        @media (max-width: 640px) {
          .ww-demo-toast { right: 12px; left: 12px; width: auto; top: 72px; }
        }
      `;
      document.head.appendChild(s);
    }

    document.body.appendChild(el);
  }

  window.wwLoadDemo = loadDemo;
  window.wwShowDemoToast = showDemoToastIfNeeded;

  // Auf Screen 4: Toast automatisch zeigen
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", showDemoToastIfNeeded);
  } else {
    showDemoToastIfNeeded();
  }
})();
