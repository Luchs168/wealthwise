const { useState, useEffect, useMemo, useRef } = React;

/* ---------- Icons ---------- */
const Icon = {
  Check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="5 12 10 17 19 7"/></svg>,
  Arrow: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg>,
  ArrowLeft: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><line x1="19" y1="12" x2="5" y2="12"/><polyline points="11 6 5 12 11 18"/></svg>,
  Info: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16"/><line x1="12" y1="8" x2="12" y2="8.01"/></svg>,
  Chevron: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="6 9 12 15 18 9"/></svg>,
  Shield: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3l8 3v6c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V6z"/></svg>,
  Lock: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>,
  Upload: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 16a4 4 0 0 0-1-7.874A6 6 0 0 0 4 9.5c0 .17.01.34.03.5A4 4 0 0 0 5 17"/><polyline points="8 12 12 8 16 12"/><line x1="12" y1="8" x2="12" y2="19"/></svg>,
  Briefcase: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>,
  Beach: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 19h18"/><path d="M12 19V9"/><path d="M12 9a7 7 0 0 0-7 6h7"/><path d="M12 9a7 7 0 0 1 7 6"/><circle cx="17" cy="6" r="2"/></svg>,
  Pillar: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 9l9-5 9 5"/><path d="M5 9v9M9 9v9M15 9v9M19 9v9"/><line x1="3" y1="20" x2="21" y2="20"/></svg>,
  Doc: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><polyline points="14 3 14 8 19 8"/></svg>,
  Pencil: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4z"/></svg>,
  Question: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 1-1 1.7"/><line x1="12" y1="17" x2="12" y2="17.01"/></svg>,
  Plus: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Alert: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2L2 20h20z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.01"/></svg>,
  Piggy: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 11a6 6 0 0 0-6-6h-1a6 6 0 0 0-6 6v3a3 3 0 0 0 3 3h1l1 3h2l1-3h3l1 3h2l1-3a3 3 0 0 0 1-2.5"/><circle cx="9" cy="11" r="1"/></svg>,
  Trend: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="3 17 9 11 13 15 21 7"/><polyline points="15 7 21 7 21 13"/></svg>,
};

/* ---------- Helpers ---------- */
const fmtCHF = (n) => {
  if (!n && n !== 0) return "";
  return new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 }).format(Math.round(n));
};
const parseNum = (s) => {
  const n = Number(String(s).replace(/[^\d.]/g, ""));
  return isNaN(n) ? 0 : n;
};

/* AHV-Berechnung — korrekte Werte 2026 */
const AHV_MAX = 2450;   // CHF/Monat Maximalrente
const AHV_MIN = 1225;   // CHF/Monat Minimalrente
const AHV_INC_THRESHOLD = 88200; // ab hier Maximalrente
const AHV_PLAFOND = 3675; // 150% Plafond Ehepaar

function calcAHV(income, beitragsjahre = 44) {
  const inc = Number(income) || 0;
  let rente;
  if (inc >= AHV_INC_THRESHOLD) {
    rente = AHV_MAX;
  } else {
    const pct = inc / AHV_INC_THRESHOLD;
    rente = AHV_MIN + pct * (AHV_MAX - AHV_MIN);
  }
  // Anteilige Kürzung bei fehlenden Jahren
  const factor = Math.min(Math.max(beitragsjahre / 44, 0), 1);
  rente = rente * factor;
  // Hard cap
  return Math.min(Math.round(rente), AHV_MAX);
}

/* Nimmt den echten Namen aus dem Store, mit Fallback */
function resolveName(p, fallback = "Person 1") {
  if (!p) return fallback;
  if (p.name && p.name.trim() && p.name !== "Person 1" && p.name !== "Person 2") return p.name;
  return p.name || fallback;
}

/* ---------- Header / Progress ---------- */
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

function ProgressBar({ current = 2 }) {
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

/* ---------- Shared ---------- */
function PersonTabs({ persons, active, setActive }) {
  return (
    <div className="tabs" role="tablist">
      {persons.map((p, i) => (
        <button
          key={p.id}
          className={`tab ${active === i ? "active" : ""}`}
          onClick={() => setActive(i)}
          role="tab"
          aria-selected={active === i}
        >
          <span className="tab-dot">{i + 1}</span>
          <span>{p.name}</span>
        </button>
      ))}
    </div>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <div className="switch" onClick={() => onChange(!on)}>
      <span className="switch-label">{label}</span>
      <div className={`switch-track ${on ? "on" : ""}`} role="switch" aria-checked={on}>
        <div className="switch-thumb" />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-500)" }}>
        {on ? "Ja" : "Nein"}
      </span>
    </div>
  );
}

function CHFField({ id, label, hint, value, onChange, extraLabel, placeholder }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="amount-wrap" style={{ maxWidth: "none" }}>
        <span className="amount-prefix">CHF</span>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          className="amount-input"
          value={fmtCHF(value)}
          placeholder={placeholder}
          onChange={e => onChange(parseNum(e.target.value))}
        />
      </div>
      {(hint || extraLabel) && (
        <div className="live-hint">{extraLabel || hint}</div>
      )}
    </div>
  );
}

