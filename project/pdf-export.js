/* ============================================================
   WealthWise PDF-Export
   Generiert eine 6-seitige A4-Vorsorgeanalyse aus dem Store.
   Verwendet jsPDF + jspdf-autotable (CDN-loaded).
   ============================================================ */
(function () {
  "use strict";

  /* ---------- Helpers ---------- */
  const fmt = (n) => {
    const x = Math.round(Number(n) || 0);
    return x.toLocaleString("de-CH").replace(/,/g, "'").replace(/\u202f/g, "'").replace(/\u2019/g, "'");
  };
  const fmtCHF = (n) => "CHF " + fmt(n);
  const fmtPct = (n, d = 1) => (Number(n) || 0).toFixed(d).replace(".", ".") + "%";
  const fmtDate = (d) => {
    const dd = d || new Date();
    const day = String(dd.getDate()).padStart(2, "0");
    const m = String(dd.getMonth() + 1).padStart(2, "0");
    return `${day}.${m}.${dd.getFullYear()}`;
  };
  const fmtDateISO = (d) => {
    const dd = d || new Date();
    const day = String(dd.getDate()).padStart(2, "0");
    const m = String(dd.getMonth() + 1).padStart(2, "0");
    return `${dd.getFullYear()}-${m}-${day}`;
  };
  const safe = (v, fallback = "") => (v === null || v === undefined || v === "" ? fallback : v);

  /* ---------- Colors ---------- */
  const C = {
    ink: [30, 41, 59],         // #1e293b - headings
    body: [55, 65, 81],         // #374151 - body
    muted: [107, 114, 128],     // #6b7280 - secondary
    rule: [203, 213, 225],      // #cbd5e1 - dividers
    brand: [59, 76, 124],       // WealthWise navy
    good: [34, 139, 80],        // green
    warn: [191, 138, 39],       // amber
    bad: [200, 65, 54],         // red
    bgGood: [232, 245, 235],
    bgWarn: [253, 244, 224],
    bgBad: [251, 233, 230],
  };

  /* ---------- Read state ---------- */
  function readState() {
    const s = (window.wwStore && window.wwStore.get && window.wwStore.get()) || {};
    const persons = Array.isArray(s.persons) ? s.persons : [];
    const p1 = persons[0] || {};
    const p2 = persons[1] || {};
    const profile1 = s.person1 || {};
    const profile2 = s.person2 || {};

    return {
      raw: s,
      civilStatus: s.civilStatus || "single",
      isPaar: (s.civilStatus === "married" || s.civilStatus === "registered" || persons.length >= 2),
      location: s.location || {},
      hasChildren: !!s.hasChildren,
      children: Array.isArray(s.children) ? s.children : [],
      person1: {
        name: profile1.name || p1.name || "Person 1",
        age: profile1.age || p1.age || null,
        gender: profile1.gender || p1.gender || null,
        retirementAge: profile1.retirementAge || p1.retirementAge || 65,
        income: p1.income ?? profile1.grossIncome ?? null,
        employmentGrade: p1.employmentGrade ?? null,
        pkCapital: p1.pkCapital ?? null,
        pkYearlyRente: p1.pkYearlyRente ?? null,
        balance3a: p1.balance3a ?? null,
        yearly3a: p1.yearly3a ?? null,
        form3a: p1.form3a || null,
        fzBalance: p1.fzBalance ?? null,
        hasPK: p1.hasPK,
        has3a: p1.has3a,
        hasFZ: p1.hasFZ,
      },
      person2: {
        name: profile2.name || p2.name || (s.civilStatus === "married" ? "Person 2" : null),
        age: profile2.age || p2.age || null,
        gender: profile2.gender || p2.gender || null,
        retirementAge: profile2.retirementAge || p2.retirementAge || 65,
        income: p2.income ?? profile2.grossIncome ?? null,
        employmentGrade: p2.employmentGrade ?? null,
        pkCapital: p2.pkCapital ?? null,
        pkYearlyRente: p2.pkYearlyRente ?? null,
        balance3a: p2.balance3a ?? null,
        yearly3a: p2.yearly3a ?? null,
        form3a: p2.form3a || null,
        fzBalance: p2.fzBalance ?? null,
        hasPK: p2.hasPK,
        has3a: p2.has3a,
        hasFZ: p2.hasFZ,
      },
      cash: s.cash ?? null,
      securities: s.securities ?? null,
      property: s.property || null,
      expenses: s.expenses || null,
      monthlyExpenses: s.monthlyExpenses ?? null,
      retirementBudget: s.retirementBudget ?? null,
      sparquote: s.sparquote ?? null,
    };
  }

  /* ---------- Compute analysis (mirror Screen 4) ---------- */
  function computeAnalysis(st) {
    const isPaar = st.isPaar;
    const p1 = st.person1, p2 = st.person2;

    // AHV (mirror Screen 4 logic)
    const ahvSolo = 2520;
    const baseAhvRaw = isPaar ? ahvSolo * 2 : ahvSolo;
    const baseAhv = isPaar ? Math.min(baseAhvRaw, 3675) : baseAhvRaw;
    const ahvMonth = baseAhv;

    // PK Renten (monthly)
    const pk1Yearly = Number(p1.pkYearlyRente) || 0;
    const pk2Yearly = Number(p2.pkYearlyRente) || 0;
    const pk1 = pk1Yearly > 0 ? pk1Yearly / 12 : ((Number(p1.pkCapital) || 0) * 5.8 / 100) / 12;
    const pk2 = pk2Yearly > 0 ? pk2Yearly / 12 : ((Number(p2.pkCapital) || 0) * 5.8 / 100) / 12;
    const pkMonth = pk1 + (isPaar ? pk2 : 0);

    const einnahmen = ahvMonth + pkMonth;
    const target = Number(st.retirementBudget) || Number(st.monthlyExpenses) || 0;
    const gap = Math.max(0, target - einnahmen);
    const surplus = Math.max(0, einnahmen - target);

    // 3a Projektion
    const yearsToRet1 = Math.max(0, (p1.retirementAge || 65) - (p1.age || 0));
    const yearsToRet2 = isPaar ? Math.max(0, (p2.retirementAge || 65) - (p2.age || 0)) : 0;
    const proj3a = (bal, yearly, years) => bal * Math.pow(1.04, years) + yearly * (Math.pow(1.04, years) - 1) / 0.04;
    const p1Proj3a = proj3a(Number(p1.balance3a) || 0, Number(p1.yearly3a) || 0, yearsToRet1);
    const p2Proj3a = isPaar ? proj3a(Number(p2.balance3a) || 0, Number(p2.yearly3a) || 0, yearsToRet2) : 0;

    const fz = (Number(p1.fzBalance) || 0) + (isPaar ? Number(p2.fzBalance) || 0 : 0);
    const cash = Number(st.cash) || 0;
    const securities = Number(st.securities) || 0;
    const totalCapital = cash + securities + p1Proj3a + p2Proj3a + fz;

    // Property
    const propertyValue = Number(st.property?.value) || 0;
    const mortgage = Number(st.property?.mortgage) || 0;
    const netProperty = Math.max(0, propertyValue - mortgage);
    const belehnung = propertyValue > 0 ? (mortgage / propertyValue) * 100 : 0;

    // Variant
    let variant;
    if (gap === 0) variant = "good";
    else if (gap <= 500) variant = "warn";
    else variant = "bad";

    // Reach age (rough)
    const monthlyDraw = gap;
    const yearsKapital = monthlyDraw > 0 ? totalCapital / (monthlyDraw * 12) : 999;
    const reachAge = monthlyDraw > 0 && yearsKapital < 35 ? Math.round((p1.retirementAge || 65) + yearsKapital) : null;

    // Total income hh
    const totalIncome = (Number(p1.income) || 0) + (Number(p2.income) || 0);

    return {
      ahvMonth, pkMonth, pk1, pk2, einnahmen, target, gap, surplus, variant,
      p1Proj3a, p2Proj3a, fz, cash, securities, totalCapital,
      propertyValue, mortgage, netProperty, belehnung,
      reachAge, totalIncome,
    };
  }

  /* ---------- Page chrome ---------- */
  const PAGE_W = 210, PAGE_H = 297;
  const M_LEFT = 25, M_RIGHT = 25, M_TOP = 20, M_BOTTOM = 20;
  const CONTENT_W = PAGE_W - M_LEFT - M_RIGHT;

  function drawHeader(doc, pageNum) {
    // Logo top-left (text-based)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.brand);
    doc.text("WealthWise", M_LEFT, 12);
    // Subtle rule
    doc.setDrawColor(...C.rule);
    doc.setLineWidth(0.2);
    doc.line(M_LEFT, 14, PAGE_W - M_RIGHT, 14);
    // Page number bottom-right
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text(`Seite ${pageNum}`, PAGE_W - M_RIGHT, PAGE_H - 10, { align: "right" });
    doc.text("WealthWise · Vorsorgeanalyse", M_LEFT, PAGE_H - 10);
  }

  function sectionTitle(doc, y, num, text) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...C.ink);
    doc.text(`${num}. ${text}`, M_LEFT, y);
    return y + 8;
  }

  function subTitle(doc, y, text) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...C.ink);
    doc.text(text, M_LEFT, y);
    doc.setDrawColor(...C.rule);
    doc.setLineWidth(0.2);
    doc.line(M_LEFT, y + 1.5, PAGE_W - M_RIGHT, y + 1.5);
    return y + 6;
  }

  function bodyText(doc, x, y, text, opts = {}) {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size || 10);
    doc.setTextColor(...(opts.color || C.body));
    if (opts.maxWidth) {
      const lines = doc.splitTextToSize(text, opts.maxWidth);
      doc.text(lines, x, y, { align: opts.align || "left" });
      return y + lines.length * (opts.size ? opts.size * 0.45 : 4.5);
    }
    doc.text(text, x, y, { align: opts.align || "left" });
    return y + 4.5;
  }

  /* Simple two-column row: label left, value right (right-aligned) */
  function row(doc, y, label, value, opts = {}) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...C.body);
    doc.text(label, M_LEFT + 2, y);
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setTextColor(...(opts.valueColor || C.ink));
    doc.text(value, PAGE_W - M_RIGHT - 2, y, { align: "right" });
    return y + 5.5;
  }

  function rule(doc, y) {
    doc.setDrawColor(...C.rule);
    doc.setLineWidth(0.2);
    doc.line(M_LEFT, y, PAGE_W - M_RIGHT, y);
    return y + 4;
  }

  /* Tabular row with multiple columns (e.g. Thomas / Sandra) */
  function dataRow(doc, y, cols, opts = {}) {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(...(opts.color || C.body));
    const colW = CONTENT_W / cols.length;
    cols.forEach((c, i) => {
      const x = M_LEFT + colW * i + (i === 0 ? 2 : colW - 2);
      doc.text(c, x, y, { align: i === 0 ? "left" : "right" });
    });
    return y + 5.5;
  }

  /* Three-column row (label | thomas | sandra) */
  function tripleRow(doc, y, label, c1, c2, opts = {}) {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(10);
    doc.setTextColor(...(opts.color || (opts.bold ? C.ink : C.body)));
    const labelW = CONTENT_W * 0.45;
    const colW = (CONTENT_W - labelW) / 2;
    doc.text(label, M_LEFT + 2, y);
    doc.text(c1, M_LEFT + labelW + colW - 2, y, { align: "right" });
    doc.text(c2, M_LEFT + labelW + colW * 2 - 2, y, { align: "right" });
    return y + 5.5;
  }

  /* ---------- Page 1: Title ---------- */
  function pageTitle(doc, st) {
    drawHeader(doc, 1);
    let y = 60;

    // Big WealthWise mark
    doc.setFont("helvetica", "bold");
    doc.setFontSize(32);
    doc.setTextColor(...C.brand);
    doc.text("WealthWise", PAGE_W / 2, y, { align: "center" });
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...C.muted);
    doc.text("Schweizer Vorsorgeplanung", PAGE_W / 2, y, { align: "center" });
    y += 30;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...C.ink);
    doc.text("Vorsorgeanalyse", PAGE_W / 2, y, { align: "center" });
    y += 18;

    // Names
    const names = st.isPaar
      ? `${st.person1.name} & ${st.person2.name}`
      : st.person1.name;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...C.body);
    doc.text(names, PAGE_W / 2, y, { align: "center" });
    y += 8;

    // Location
    if (st.location.plz || st.location.ort) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(...C.muted);
      const loc = `${safe(st.location.plz, "")} ${safe(st.location.ort, "")}${st.location.kanton ? ` (${st.location.kanton})` : ""}`.trim();
      doc.text(loc, PAGE_W / 2, y, { align: "center" });
      y += 8;
    }

    // Date
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...C.muted);
    doc.text(`Erstellt am ${fmtDate()}`, PAGE_W / 2, y, { align: "center" });

    // Disclaimer block at bottom
    const dy = PAGE_H - 60;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...C.rule);
    doc.roundedRect(M_LEFT, dy, CONTENT_W, 32, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.warn);
    doc.text("Hinweis", M_LEFT + 6, dy + 7);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.body);
    const lines = doc.splitTextToSize(
      "Diese Analyse dient zur Orientierung und ersetzt keine professionelle Finanzberatung. Berechnungen basieren auf vereinfachten Annahmen und aktuellen Schweizer Vorsorgedaten 2026.",
      CONTENT_W - 12
    );
    doc.text(lines, M_LEFT + 6, dy + 13);

    // Footer brand line
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text("WealthWise · Made in Switzerland", PAGE_W / 2, PAGE_H - 18, { align: "center" });
  }

  /* ---------- Page 2: Ausgangslage ---------- */
  function pageBaseline(doc, st) {
    drawHeader(doc, 2);
    let y = 30;
    y = sectionTitle(doc, y, 1, "Ausgangslage");
    y += 2;

    // Personen
    y = subTitle(doc, y, "Personen");
    if (st.person1.age != null) {
      y = row(doc, y, st.person1.name, `${st.person1.age} Jahre`);
    }
    if (st.isPaar && st.person2.age != null) {
      y = row(doc, y, st.person2.name, `${st.person2.age} Jahre`);
    }
    y = row(doc, y, "Zivilstand", civilLabel(st.civilStatus));
    if (st.location.plz || st.location.ort) {
      const loc = `${safe(st.location.plz, "")} ${safe(st.location.ort, "")}${st.location.kanton ? ` (${st.location.kanton})` : ""}`.trim();
      y = row(doc, y, "Wohnort", loc);
    }
    if (st.hasChildren && st.children.length) {
      const years = st.children.map(c => c.year).filter(Boolean).join(", ");
      y = row(doc, y, "Kinder", `${st.children.length}${years ? ` (${years})` : ""}`);
    }
    y += 4;

    // Pensionierung
    y = subTitle(doc, y, "Pensionierung");
    const thisYear = new Date().getFullYear();
    if (st.person1.age != null) {
      const yrs = (st.person1.retirementAge || 65) - st.person1.age;
      y = row(doc, y, st.person1.name, `${thisYear + yrs} (Alter ${st.person1.retirementAge || 65})`);
    }
    if (st.isPaar && st.person2.age != null) {
      const yrs = (st.person2.retirementAge || 65) - st.person2.age;
      y = row(doc, y, st.person2.name, `${thisYear + yrs} (Alter ${st.person2.retirementAge || 65})`);
    }
    y += 4;

    // Einkommen
    const hasIncome = st.person1.income || st.person2.income;
    if (hasIncome) {
      y = subTitle(doc, y, "Einkommen");
      if (st.person1.income) {
        const grade = st.person1.employmentGrade ? ` (${st.person1.employmentGrade}%)` : "";
        y = row(doc, y, st.person1.name, fmtCHF(st.person1.income) + grade);
      }
      if (st.isPaar && st.person2.income) {
        const grade = st.person2.employmentGrade ? ` (${st.person2.employmentGrade}%)` : "";
        y = row(doc, y, st.person2.name, fmtCHF(st.person2.income) + grade);
      }
      const total = (Number(st.person1.income) || 0) + (Number(st.person2.income) || 0);
      y = rule(doc, y);
      y = row(doc, y, "Total Haushalt", fmtCHF(total) + " / Jahr", { bold: true });
      y += 4;
    }

    // Wohnsituation
    if (st.property && st.property.value) {
      y = subTitle(doc, y, "Wohnsituation");
      const typeLabel = propertyTypeLabel(st.property.type);
      const useLabel = st.property.use === "selbst" ? "selbst bewohnt" : "vermietet";
      y = row(doc, y, "Typ", `${typeLabel}${useLabel ? ` (${useLabel})` : ""}`);
      y = row(doc, y, "Verkehrswert", fmtCHF(st.property.value));
      if (st.property.mortgage) {
        y = row(doc, y, "Hypothek", fmtCHF(st.property.mortgage));
        const bel = (st.property.mortgage / st.property.value) * 100;
        y = row(doc, y, "Belehnung", fmtPct(bel, 1));
      }
    }
  }

  /* ---------- Page 3: Vorsorge ---------- */
  function pageVorsorge(doc, st, an) {
    drawHeader(doc, 3);
    let y = 30;
    y = sectionTitle(doc, y, 2, "Vorsorge-Übersicht");
    y += 2;

    // Renten
    y = subTitle(doc, y, "Monatliche Renten im Alter");

    // Header row
    if (st.isPaar) {
      y = tripleRow(doc, y, "", st.person1.name, st.person2.name, { bold: true, color: C.muted });
    }

    // AHV
    if (st.isPaar) {
      // Show AHV split note
      y = tripleRow(doc, y, "AHV-Rente (Schätzung)", fmtCHF(an.ahvMonth / 2), fmtCHF(an.ahvMonth / 2));
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...C.muted);
      doc.text("Ehepaar plafoniert auf max. CHF 3'675 / Mt.", M_LEFT + 2, y);
      y += 5;
    } else {
      y = row(doc, y, "AHV-Rente (Schätzung)", fmtCHF(an.ahvMonth));
    }

    // PK
    if (st.isPaar) {
      y = tripleRow(doc, y, "PK-Rente", fmtCHF(an.pk1), fmtCHF(an.pk2));
    } else {
      y = row(doc, y, "PK-Rente", fmtCHF(an.pkMonth));
    }

    y = rule(doc, y);
    y = row(doc, y, "Total Renten", fmtCHF(an.einnahmen) + " / Monat", { bold: true });
    y = row(doc, y, "", fmtCHF(an.einnahmen * 12) + " / Jahr", { bold: false, valueColor: C.muted });
    y += 4;

    // Kapitalien
    y = subTitle(doc, y, "Kapitalien (bei Pensionierung)");
    if (st.isPaar) {
      y = tripleRow(doc, y, "", st.person1.name, st.person2.name, { bold: true, color: C.muted });
    }

    // FZ
    const hasFZ1 = st.person1.fzBalance != null && st.person1.fzBalance > 0;
    const hasFZ2 = st.isPaar && st.person2.fzBalance != null && st.person2.fzBalance > 0;
    if (hasFZ1 || hasFZ2) {
      if (st.isPaar) {
        y = tripleRow(doc, y, "Freizügigkeit", hasFZ1 ? fmtCHF(st.person1.fzBalance) : "—", hasFZ2 ? fmtCHF(st.person2.fzBalance) : "—");
      } else {
        y = row(doc, y, "Freizügigkeit", fmtCHF(st.person1.fzBalance));
      }
    }

    // 3a Projektion
    if (an.p1Proj3a > 0 || an.p2Proj3a > 0) {
      if (st.isPaar) {
        y = tripleRow(doc, y, "Säule 3a (projiziert)", an.p1Proj3a > 0 ? fmtCHF(an.p1Proj3a) : "—", an.p2Proj3a > 0 ? fmtCHF(an.p2Proj3a) : "—");
      } else {
        y = row(doc, y, "Säule 3a (projiziert)", fmtCHF(an.p1Proj3a));
      }
    }

    y = rule(doc, y);
    if (an.cash > 0) y = row(doc, y, "Bargeld", fmtCHF(an.cash));
    if (an.securities > 0) y = row(doc, y, "Wertschriften", fmtCHF(an.securities));
    y = row(doc, y, "Total Kapital", fmtCHF(an.totalCapital), { bold: true });
    y += 4;

    if (an.netProperty > 0) {
      y = row(doc, y, "Immobilie (netto)", fmtCHF(an.netProperty), { bold: true, valueColor: C.muted });
      y += 2;
    }

    // Hinweise
    y += 4;
    y = subTitle(doc, y, "Hinweise zu den Berechnungen");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.body);
    const notes = [
      "AHV: Schätzung basierend auf vollem Beitragsverlauf (Skala 44).",
      "PK-Rente: Werte aus PK-Ausweis oder Schätzung (5.8% Umwandlungssatz).",
      "Säule 3a: Projiziert mit 4% Rendite p.a. (Wertschriften) bzw. 0.5% (Konto).",
    ];
    notes.forEach(n => {
      const lines = doc.splitTextToSize("• " + n, CONTENT_W - 4);
      doc.text(lines, M_LEFT + 2, y);
      y += lines.length * 4.2;
    });
  }

  /* ---------- Page 4: Budget ---------- */
  function pageBudget(doc, st, an) {
    drawHeader(doc, 4);
    let y = 30;
    y = sectionTitle(doc, y, 3, "Budget & Bedarf im Alter");
    y += 2;

    const exp = st.expenses || {};
    const mode = exp.mode || "simple";

    // Heutige Ausgaben
    y = subTitle(doc, y, "Heutige Ausgaben");
    if (mode === "detailed" && exp.detailed && Object.keys(exp.detailed).length) {
      const labels = {
        wohnen: "Wohnen & Energie",
        lebensmittel: "Lebensmittel",
        mobilitaet: "Mobilität",
        gesundheit: "Gesundheit",
        freizeit: "Freizeit",
        ferien: "Ferien",
        kleidung: "Kleidung",
        kommunikation: "Kommunikation",
        auswaertsEssen: "Auswärts essen",
        bildung: "Bildung",
        steuern: "Steuern",
        sonstiges: "Sonstiges",
      };
      let total = 0;
      Object.keys(labels).forEach(k => {
        const v = exp.detailed[k];
        if (v && v > 0) {
          y = row(doc, y, labels[k], fmtCHF(v));
          total += Number(v);
        }
      });
      y = rule(doc, y);
      y = row(doc, y, "Total heute", fmtCHF(total) + " / Mt.", { bold: true });
    } else {
      const total = exp.simpleTotal || st.monthlyExpenses || 0;
      y = row(doc, y, "Lebenshaltungskosten (vereinfacht)", fmtCHF(total) + " / Mt.");
      y = rule(doc, y);
      y = row(doc, y, "Total heute", fmtCHF(total) + " / Mt.", { bold: true });
    }
    y += 6;

    // Bedarf im Alter
    y = subTitle(doc, y, "Geschätzter Bedarf im Alter");
    const target = st.retirementBudget || an.target;
    y = row(doc, y, "Zielbetrag", fmtCHF(target) + " / Mt.", { bold: true });
    const heute = exp.simpleTotal || st.monthlyExpenses || 0;
    if (heute > 0 && target > 0) {
      const ratio = (target / heute) * 100;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...C.muted);
      doc.text(`(ca. ${Math.round(ratio)}% der heutigen Ausgaben)`, M_LEFT + 2, y);
      y += 5;
    }
    y += 4;

    // Sparquote
    if (an.totalIncome > 0 && heute > 0) {
      y = subTitle(doc, y, "Sparquote bis Pensionierung");
      const monthlyIncome = an.totalIncome / 12;
      const sparquote = monthlyIncome - heute;
      const sparPct = (sparquote / monthlyIncome) * 100;
      y = row(doc, y, "Einkommen Haushalt", fmtCHF(monthlyIncome) + " / Mt.");
      y = row(doc, y, "Ausgaben heute", fmtCHF(heute) + " / Mt.");
      y = rule(doc, y);
      y = row(doc, y, "Sparquote", `${fmtCHF(sparquote)} / Mt. (${fmtPct(sparPct, 0)})`, { bold: true, valueColor: sparPct >= 10 ? C.good : C.body });
    }
  }

  /* ---------- Page 5: Ergebnis ---------- */
  function pageResult(doc, st, an) {
    drawHeader(doc, 5);
    let y = 30;
    y = sectionTitle(doc, y, 4, "Ergebnis");
    y += 2;

    // Result box (colored)
    const bgColor = an.variant === "good" ? C.bgGood : an.variant === "warn" ? C.bgWarn : C.bgBad;
    const fgColor = an.variant === "good" ? C.good : an.variant === "warn" ? C.warn : C.bad;
    const headline = an.variant === "good"
      ? "Eure Renten decken den Bedarf im Alter."
      : an.variant === "warn"
        ? "Es reicht – aber nicht unbegrenzt."
        : "Es wird knapp.";
    const emoji = an.variant === "good" ? "✓" : an.variant === "warn" ? "!" : "✕";

    doc.setFillColor(...bgColor);
    doc.setDrawColor(...fgColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(M_LEFT, y, CONTENT_W, 28, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...fgColor);
    doc.text(emoji, M_LEFT + 8, y + 14);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...C.ink);
    doc.text(headline, M_LEFT + 22, y + 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.body);
    const detail = an.gap > 0
      ? `Monatliche Lücke: ${fmtCHF(an.gap)} – muss aus Kapital gedeckt werden.`
      : `Monatlicher Überschuss: ${fmtCHF(an.surplus)}.`;
    doc.text(detail, M_LEFT + 22, y + 19);
    y += 36;

    // Rechnung
    y = subTitle(doc, y, "Rechnung");
    y = row(doc, y, "Einnahmen im Alter", fmtCHF(an.einnahmen) + " / Mt.");
    y = row(doc, y, "Zielbetrag", fmtCHF(an.target) + " / Mt.");
    y = rule(doc, y);
    if (an.gap > 0) {
      y = row(doc, y, "Lücke", fmtCHF(an.gap) + " / Mt.", { bold: true, valueColor: fgColor });
    } else {
      y = row(doc, y, "Überschuss", fmtCHF(an.surplus) + " / Mt.", { bold: true, valueColor: C.good });
    }
    y += 4;

    y = row(doc, y, "Verfügbares Kapital", fmtCHF(an.totalCapital), { bold: true });
    if (an.reachAge != null) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...C.muted);
      doc.text(`→ Kapital reicht voraussichtlich bis Alter ${an.reachAge}.`, M_LEFT + 2, y);
      y += 5;
    } else if (an.gap === 0 || an.totalCapital > 200000) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...C.muted);
      doc.text("→ Kapital reicht weit über das 95. Lebensjahr hinaus.", M_LEFT + 2, y);
      y += 5;
    }
    y += 6;

    // Szenarien (tabellarisch)
    y = subTitle(doc, y, "Szenarien");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    const colW = CONTENT_W / 4;
    doc.text("", M_LEFT + 2, y);
    doc.text("Optimistisch", M_LEFT + colW + colW - 2, y, { align: "right" });
    doc.text("Realistisch", M_LEFT + colW + colW * 2 - 2, y, { align: "right" });
    doc.text("Pessimistisch", M_LEFT + colW + colW * 3 - 2, y, { align: "right" });
    y += 5;

    const scenarioRow = (label, vOpt, vReal, vPess) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.body);
      doc.text(label, M_LEFT + 2, y);
      doc.text(vOpt, M_LEFT + colW + colW - 2, y, { align: "right" });
      doc.text(vReal, M_LEFT + colW + colW * 2 - 2, y, { align: "right" });
      doc.text(vPess, M_LEFT + colW + colW * 3 - 2, y, { align: "right" });
      y += 5;
    };
    scenarioRow("Rendite p.a.", "4%", "2%", "0.5%");
    scenarioRow("Inflation p.a.", "0.5%", "1%", "2%");
    scenarioRow("Reicht bis Alter", "95+", an.reachAge ? String(an.reachAge) : "95+", an.reachAge ? String(Math.max(75, an.reachAge - 5)) : "85");
    y += 6;

    // Annahmen
    y = subTitle(doc, y, "Annahmen");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.body);
    const annahmen = [
      "Rendite auf Kapital: 2% p.a. (realistisches Szenario)",
      "Inflation: 1% p.a.",
      "Lebenserwartung: 90 Jahre",
      "AHV/PK-Renten: nominal (ohne Teuerungsausgleich)",
    ];
    annahmen.forEach(a => {
      doc.text("• " + a, M_LEFT + 2, y);
      y += 4.5;
    });
  }

  /* ---------- Page 6: Empfehlungen ---------- */
  function pageRecommendations(doc, st, an) {
    drawHeader(doc, 6);
    let y = 30;
    y = sectionTitle(doc, y, 5, "Handlungsempfehlungen");
    y += 2;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...C.body);
    doc.text("Basierend auf eurer Situation:", M_LEFT, y);
    y += 8;

    // Build recommendations dynamically
    const recs = [];
    if (an.gap > 0) {
      recs.push({
        title: "Lücke schliessen",
        text: `Eure monatliche Lücke beträgt ${fmtCHF(an.gap)}. Prüft, ob ihr durch Säule 3a, PK-Einkäufe oder Wertschriften das Kapital weiter aufbauen könnt.`,
      });
    }
    if ((Number(st.person1.yearly3a) || 0) < 7258 || (st.isPaar && (Number(st.person2.yearly3a) || 0) < 7258)) {
      recs.push({
        title: "Säule 3a maximieren",
        text: "Den Maximalbetrag in die Säule 3a einzahlen (CHF 7'258 pro Person und Jahr für Erwerbstätige mit PK). Steuerlich sehr effizient.",
      });
    }
    if (an.totalIncome > 150000) {
      recs.push({
        title: "PK-Einkauf prüfen",
        text: "Bei eurem Einkommen kann ein freiwilliger PK-Einkauf erhebliche Steuern sparen. Lasst euch bei eurer Pensionskasse die Einkaufslücke berechnen.",
      });
    }
    if (an.belehnung > 50) {
      recs.push({
        title: "Hypothek im Alter",
        text: `Eure Belehnung liegt bei ${fmtPct(an.belehnung, 1)}. Im Alter ist meist eine Belehnung von max. 50–66% nötig (Tragbarkeit mit Rente). Prüft, ob eine Amortisation auf 50% sinnvoll ist.`,
      });
    }
    if (an.totalCapital > 500000) {
      recs.push({
        title: "Rente vs. Kapital bei der PK",
        text: "Die Wahl zwischen Rente, Kapital oder Mix ist eine der wichtigsten Entscheidungen. Diese ist individuell – eine persönliche Beratung wird empfohlen.",
      });
    }
    if (recs.length === 0) {
      recs.push({
        title: "Status erhalten",
        text: "Eure Vorsorgesituation ist solide. Überprüft eure Planung alle 2–3 Jahre und passt bei grösseren Lebensereignissen an.",
      });
    }

    recs.forEach(r => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...C.ink);
      doc.text("• " + r.title, M_LEFT + 2, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.body);
      const lines = doc.splitTextToSize(r.text, CONTENT_W - 8);
      doc.text(lines, M_LEFT + 6, y);
      y += lines.length * 4.2 + 5;
    });

    y += 6;

    // 6. Hinweise
    y = sectionTitle(doc, y, 6, "Wichtige Hinweise");

    // Yellow box
    doc.setFillColor(253, 244, 224);
    doc.setDrawColor(...C.warn);
    doc.setLineWidth(0.3);
    doc.roundedRect(M_LEFT, y, CONTENT_W, 20, 2, 2, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...C.warn);
    doc.text("!", M_LEFT + 5, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.body);
    const dLines = doc.splitTextToSize(
      "Diese Analyse ist eine Orientierung und keine verbindliche Beratung. Für verbindliche Entscheidungen empfehlen wir eine qualifizierte Fachperson.",
      CONTENT_W - 18
    );
    doc.text(dLines, M_LEFT + 12, y + 8);
    y += 28;

    // Bullet points
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.body);
    const hints = [
      "Berechnungen basieren auf vereinfachten Annahmen.",
      "Steuerwerte sind Näherungen.",
      "Renditen sind nicht garantiert.",
      "Gesetzliche Rahmen können sich ändern.",
    ];
    hints.forEach(h => {
      doc.text("• " + h, M_LEFT + 2, y);
      y += 4.5;
    });

    // Footer
    y = PAGE_H - 35;
    doc.setDrawColor(...C.rule);
    doc.setLineWidth(0.2);
    doc.line(M_LEFT, y, PAGE_W - M_RIGHT, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.text("Erstellt mit WealthWise", M_LEFT, y);
    y += 4;
    doc.text("Daten: Schweizer Vorsorgedaten 2026 (AHV, BFS, BSV)", M_LEFT, y);
    y += 4;
    doc.text(`Generiert am: ${fmtDate()}`, M_LEFT, y);
  }

  /* ---------- Helpers for labels ---------- */
  function civilLabel(s) {
    return ({
      single: "Ledig",
      married: "Verheiratet",
      registered: "Eingetragene Partnerschaft",
      divorced: "Geschieden",
      widowed: "Verwitwet",
    })[s] || "—";
  }
  function propertyTypeLabel(t) {
    return ({
      eigentumswohnung: "Eigentumswohnung",
      einfamilienhaus: "Einfamilienhaus",
      mehrfamilienhaus: "Mehrfamilienhaus",
      ferienhaus: "Ferienhaus",
    })[t] || "Immobilie";
  }

  /* ---------- Filename ---------- */
  function buildFilename(st) {
    const lastName = (() => {
      const n = st.person1.name || "";
      const parts = n.trim().split(/\s+/);
      return parts.length > 1 ? parts[parts.length - 1] : (parts[0] || "Analyse");
    })();
    const safe = lastName.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/Ä/g, "Ae").replace(/Ö/g, "Oe").replace(/Ü/g, "Ue").replace(/ß/g, "ss").replace(/[^a-zA-Z0-9]/g, "");
    return `WealthWise_Analyse_${safe || "Analyse"}_${fmtDateISO()}.pdf`;
  }

  /* ---------- Main ---------- */
  async function exportPDF() {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert("PDF-Bibliothek wird noch geladen, bitte einen Moment warten.");
      return false;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

    const st = readState();
    const an = computeAnalysis(st);

    pageTitle(doc, st);
    doc.addPage();
    pageBaseline(doc, st);
    doc.addPage();
    pageVorsorge(doc, st, an);
    doc.addPage();
    pageBudget(doc, st, an);
    doc.addPage();
    pageResult(doc, st, an);
    doc.addPage();
    pageRecommendations(doc, st, an);

    doc.save(buildFilename(st));
    return true;
  }

  // Loading-state wrapper
  let isExporting = false;
  window.wwExportPDF = async function () {
    if (isExporting) return;
    isExporting = true;
    // Find both buttons and add visual loading state
    const buttons = document.querySelectorAll('[data-pdf-export], .action-btn, .btn-primary');
    const pdfButtons = [...buttons].filter(b => /PDF/i.test(b.textContent || ""));
    const originals = pdfButtons.map(b => b.innerHTML);
    pdfButtons.forEach(b => {
      b.disabled = true;
      b.style.opacity = "0.7";
      b.dataset.pdfState = "loading";
    });
    try {
      const ok = await exportPDF();
      if (ok) {
        pdfButtons.forEach((b, i) => {
          b.dataset.pdfState = "done";
        });
      }
    } catch (e) {
      console.error("PDF-Export-Fehler:", e);
      alert("PDF konnte nicht erstellt werden: " + (e.message || e));
    } finally {
      setTimeout(() => {
        pdfButtons.forEach((b, i) => {
          b.disabled = false;
          b.style.opacity = "";
          b.dataset.pdfState = "";
        });
        isExporting = false;
      }, 1500);
    }
  };
})();