/* Drei-Karten-Modus-Auswahl (wiederverwendbar) */
function ModeCards({ mode, setMode, cards }) {
  return (
    <div className="option-grid-3">
      {cards.map(c => (
        <button
          key={c.key}
          className={`option-card ${mode === c.key ? "active" : ""}`}
          onClick={() => setMode(c.key)}
        >
          <div className="option-icon">{c.icon}</div>
          <div>
            <div className="option-title">{c.title}</div>
            <div className="option-sub">{c.sub}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

/* Schätzungs-Badge */
function EstBadge() {
  return <span className="est-badge">SCHÄTZUNG</span>;
}
function DocBadge() {
  return <span className="doc-badge">AUS DOKUMENT</span>;
}

/* ---------- Block A: Income ---------- */
function IncomeBlock({ persons, activeIdx, updatePerson, setActiveIdx, isPaar }) {
  const safeIdx = Math.min(activeIdx, persons.length - 1);
  const p = persons[safeIdx];
  if (!p) return null;
  const mode = p.incomeMode || "manual";
  const setMode = (m) => updatePerson({ ...p, incomeMode: m });

  // Default Beschäftigungsgrad
  const grade = p.employmentGrade || 100;

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">A</span>Einkommen
        </h2>
        <span className="block-hint">Aktuelle Erwerbssituation</span>
      </div>

      {isPaar && persons.length > 1 && (
        <div className="sub-tabs">
          <PersonTabs persons={persons} active={safeIdx} setActive={setActiveIdx} />
        </div>
      )}

      <ModeCards
        mode={mode}
        setMode={setMode}
        cards={[
          { key: "upload", title: "Lohnausweis hochladen", sub: "PDF oder Foto. Genaueste Methode.", icon: <Icon.Upload width={20} height={20} /> },
          { key: "manual", title: "Manuell eingeben", sub: "Werte selbst eintragen.", icon: <Icon.Pencil width={20} height={20} /> },
          { key: "unknown", title: "Weiss ich nicht", sub: "Schätzung basierend auf Durchschnitt.", icon: <Icon.Question width={20} height={20} /> },
        ]}
      />

      {mode === "upload" && (
        <div className="person-card" style={{ marginTop: 18 }}>
          <div className="dropzone">
            <div className="cloud"><Icon.Upload width={26} height={26} /></div>
            <div className="dropzone-title">PDF oder Foto hierher ziehen</div>
            <div className="dropzone-sub">Akzeptiert: PDF, JPG, PNG – bis 10 MB</div>
            <button className="btn btn-secondary" onClick={() => {
              // Demo: simuliere Upload mit Werten + Badge
              setTimeout(() => updatePerson({ ...p, incomeMode: "manual", income: 95000, employmentGrade: 100, hasPK: true, incomeFromDoc: true }), 800);
            }}>Datei auswählen</button>
            <div className="privacy-note">
              <Icon.Lock width={14} height={14} />
              <span>Dein Dokument wird <b>nicht gespeichert</b>. Wir lesen nur die Zahlen aus.</span>
            </div>
          </div>
        </div>
      )}

      {mode === "manual" && (
        <>
          <div className="option-grid-2" style={{ marginTop: 18, marginBottom: 18 }}>
            <button
              className={`option-card ${p.status === "erwerb" ? "active" : ""}`}
              onClick={() => updatePerson({ ...p, status: "erwerb" })}
            >
              <div className="option-icon"><Icon.Briefcase width={22} height={22} /></div>
              <div>
                <div className="option-title">Erwerbstätig</div>
                <div className="option-sub">Du arbeitest aktuell Teilzeit oder Vollzeit.</div>
              </div>
            </button>
            <button
              className={`option-card ${p.status === "rente" ? "active" : ""}`}
              onClick={() => updatePerson({ ...p, status: "rente" })}
            >
              <div className="option-icon"><Icon.Beach width={22} height={22} /></div>
              <div>
                <div className="option-title">Bereits pensioniert</div>
                <div className="option-sub">Du beziehst bereits AHV oder eine PK-Rente.</div>
              </div>
            </button>
          </div>

          {p.status === "erwerb" && (
            <div className="person-card">
              <div className="form-grid">
                <div className="field">
                  <label htmlFor={`grade-${p.id}`}>Beschäftigungsgrad</label>
                  <div className="select-wrap">
                    <select
                      id={`grade-${p.id}`}
                      className="select"
                      value={grade}
                      onChange={e => updatePerson({ ...p, employmentGrade: Number(e.target.value) })}
                    >
                      {[10,20,30,40,50,60,70,80,90,100].map(v => (
                        <option key={v} value={v}>{v} %</option>
                      ))}
                    </select>
                    <Icon.Chevron className="select-chev" width={14} height={14} />
                  </div>
                </div>

                <div className="field" style={{ position: "relative" }}>
                  <label htmlFor={`income-${p.id}`}>
                    Brutto-Jahreseinkommen
                    {p.incomeFromDoc && <DocBadge />}
                  </label>
                  <div className="amount-wrap" style={{ maxWidth: "none" }}>
                    <span className="amount-prefix">CHF</span>
                    <input
                      id={`income-${p.id}`}
                      type="text"
                      inputMode="numeric"
                      className="amount-input"
                      value={fmtCHF(p.income)}
                      placeholder="z.B. 95'000"
                      onChange={e => updatePerson({ ...p, income: parseNum(e.target.value), incomeFromDoc: false })}
                    />
                  </div>
                  <div className="live-hint">
                    = CHF {fmtCHF((p.income || 0) / 12)} / Monat
                    {grade < 100 && <> (bei {grade}% Pensum)</>}
                  </div>
                </div>

                <div className="field span-2">
                  <label>Pensionskasse</label>
                  <Switch
                    on={!!p.hasPK}
                    onChange={v => updatePerson({ ...p, hasPK: v })}
                    label="Hast du eine Pensionskasse?"
                  />
                  <div className="live-hint">Die meisten Angestellten sind über den Arbeitgeber versichert.</div>
                </div>
              </div>
            </div>
          )}

          {p.status === "rente" && (
            <div className="person-card">
              <div className="form-grid">
                <CHFField
                  id={`rente-${p.id}`}
                  label="Aktuelle Monatsrente (AHV + PK)"
                  value={p.currentRente || 0}
                  onChange={v => updatePerson({ ...p, currentRente: v })}
                  extraLabel="Gesamt inkl. allfällige Nebeneinkünfte"
                />
              </div>
            </div>
          )}
        </>
      )}

      {mode === "unknown" && (
        <div className="person-card" style={{ marginTop: 18 }}>
          <div className="info-box">
            <div className="info-icon"><Icon.Info width={16} height={16} /></div>
            <div>Wir schätzen dein Einkommen anhand des Schweizer Medianlohns (BFS).</div>
          </div>
          <div className="estimate-strip">
            <span className="lbl">Geschätztes Brutto-Jahreseinkommen <EstBadge /></span>
            <span className="val">CHF {fmtCHF(p.income || 85000)}</span>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Block B: AHV ---------- */
function AHVBlock({ persons, isPaar, ahvState, setAhvState }) {
  const [ikLinkOpen, setIkLinkOpen] = useState(false);
  const mode = ahvState.mode;
  const setMode = (m) => setAhvState({ ...ahvState, mode: m });

  const p1 = persons[0];
  const p2 = isPaar ? persons[1] : null;

  // Beitragsjahre & Durchschnitts-Einkommen
  const j1 = ahvState.j1 != null ? ahvState.j1 : 44;
  const e1 = ahvState.e1 != null ? ahvState.e1 : (p1 ? p1.income : 0);
  const j2 = ahvState.j2 != null ? ahvState.j2 : 44;
  const e2 = ahvState.e2 != null ? ahvState.e2 : (p2 ? p2.income : 0);

  const r1 = calcAHV(e1, j1);
  const r2 = p2 ? calcAHV(e2, j2) : 0;
  const plafonded = isPaar && p2 ? Math.min(r1 + r2, AHV_PLAFOND) : r1;

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">B</span>AHV – 1. Säule
        </h2>
        <span className="block-hint">Staatliche Vorsorge</span>
      </div>

      <ModeCards
        mode={mode}
        setMode={setMode}
        cards={[
          { key: "upload", title: "IK-Auszug hochladen", sub: "Individuelles Konto der AHV. Genaueste Methode.", icon: <Icon.Upload width={20} height={20} /> },
          { key: "manual", title: "Manuell eingeben", sub: "Beitragsjahre und Einkommen eintragen.", icon: <Icon.Pencil width={20} height={20} /> },
          { key: "unknown", title: "Weiss ich nicht", sub: "Schätzung basierend auf aktuellem Einkommen.", icon: <Icon.Question width={20} height={20} /> },
        ]}
      />

      {mode === "upload" && (
        <div className="person-card" style={{ marginTop: 18 }}>
          <div className="dropzone">
            <div className="cloud"><Icon.Upload width={26} height={26} /></div>
            <div className="dropzone-title">IK-Auszug hierher ziehen</div>
            <div className="dropzone-sub">PDF aus deiner AHV-Ausgleichskasse</div>
            <button className="btn btn-secondary" onClick={() => {
              setTimeout(() => setAhvState({ ...ahvState, mode: "manual", j1: 43, e1: 85000, fromDoc: true }), 800);
            }}>Datei auswählen</button>
            <div className="privacy-note">
              <Icon.Lock width={14} height={14} />
              <span>Wird nicht gespeichert.</span>
            </div>
          </div>
        </div>
      )}

      {mode === "manual" && (
        <div className="person-card" style={{ marginTop: 18 }}>
          <div className="form-grid">
            <div className="field">
              <label>
                Beitragsjahre {resolveName(p1)}
                {ahvState.fromDoc && <DocBadge />}
              </label>
              <input
                type="number"
                className="input"
                value={j1}
                min={0}
                max={50}
                onChange={e => setAhvState({ ...ahvState, j1: Number(e.target.value), fromDoc: false })}
              />
              <div className="live-hint">Standard: 44 Jahre. Fehlende Jahre reduzieren die Rente anteilig.</div>
            </div>
            <div className="field">
              <label>Durchschnittseinkommen {resolveName(p1)}</label>
              <div className="amount-wrap" style={{ maxWidth: "none" }}>
                <span className="amount-prefix">CHF</span>
                <input
                  type="text"
                  inputMode="numeric"
                  className="amount-input"
                  value={fmtCHF(e1)}
                  onChange={ev => setAhvState({ ...ahvState, e1: parseNum(ev.target.value), fromDoc: false })}
                />
              </div>
              <div className="live-hint">Falls unsicher: Aktuelles Einkommen ist ein guter Anhaltspunkt.</div>
            </div>
            {isPaar && p2 && (
              <>
                <div className="field">
                  <label>Beitragsjahre {resolveName(p2, "Person 2")}</label>
                  <input
                    type="number"
                    className="input"
                    value={j2}
                    onChange={e => setAhvState({ ...ahvState, j2: Number(e.target.value) })}
                  />
                </div>
                <div className="field">
                  <label>Durchschnittseinkommen {resolveName(p2, "Person 2")}</label>
                  <div className="amount-wrap" style={{ maxWidth: "none" }}>
                    <span className="amount-prefix">CHF</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      className="amount-input"
                      value={fmtCHF(e2)}
                      onChange={ev => setAhvState({ ...ahvState, e2: parseNum(ev.target.value) })}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Ergebnis-Karte (immer sichtbar) */}
      <div className="ahv-card" style={{ marginTop: 18 }}>
        <div className="ahv-head">
          <div className="ahv-badge"><Icon.Pillar width={22} height={22} /></div>
          <div>
            <h3 className="ahv-title">AHV-Rente (geschätzt)</h3>
            <div className="ahv-sub">Annahme: voller Beitragsverlauf, 44 Jahre</div>
          </div>
          <span className="ahv-pill">{mode === "unknown" ? "SCHÄTZUNG" : (ahvState.fromDoc ? "AUS DOKUMENT" : "BERECHNET")}</span>
        </div>

        <div className="ahv-rows">
          <div className="ahv-row">
            <div className="lbl">{resolveName(p1)}</div>
            <div className="amt">CHF {fmtCHF(r1)}<span className="unit">/ Monat</span></div>
          </div>
          {p2 && (
            <div className="ahv-row">
              <div className="lbl">{resolveName(p2, "Person 2")}</div>
              <div className="amt">CHF {fmtCHF(r2)}<span className="unit">/ Monat</span></div>
            </div>
          )}
          {isPaar && p2 && (
            <div className="ahv-row highlight" style={{ gridColumn: "1 / -1" }}>
              <div className="lbl">Plafoniert (Ehepaar · max. 150 %)</div>
              <div className="amt">CHF {fmtCHF(plafonded)}<span className="unit">/ Monat gemeinsam</span></div>
            </div>
          )}
        </div>

        <div className="ahv-notice">
          <Icon.Info width={18} height={18} />
          <div>
            {isPaar && p2
              ? <>Die AHV begrenzt die Summe beider Renten auf 150 % der Maximalrente (CHF 3'675/Monat).</>
              : <>Maximale Einzelrente 2026: CHF 2'450/Monat. Niedrigere Einkommen oder Beitragslücken reduzieren die Rente.</>}
          </div>
        </div>
      </div>

      {/* IK-Link */}
      <button
        type="button"
        className="link-toggle"
        onClick={() => setIkLinkOpen(o => !o)}
        style={{ marginTop: 14 }}
      >
        📋 Wo erhalte ich meinen IK-Auszug?
        <Icon.Chevron width={14} height={14} style={{ transform: ikLinkOpen ? "rotate(180deg)" : "none", transition: "transform .15s", marginLeft: 4 }} />
      </button>
      {ikLinkOpen && (
        <div className="link-expand">
          Du kannst deinen individuellen Kontoauszug (IK) kostenlos bei deiner AHV-Ausgleichskasse bestellen.
          Online bestellbar unter <a href="https://www.ahv-iv.ch" target="_blank" rel="noreferrer">www.ahv-iv.ch</a>.
        </div>
      )}
    </section>
  );
}

/* ---------- Block C: Pensionskasse + Freizügigkeit ---------- */
function PKBlock({ persons, pkActiveIdx, setPkActiveIdx, updatePerson, isPaar }) {
  const [fzLinkOpen, setFzLinkOpen] = useState(false);
  const safeIdx = Math.min(pkActiveIdx, persons.length - 1);
  const p = persons[safeIdx];
  if (!p) return null;
  const mode = p.pkMode || "manual";
  const estCap = Math.round((p.income || 85000) * 6.5);

  // Implizite Werte
  const cap = Number(p.pkCapital) || 0;
  const yearly = Number(p.pkYearlyRente) || 0;
  const monthly = yearly / 12;
  const implRate = cap > 0 ? (yearly / cap * 100) : 0;

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">C</span>Pensionskasse – 2. Säule
        </h2>
        <span className="block-hint">Berufliche Vorsorge</span>
      </div>

      {isPaar && persons.length > 1 && (
        <div className="sub-tabs">
          <PersonTabs persons={persons} active={safeIdx} setActive={setPkActiveIdx} />
        </div>
      )}

      <ModeCards
        mode={mode}
        setMode={(m) => updatePerson({ ...p, pkMode: m })}
        cards={[
          { key: "upload", title: "PK-Ausweis hochladen", sub: "PDF oder Foto. Genaueste Methode.", icon: <Icon.Upload width={20} height={20} /> },
          { key: "manual", title: "Manuell eingeben", sub: "Werte selbst eintragen.", icon: <Icon.Pencil width={20} height={20} /> },
          { key: "unknown", title: "Weiss ich nicht", sub: "Schätzung basierend auf Einkommen und Alter.", icon: <Icon.Question width={20} height={20} /> },
        ]}
      />

      <div className="pk-body">
        {mode === "upload" && (
          <div className="person-card">
            <div className="dropzone">
              <div className="cloud"><Icon.Upload width={26} height={26} /></div>
              <div className="dropzone-title">PDF oder Foto hierher ziehen</div>
              <div className="dropzone-sub">Akzeptiert: PDF, JPG, PNG – bis 10 MB</div>
              <button className="btn btn-secondary" onClick={() => {
                setTimeout(() => updatePerson({ ...p, pkMode: "manual", pkCapital: 420000, pkYearlyRente: 22260, pkFromDoc: true }), 800);
              }}>Datei auswählen</button>
              <div className="privacy-note">
                <Icon.Lock width={14} height={14} />
                <span>Dein Dokument wird <b>nicht gespeichert</b>.</span>
              </div>
            </div>
          </div>
        )}

        {mode === "manual" && (
          <div className="person-card">
            <div className="form-grid">
              <CHFField
                id={`pkcap-${p.id}`}
                label={<>Voraussichtliches Alterskapital bei 65 {p.pkFromDoc && <DocBadge />}</>}
                value={p.pkCapital || 0}
                onChange={v => updatePerson({ ...p, pkCapital: v, pkFromDoc: false })}
                extraLabel="Findest du auf dem PK-Ausweis unter 'Altersleistungen' oder 'Prognose bei 65'."
              />
              <CHFField
                id={`pkyr-${p.id}`}
                label={<>Voraussichtliche jährliche Altersrente bei 65 {p.pkFromDoc && <DocBadge />}</>}
                value={p.pkYearlyRente || 0}
                onChange={v => updatePerson({ ...p, pkYearlyRente: v, pkFromDoc: false })}
                extraLabel="Steht auf dem PK-Ausweis. Beinhaltet bereits den korrekten Umwandlungssatz deiner Kasse."
              />
            </div>

            {(cap > 0 && yearly > 0) && (
              <div className="result-card" style={{ marginTop: 18 }}>
                <div className="result-row">
                  <div className="result-lbl">PK-Rente</div>
                  <div className="result-val">CHF {fmtCHF(monthly)} <span className="unit">/ Monat</span></div>
                </div>
                <div className="result-row sub">
                  <div className="result-lbl">Pro Jahr</div>
                  <div>CHF {fmtCHF(yearly)}</div>
                </div>
                <div className="result-row sub">
                  <div className="result-lbl">Impliziter Umwandlungssatz</div>
                  <div>{implRate.toFixed(2)} %</div>
                </div>
                <div className="info-box" style={{ marginTop: 12 }}>
                  <div className="info-icon"><Icon.Info width={16} height={16} /></div>
                  <div>
                    Liegt der Satz unter dem BVG-Minimum von 6.8 %, ist das üblich und berücksichtigt das Überobligatorium,
                    wo Kassen einen tieferen Satz anwenden dürfen.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {mode === "unknown" && (
          <div>
            <div className="info-box">
              <div className="info-icon"><Icon.Alert width={16} height={16} /></div>
              <div>
                <b>Kein Problem!</b> Wir verwenden eine Schätzung basierend auf Einkommen und Alter.
                Fordere deinen PK-Ausweis bei deinem Arbeitgeber an – damit wird die Analyse genauer.
              </div>
            </div>
            <div className="estimate-strip">
              <span className="lbl">Geschätztes Alterskapital bei 65 <EstBadge /></span>
              <span className="val">~ CHF {fmtCHF(estCap)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Freizügigkeitskonto Sub-Section */}
      <div className="sub-section">
        <div className="sub-head">
          <h3 className="sub-title">Freizügigkeitskonto</h3>
        </div>

        <div className="toggle-row">
          <span className="toggle-label">Hast du ein Freizügigkeitskonto?</span>
          <div className="seg" role="radiogroup" aria-label="Freizügigkeit">
            <button
              type="button"
              role="radio"
              aria-checked={!p.hasFZ}
              className={`seg-btn ${!p.hasFZ ? "is-active" : ""}`}
              onClick={() => updatePerson({ ...p, hasFZ: false })}
            >Nein</button>
            <button
              type="button"
              role="radio"
              aria-checked={!!p.hasFZ}
              className={`seg-btn ${p.hasFZ ? "is-active" : ""}`}
              onClick={() => updatePerson({ ...p, hasFZ: true })}
            >Ja</button>
          </div>
        </div>

        {p.hasFZ && (
          <div className="form-grid" style={{ marginTop: 14 }}>
            <CHFField
              id={`fz-${p.id}`}
              label="Aktuelles Guthaben"
              value={p.fzBalance || 0}
              onChange={v => updatePerson({ ...p, fzBalance: v })}
              extraLabel="Gesamtbetrag über alle Freizügigkeitskonten."
            />
          </div>
        )}

        <div className="info-box" style={{ marginTop: 14 }}>
          <div className="info-icon"><Icon.Info width={16} height={16} /></div>
          <div>Freizügigkeitsguthaben stammen aus früheren Arbeitsverhältnissen und können bei der Pensionierung bezogen werden.</div>
        </div>

        <button
          type="button"
          className="link-toggle"
          onClick={() => setFzLinkOpen(o => !o)}
          style={{ marginTop: 10 }}
        >
          🔍 Vergessenes Guthaben suchen
          <Icon.Chevron width={14} height={14} style={{ transform: fzLinkOpen ? "rotate(180deg)" : "none", transition: "transform .15s", marginLeft: 4 }} />
        </button>
        {fzLinkOpen && (
          <div className="link-expand">
            In der Schweiz liegen rund CHF 60 Milliarden auf vergessenen Freizügigkeitskonten.
            <br /><br />
            Prüfe kostenlos unter:<br />
            → <a href="https://www.verbindungsstelle.ch" target="_blank" rel="noreferrer">www.verbindungsstelle.ch</a> (Zentralstelle 2. Säule – kostenlose Suchanfrage)
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- Block D: 3a ---------- */
function DreiABlock({ persons, updatePerson, isPaar, retirementYear }) {
  const max3a = (hasPK) => hasPK ? 7258 : 36288;
  const list = isPaar ? persons : persons.slice(0, 1);

  const calcProjection = (p) => {
    const balance = Number(p.balance3a) || 0;
    const yearly = Number(p.yearly3a) || 0;
    const yearsLeft = Math.max(0, (retirementYear || 2030) - new Date().getFullYear());
    const rate = (p.form3a === "wertschriften") ? 0.04 : 0.0075;
    // Endwert = balance*(1+r)^n + yearly*((1+r)^n - 1)/r
    const factor = Math.pow(1 + rate, yearsLeft);
    const total = balance * factor + (rate > 0 ? yearly * (factor - 1) / rate : yearly * yearsLeft);
    const paid = balance + yearly * yearsLeft;
    return { total, paid, gain: total - paid, rate: rate * 100 };
  };

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">D</span>Säule 3a – Private Vorsorge
        </h2>
        <span className="block-hint">Steuerbegünstigtes Sparen</span>
      </div>

      <div className="slider-grid" style={{ gridTemplateColumns: list.length > 1 ? "1fr 1fr" : "1fr" }}>
        {list.map(p => {
          const proj = calcProjection(p);
          const formDefault = p.form3a || "sparkonto";
          const yearlyDefault = p.yearly3a != null ? p.yearly3a : (p.hasPK ? 7258 : 0);
          return (
            <div className="slider-card" key={p.id}>
              <div className="who">{resolveName(p, `Person ${persons.indexOf(p) + 1}`).toUpperCase()}</div>
              <h4 style={{ marginBottom: 14 }}>Hast du ein 3a-Konto?</h4>
              <Switch
                on={!!p.has3a}
                onChange={v => updatePerson({ ...p, has3a: v })}
                label="3a-Konto vorhanden"
              />
              {p.has3a && (
                <div style={{ marginTop: 18 }}>
                  <CHFField
                    id={`3a-${p.id}`}
                    label="Aktuelles 3a-Guthaben (alle Konten)"
                    value={p.balance3a || 0}
                    onChange={v => updatePerson({ ...p, balance3a: v })}
                    extraLabel="Gesamtbetrag über alle 3a-Konten hinweg."
                  />

                  {/* Anlageform */}
                  <div className="field" style={{ marginTop: 16 }}>
                    <label>Anlageform</label>
                    <div className="option-grid-2 option-grid-2-tight">
                      <button
                        type="button"
                        className={`option-card ${formDefault === "sparkonto" ? "active" : ""}`}
                        onClick={() => updatePerson({ ...p, form3a: "sparkonto" })}
                      >
                        <div className="option-icon"><Icon.Piggy width={20} height={20} /></div>
                        <div>
                          <div className="option-title">Sparkonto</div>
                          <div className="option-sub">Tiefe Rendite, kein Verlustrisiko.</div>
                        </div>
                      </button>
                      <button
                        type="button"
                        className={`option-card ${formDefault === "wertschriften" ? "active" : ""}`}
                        onClick={() => updatePerson({ ...p, form3a: "wertschriften" })}
                      >
                        <div className="option-icon"><Icon.Trend width={20} height={20} /></div>
                        <div>
                          <div className="option-title">Wertschriften</div>
                          <div className="option-sub">Höhere Renditechancen, Schwankungen möglich.</div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Jährliche Einzahlung */}
                  <div style={{ marginTop: 16 }}>
                    <CHFField
                      id={`3a-yr-${p.id}`}
                      label="Jährliche Einzahlung"
                      value={yearlyDefault}
                      onChange={v => updatePerson({ ...p, yearly3a: v })}
                      extraLabel={`3a-Maximum 2026: CHF ${fmtCHF(max3a(p.hasPK))}${p.hasPK ? " (mit PK)" : " (ohne PK)"}.`}
                    />
                  </div>

                  {/* Projektion */}
                  <div className="proj-card" style={{ marginTop: 16 }}>
                    <div className="proj-title">Geschätztes 3a bei Pensionierung ({retirementYear})</div>
                    <div className="proj-value">CHF {fmtCHF(proj.total)}</div>
                    <div className="proj-rows">
                      <div><span>Davon einbezahlt</span><b>CHF {fmtCHF(proj.paid)}</b></div>
                      <div><span>Davon Rendite</span><b>CHF {fmtCHF(proj.gain)}</b></div>
                    </div>
                    <div className="proj-note">
                      <Icon.Info width={14} height={14} />
                      Annahme: {proj.rate.toFixed(2)} % Rendite p.a. · Anlageform: {formDefault === "wertschriften" ? "Wertschriften" : "Sparkonto"}
                    </div>
                  </div>
                </div>
              )}
              {!p.has3a && (
                <div className="live-hint" style={{ marginTop: 12 }}>
                  3a-Maximum 2026: CHF {fmtCHF(max3a(p.hasPK))} / Jahr{!p.hasPK ? " (ohne PK)" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ---------- Block E: Vermögen ---------- */
function VermogenBlock({ cash, setCash, securities, setSecurities, property, setProperty }) {
  const total = (Number(cash) || 0) + (Number(securities) || 0) + (property.has ? (Number(property.value) || 0) : 0);
  const updateProp = (patch) => setProperty({ ...property, ...patch });

  return (
    <section className="block">
      <div className="block-head">
        <h2 className="block-title">
          <span className="block-num">E</span>Weiteres Vermögen
        </h2>
        <span className="block-hint">Gemeinsam für den Haushalt</span>
      </div>

      <div className="person-card">
        <div className="form-grid">
          <div className="field" style={{ maxWidth: 460 }}>
            <label htmlFor="v-cash">Bargeld & Sparkonten</label>
            <div className="amount-wrap" style={{ maxWidth: "none" }}>
              <span className="amount-prefix">CHF</span>
              <input
                id="v-cash" type="text" inputMode="numeric" className="amount-input"
                value={fmtCHF(cash)}
                onChange={e => setCash(parseNum(e.target.value))}
              />
            </div>
            <div className="live-hint">Privatkonto, Sparkonto, Bargeld.</div>
          </div>

          <div className="field" style={{ maxWidth: 460 }}>
            <label htmlFor="v-sec">Wertschriften & Anlagen</label>
            <div className="amount-wrap" style={{ maxWidth: "none" }}>
              <span className="amount-prefix">CHF</span>
              <input
                id="v-sec" type="text" inputMode="numeric" className="amount-input"
                value={fmtCHF(securities)}
                onChange={e => setSecurities(parseNum(e.target.value))}
              />
            </div>
            <div className="live-hint">Aktien, Fonds, ETFs, Obligationen. Ohne 3a/PK.</div>
          </div>
        </div>

        <div className="sub-section">
          <div className="sub-head"><h3 className="sub-title">Immobilien</h3></div>

          <div className="toggle-row">
            <span className="toggle-label">Besitzt du Wohneigentum?</span>
            <div className="seg" role="radiogroup" aria-label="Wohneigentum">
              <button type="button" role="radio" aria-checked={!property.has}
                className={`seg-btn ${!property.has ? "is-active" : ""}`}
                onClick={() => updateProp({ has: false })}>Nein</button>
              <button type="button" role="radio" aria-checked={property.has}
                className={`seg-btn ${property.has ? "is-active" : ""}`}
                onClick={() => updateProp({ has: true })}>Ja</button>
            </div>
          </div>

          {property.has && (
            <div className="form-grid prop-grid">
              <div className="field">
                <label htmlFor="prop-type">Art der Immobilie</label>
                <div className="select-wrap">
                  <select id="prop-type" className="select" value={property.type}
                    onChange={e => updateProp({ type: e.target.value })}>
                    <option value="eigentumswohnung">Eigentumswohnung</option>
                    <option value="einfamilienhaus">Einfamilienhaus</option>
                    <option value="mehrfamilienhaus">Mehrfamilienhaus</option>
                  </select>
                  <Icon.Chevron className="select-chev" width={14} height={14} />
                </div>
              </div>

              <div className="field">
                <label htmlFor="prop-use">Nutzung</label>
                <div className="select-wrap">
                  <select id="prop-use" className="select" value={property.use}
                    onChange={e => updateProp({ use: e.target.value })}>
                    <option value="selbst">Selbst bewohnt</option>
                    <option value="vermietet">Vermietet</option>
                  </select>
                  <Icon.Chevron className="select-chev" width={14} height={14} />
                </div>
              </div>

              <div className="field span-2" style={{ maxWidth: 460 }}>
                <label htmlFor="prop-value">Geschätzter Verkehrswert</label>
                <div className="amount-wrap" style={{ maxWidth: "none" }}>
                  <span className="amount-prefix">CHF</span>
                  <input id="prop-value" type="text" inputMode="numeric" className="amount-input"
                    value={fmtCHF(property.value)}
                    onChange={e => updateProp({ value: parseNum(e.target.value) })}/>
                </div>
                <div className="live-hint">
                  Aktueller Marktwert. Falls unsicher: Kaufpreis + geschätzte Wertsteigerung als Anhaltspunkt.
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="asset-total">
          <span className="asset-total-label">Total Vermögen</span>
          <span className="asset-total-value">CHF {fmtCHF(total)}</span>
        </div>
      </div>
    </section>
  );
}

/* ---------- Block F: Zusammenfassung ---------- */
function SummaryBlock({ persons, isPaar, ahvState, cash, securities, property, retirementYear }) {
  const p1 = persons[0];
  const p2 = isPaar ? persons[1] : null;

  // AHV
  const j1 = ahvState.j1 != null ? ahvState.j1 : 44;
  const e1 = ahvState.e1 != null ? ahvState.e1 : (p1 ? p1.income : 0);
  const j2 = ahvState.j2 != null ? ahvState.j2 : 44;
  const e2 = ahvState.e2 != null ? ahvState.e2 : (p2 ? p2.income : 0);
  const r1 = calcAHV(e1, j1);
  const r2 = p2 ? calcAHV(e2, j2) : 0;
  const ahvSum = isPaar && p2 ? Math.min(r1 + r2, AHV_PLAFOND) : r1;
  const ahvIsEst = ahvState.mode === "unknown";

  // PK monthly
  const pk = (p) => p ? ((Number(p.pkYearlyRente) || 0) / 12) : 0;
  const pk1 = pk(p1);
  const pk2 = pk(p2);
  const pkSum = pk1 + pk2;
  const pk1Est = p1 && p1.pkMode === "unknown";
  const pk2Est = p2 && p2.pkMode === "unknown";

  // 3a Projektion
  const calcProj = (p) => {
    if (!p || !p.has3a) return 0;
    const balance = Number(p.balance3a) || 0;
    const yearly = Number(p.yearly3a) || (p.hasPK ? 7258 : 0);
    const yearsLeft = Math.max(0, retirementYear - new Date().getFullYear());
    const rate = (p.form3a === "wertschriften") ? 0.04 : 0.0075;
    const factor = Math.pow(1 + rate, yearsLeft);
    return balance * factor + (rate > 0 ? yearly * (factor - 1) / rate : yearly * yearsLeft);
  };
  const p3a1 = calcProj(p1);
  const p3a2 = calcProj(p2);

  // Freizügigkeit
  const fz1 = (p1 && p1.hasFZ) ? (Number(p1.fzBalance) || 0) : 0;
  const fz2 = (p2 && p2.hasFZ) ? (Number(p2.fzBalance) || 0) : 0;

  // Total Renten
  const totalRente = ahvSum + pkSum;

  // Total Kapital (ohne Immobilien)
  const totalKapital = (Number(cash) || 0) + (Number(securities) || 0) + p3a1 + p3a2 + fz1 + fz2;

  // Immobilien
  const propValue = property.has ? (Number(property.value) || 0) : 0;

  return (
    <section className="block">
      <div className="summary-card">
        <div className="summary-head">
          <span className="summary-icon">📊</span>
          <h2 className="summary-title">Zusammenfassung</h2>
        </div>

        <div className="summary-section">
          <div className="summary-section-label">Monatliche Renten</div>
          <div className="summary-row">
            <span>AHV{isPaar && p2 ? " (plafoniert)" : "-Rente"}</span>
            <span className="val">CHF {fmtCHF(ahvSum)} / Mt. {ahvIsEst && <EstBadge />}</span>
          </div>
          <div className="summary-row">
            <span>PK{isPaar && p2 ? ` ${resolveName(p1)}` : "-Rente"}</span>
            <span className="val">CHF {fmtCHF(pk1)} / Mt. {pk1Est && <EstBadge />}</span>
          </div>
          {isPaar && p2 && (
            <div className="summary-row">
              <span>PK {resolveName(p2, "Person 2")}</span>
              <span className="val">CHF {fmtCHF(pk2)} / Mt. {pk2Est && <EstBadge />}</span>
            </div>
          )}
        </div>

        <div className="summary-section">
          <div className="summary-section-label">Kapitalien</div>
          {(fz1 > 0 || fz2 > 0 || (p1 && p1.hasFZ) || (p2 && p2.hasFZ)) && (
            <>
              <div className="summary-row">
                <span>Freizügigkeit{isPaar && p2 ? ` ${resolveName(p1)}` : ""}</span>
                <span className="val">CHF {fmtCHF(fz1)}</span>
              </div>
              {isPaar && p2 && (
                <div className="summary-row">
                  <span>Freizügigkeit {resolveName(p2, "Person 2")}</span>
                  <span className="val">CHF {fmtCHF(fz2)}</span>
                </div>
              )}
            </>
          )}
          <div className="summary-row">
            <span>3a{isPaar && p2 ? ` ${resolveName(p1)}` : " (bei Pension.)"}</span>
            <span className="val">CHF {fmtCHF(p3a1)} <EstBadge /></span>
          </div>
          {isPaar && p2 && (
            <div className="summary-row">
              <span>3a {resolveName(p2, "Person 2")}</span>
              <span className="val">CHF {fmtCHF(p3a2)} <EstBadge /></span>
            </div>
          )}
          <div className="summary-row">
            <span>Bargeld & Sparen</span>
            <span className="val">CHF {fmtCHF(cash)}</span>
          </div>
          <div className="summary-row">
            <span>Wertschriften</span>
            <span className="val">CHF {fmtCHF(securities)}</span>
          </div>
        </div>

        {property.has && propValue > 0 && (
          <div className="summary-section">
            <div className="summary-section-label">Immobilien</div>
            <div className="summary-row">
              <span>Netto-Wert</span>
              <span className="val">CHF {fmtCHF(propValue)}</span>
            </div>
          </div>
        )}

        <div className="summary-divider"></div>

        <div className="summary-row total">
          <span>Total Renten</span>
          <span className="val">CHF {fmtCHF(totalRente)} / Mt.</span>
        </div>
        <div className="summary-row total">
          <span>Total Kapital</span>
          <span className="val">CHF {fmtCHF(totalKapital)}</span>
        </div>
        {property.has && propValue > 0 && (
          <div className="summary-row total">
            <span>Total Immobilien</span>
            <span className="val">CHF {fmtCHF(propValue)}</span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- App ---------- */
function App() {
  const initPersons = () => {
    const sel = window.wwStore && window.wwStore.getPersons ? window.wwStore.getPersons() : null;
    if (sel) return { isPaar: sel.isPaar, list: sel.list };
    return { isPaar: true, list: [
      { id: 1, name: "Person 1", status: "erwerb", income: 100000, employmentGrade: 100, hasPK: true, pkMode: "manual", pkCapital: 400000, pkYearlyRente: 21200, has3a: true, balance3a: 50000, form3a: "sparkonto", yearly3a: 7258, incomeMode: "manual" },
    ]};
  };
  const _init = initPersons();
  const [persons, setPersons] = useState(_init.list);
  const [isPaar, setIsPaar] = useState(_init.isPaar);

  useEffect(() => {
    const onChange = () => {
      const sel = window.wwStore && window.wwStore.getPersons && window.wwStore.getPersons();
      if (!sel) return;
      setIsPaar(sel.isPaar);
      setPersons(prev => {
        // Merge: behalte Schritt-2-Felder, aktualisiere Name/Geburtsdatum aus Schritt 1
        return sel.list.map((sp, i) => ({
          ...(prev[i] || {}),
          ...sp,
          // Defaults für Schritt 2
          incomeMode: (prev[i] && prev[i].incomeMode) || "manual",
          employmentGrade: (prev[i] && prev[i].employmentGrade) || 100,
          status: (prev[i] && prev[i].status) || sp.status || "erwerb",
        }));
      });
    };
    window.addEventListener("ww:store-change", onChange);
    return () => window.removeEventListener("ww:store-change", onChange);
  }, []);

  const _saved2 = (window.wwStore && window.wwStore.get && window.wwStore.get()) || {};
  const [incomeActive, setIncomeActive] = useState(0);
  const [pkActive, setPkActive] = useState(0);
  const [cash, setCash] = useState(_saved2.cash ?? (_saved2.freeAssets != null ? _saved2.freeAssets : 80000));
  const [securities, setSecurities] = useState(_saved2.securities ?? 100000);
  const [property, setProperty] = useState(_saved2.property ?? {
    has: !!_saved2.hasProperty, type: "eigentumswohnung", use: "selbst",
    value: _saved2.propertyValue ?? 0,
  });
  const [ahvState, setAhvState] = useState(_saved2.ahvState ?? { mode: "unknown" });
  const [tweaksOpen, setTweaksOpen] = useState(false);

  const retirementYear = _saved2.retirementYear || (new Date().getFullYear() + 5);

  useEffect(() => { if (!isPaar) { setIncomeActive(0); setPkActive(0); } }, [isPaar]);

  useEffect(() => {
    const handler = (e) => {
      if (!e.data) return;
      if (e.data.type === "__activate_edit_mode") setTweaksOpen(true);
      if (e.data.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  const _firstSync = useRef(true);
  useEffect(() => {
    if (_firstSync.current) { _firstSync.current = false; return; }
    if (!window.wwStore) return;
    const cur = window.wwStore.get() || {};
    const buildP = (p, base) => p ? {
      ...(base || {}),
      name: (base && base.name) || p.name,
      grossIncome: Number(p.income) || 0,
      employmentGrade: Number(p.employmentGrade) || 100,
      hasPensionFund: !!p.hasPK,
      pkCapitalAt65: Number(p.pkCapital) || 0,
      pkYearlyRente: Number(p.pkYearlyRente) || 0,
      has3a: !!p.has3a,
      pillar3aBalance: Number(p.balance3a) || 0,
      pillar3aForm: p.form3a || "sparkonto",
      pillar3aYearly: Number(p.yearly3a) || 0,
      hasFZ: !!p.hasFZ,
      fzBalance: Number(p.fzBalance) || 0,
    } : null;
    const p1Full = buildP(persons[0], cur.person1);
    const p2Full = isPaar && persons[1] ? buildP(persons[1], cur.person2 || {}) : null;
    const totalAssets = (Number(cash) || 0) + (Number(securities) || 0) + (property.has ? (Number(property.value) || 0) : 0);
    window.wwStore.set({
      person1: p1Full, person2: p2Full,
      cash: Number(cash) || 0, securities: Number(securities) || 0,
      property: property,
      hasProperty: !!property.has,
      propertyValue: property.has ? (Number(property.value) || 0) : 0,
      freeAssets: (Number(cash) || 0) + (Number(securities) || 0),
      totalAssets, persons,
      ahvState,
    });
  }, [persons, cash, securities, property, isPaar, ahvState]);

  const updatePerson = (p) => {
    setPersons(prev => {
      const next = prev.map(x => x.id === p.id ? p : x);
      if (window.wwStore) window.wwStore.set({ persons: next });
      return next;
    });
  };

  return (
    <div className="app" data-screen-label="02 Vorsorge">
      <TopBar />
      <ProgressBar current={2} />

      <main>
        <div className="page-head">
          <div className="eyebrow">Schritt 2 · Vorsorge</div>
          <h1 className="title">{isPaar ? "Eure Vorsorge auf einen Blick" : "Deine Vorsorge auf einen Blick"}</h1>
          <p className="subtitle">
            {isPaar
              ? "Tragt ein, was ihr wisst. Für alles andere verwenden wir Schätzungen, die ihr später anpassen könnt."
              : "Trag ein, was du weisst. Für alles andere verwenden wir Schätzungen, die du später anpassen kannst."}
          </p>
        </div>

        <IncomeBlock
          persons={persons}
          activeIdx={incomeActive}
          setActiveIdx={setIncomeActive}
          updatePerson={updatePerson}
          isPaar={isPaar}
        />

        <AHVBlock persons={persons} isPaar={isPaar} ahvState={ahvState} setAhvState={setAhvState} />

        <PKBlock
          persons={persons}
          pkActiveIdx={pkActive}
          setPkActiveIdx={setPkActive}
          updatePerson={updatePerson}
          isPaar={isPaar}
        />

        <DreiABlock persons={persons} updatePerson={updatePerson} isPaar={isPaar} retirementYear={retirementYear} />

        <VermogenBlock
          cash={cash} setCash={setCash}
          securities={securities} setSecurities={setSecurities}
          property={property} setProperty={setProperty}
        />

        <SummaryBlock
          persons={persons} isPaar={isPaar}
          ahvState={ahvState}
          cash={cash} securities={securities} property={property}
          retirementYear={retirementYear}
        />

        <div className="disclaimer">
          ⚠️ WealthWise ersetzt keine professionelle Finanzberatung. Alle Berechnungen basieren auf vereinfachten Annahmen.
        </div>
      </main>

      <div className="footer">
        <div className="footer-meta">Schritt 2 von 4 · Vorsorge</div>
        <div style={{ display: "flex", gap: 10 }}>
          <a href="WealthWise - Screen 1 Situation.html" className="btn btn-ghost" style={{textDecoration:"none"}}>
            <Icon.ArrowLeft width={16} height={16} /> Zurück
          </a>
          <button className="btn btn-primary" onClick={() => {
            try {
              window.ww && window.ww.track && window.ww.track("wizard_step", { step: 2, screen: "screen_2_vorsorge" });
              window.ww && window.ww.markAdvanced && window.ww.markAdvanced();
            } catch (e) {}
            window.location.href = "WealthWise - Screen 3 Ausgaben.html";
          }}>
            Weiter zu Ausgaben <Icon.Arrow width={16} height={16} />
          </button>
        </div>
      </div>

      {tweaksOpen && (
        <div className="tweaks open">
          <h5>
            <span>Tweaks</span>
            <button onClick={() => setTweaksOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-400)", fontSize: 16 }}>×</button>
          </h5>
          <div className="row">
            <label>Einkommen-Modus ({resolveName(persons[0])})</label>
            <select value={persons[0].incomeMode || "manual"}
              onChange={e => updatePerson({ ...persons[0], incomeMode: e.target.value })}>
              <option value="upload">Upload</option>
              <option value="manual">Manuell</option>
              <option value="unknown">Schätzung</option>
            </select>
          </div>
          <div className="row">
            <label>AHV-Modus</label>
            <select value={ahvState.mode}
              onChange={e => setAhvState({ ...ahvState, mode: e.target.value })}>
              <option value="upload">Upload</option>
              <option value="manual">Manuell</option>
              <option value="unknown">Schätzung</option>
            </select>
          </div>
          <div className="row">
            <label>PK-Modus ({resolveName(persons[0])})</label>
            <select value={persons[0].pkMode || "manual"}
              onChange={e => updatePerson({ ...persons[0], pkMode: e.target.value })}>
              <option value="upload">Upload</option>
              <option value="manual">Manuell</option>
              <option value="unknown">Schätzung</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function Root() {
  const getCtx = () => {
    const s = (window.wwStore && window.wwStore.get && window.wwStore.get()) || {};
    return {
      currentStep: "vorsorge",
      person1: s.person1 || null,
      person2: s.person2 || null,
      civilStatus: s.civilStatus,
      freeAssets: s.freeAssets,
      monthlyExpenses: s.monthlyExpenses,
      hasProperty: s.hasProperty,
      propertyValue: s.propertyValue,
      analysisResult: s.analysisResult,
    };
  };
  return (
    <>
      <App />
      {window.WWChatPanel ? <window.WWChatPanel currentStep="vorsorge" getContext={getCtx} /> : null}
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
