const { useState, useEffect, useMemo, useRef } = React;

/* ---------- Icons ---------- */
const Icon = {
  Check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <polyline points="5 12 10 17 19 7" />
    </svg>
  ),
  Arrow: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  ),
  Lock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  ),
  Plus: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}>
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  // Goal glyphs – simple geometric, no overly-illustrative SVGs
  Target: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
      <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" />
    </svg>
  ),
  Receipt: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" {...p}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" /><line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="15" y2="13" />
    </svg>
  ),
  Gap: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}>
      <path d="M3 18h6" /><path d="M15 18h6" /><path d="M9 12h6" /><path d="M12 18V6" />
    </svg>
  ),
  Early: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}>
      <circle cx="12" cy="13" r="7" /><path d="M12 9v4l2.5 2" /><path d="M9 3h6" />
    </svg>
  ),
  Scale: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 4v16" /><path d="M5 8h14" /><path d="M7 8l-3 6a3 3 0 0 0 6 0z" /><path d="M17 8l-3 6a3 3 0 0 0 6 0z" />
    </svg>
  ),
  Three: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="4" y="5" width="16" height="14" rx="2" /><path d="M9 10h6" /><path d="M9 14h6" />
    </svg>
  ),
  Family: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" /><path d="M3 20c0-3 2.5-5 5-5s5 2 5 5" /><path d="M11 20c0-3 2.5-5 5-5s5 2 5 5" />
    </svg>
  ),
  PK: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 10l8-5 8 5" /><path d="M5 10v9h14v-9" /><path d="M10 19v-5h4v5" />
    </svg>
  ),
};

/* ---------- Goals data ---------- */
const GOALS = [
  { id: "rente",      label: "Reicht meine Rente?",      icon: "Target",  active: true },
  { id: "steuern",    label: "Steuern sparen",           icon: "Receipt", disabled: true, note: "Bald verfügbar" },
  { id: "luecke",     label: "Vorsorgelücke schliessen", icon: "Gap",     disabled: true, note: "Bald verfügbar" },
  { id: "fruehpens",  label: "Frühpensionierung prüfen", icon: "Early",   disabled: true, note: "Bald verfügbar" },
  { id: "rentevskap", label: "Rente vs. Kapital",        icon: "Scale",   disabled: true, note: "Bald verfügbar" },
  { id: "drei_a",     label: "3a optimieren",            icon: "Three",   disabled: true, note: "Bald verfügbar" },
  { id: "familie",    label: "Familie absichern",        icon: "Family",  disabled: true, note: "Bald verfügbar" },
  { id: "pk_einkauf", label: "PK-Einkauf prüfen",        icon: "PK",      disabled: true, note: "Bald verfügbar" },
];

/* ---------- Helpers ---------- */
function calcAge(dobStr) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

/* ---------- Top / Progress ---------- */
function TopBar() {
  return (
    <header className="topbar" data-screen-label="01 Situation">
      <div className="brand">
        <div className="brand-mark">W</div>
        <span>WealthWise</span>
        <span style={{color:"var(--ink-300)", margin:"0 4px"}}>/</span>
        <span style={{color:"var(--ink-500)", fontWeight:500, fontSize:14}}>Vorsorgeplanung</span>
      </div>
      <div className="top-actions">
        <span className="top-save">Automatisch gespeichert</span>
        <a href="#">Hilfe</a>
        <a href="#">Abmelden</a>
      </div>
    </header>
  );
}

function ProgressBar({ current = 1 }) {
  const steps = [
    { n: 1, label: "Situation" },
    { n: 2, label: "Vorsorge" },
    { n: 3, label: "Ausgaben" },
    { n: 4, label: "Analyse"  },
  ];
  return (
    <div className="progress-wrap">
      <div className="steps">
        {steps.map(s => {
          const state = s.n < current ? "done" : s.n === current ? "active" : "";
          return (
            <div key={s.n} className={`step ${state}`}>
              <div className="step-bar"><i/></div>
              <div className="step-meta">
                <span>{String(s.n).padStart(2,"0")}</span>
                <b>{s.label}</b>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Goal card ---------- */
function GoalCard({ goal, selected, onClick }) {
  const Glyph = Icon[goal.icon] || Icon.Target;
  const disabled = !!goal.disabled;
  return (
    <button
      className={`goal ${selected ? "active" : ""} ${disabled ? "disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={selected}
    >
      <div className="goal-top">
        <div className="goal-icon"><Glyph width={18} height={18} /></div>
        <div className="goal-check" aria-hidden="true">
          <Icon.Check />
        </div>
      </div>
      <div>
        <div className="goal-label">{goal.label}</div>
        {disabled && (
          <div className="goal-pill">
            <Icon.Lock width={10} height={10} /> {goal.note || "Bald verfügbar"}
          </div>
        )}
      </div>
    </button>
  );
}

/* ---------- Location field (OpenPLZ API) ---------- */
const KANTONE = [
  ["AG","Aargau"],["AI","Appenzell I."],["AR","Appenzell A."],["BE","Bern"],["BL","Basel-Land"],
  ["BS","Basel-Stadt"],["FR","Freiburg"],["GE","Genf"],["GL","Glarus"],["GR","Graubünden"],
  ["JU","Jura"],["LU","Luzern"],["NE","Neuenburg"],["NW","Nidwalden"],["OW","Obwalden"],
  ["SG","St. Gallen"],["SH","Schaffhausen"],["SO","Solothurn"],["SZ","Schwyz"],["TG","Thurgau"],
  ["TI","Tessin"],["UR","Uri"],["VD","Waadt"],["VS","Wallis"],["ZG","Zug"],["ZH","Zürich"],
];

function LocationField({ value, onChange }) {
  const { t } = (window.useAnsprache ? window.useAnsprache() : { t: (a, b) => b });
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const wrapRef = useRef(null);
  const debounceRef = useRef(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const onDoc = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Debounced API call
  useEffect(() => {
    const q = query.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      const isNum = /^\d+$/.test(q);
      const url = isNum
        ? `https://openplzapi.org/ch/Localities?postalCode=${encodeURIComponent(q)}`
        : `https://openplzapi.org/ch/FullTextSearch?searchTerm=${encodeURIComponent(q)}`;
      try {
        const res = await fetch(url, { headers: { "Accept": "application/json" } });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        if (myReq !== reqIdRef.current) return; // stale
        const list = Array.isArray(json) ? json : (json.value || []);
        // Normalize: keep only locality-like entries (must have postalCode + name)
        const norm = list
          .filter(r => r && r.postalCode && r.name)
          .slice(0, 5)
          .map(r => ({
            postalCode: r.postalCode,
            name: r.name,
            commune: r.commune?.name || r.name,
            cantonShort: r.canton?.shortName || r.canton?.key || "",
            cantonName: r.canton?.name || "",
          }));
        setResults(norm);
        setApiError(false);
        setLoading(false);
      } catch (err) {
        if (myReq !== reqIdRef.current) return;
        setResults([]);
        setApiError(true);
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const select = (r) => {
    onChange({ plz: r.postalCode, ort: r.name, gemeinde: r.commune, kanton: r.cantonShort });
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  // Selected state
  if (value && value.plz) {
    return (
      <div>
        <div className="loc-tags">
          <span className="loc-tag"><span className="loc-tag-key">PLZ</span> {value.plz} {value.ort}</span>
          <span className="loc-tag"><span className="loc-tag-key">Gemeinde</span> {value.gemeinde}</span>
          <span className="loc-tag"><span className="loc-tag-key">Kanton</span> {value.kanton}</span>
          <button type="button" className="loc-tag-clear" onClick={() => onChange(null)}>ändern</button>
        </div>
        <div className="info-callout">
          <span className="info-callout-icon">i</span>
          <span>{t("Dein Wohnort bestimmt die Steuerberechnung.", "Euer Wohnort bestimmt die Steuerberechnung.")} Die Steuersätze unterscheiden sich je nach Kanton und Gemeinde erheblich.</span>
        </div>
      </div>
    );
  }

  // Manual fallback
  if (manualMode) {
    const v = value || {};
    const handle = (k, val) => onChange({ ...v, [k]: val });
    const allFilled = (v.plz || "").length >= 4 && (v.ort || "").trim() && (v.kanton || "").trim();
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 180px", gap: 10 }}>
          <input className="loc-input" type="text" inputMode="numeric" maxLength={4}
            placeholder="PLZ" value={v.plz || ""}
            onChange={e => handle("plz", e.target.value.replace(/\D/g, "").slice(0, 4))} />
          <input className="loc-input" type="text" placeholder="Ort"
            value={v.ort || ""} onChange={e => handle("ort", e.target.value)} />
          <select className="loc-input" value={v.kanton || ""} onChange={e => handle("kanton", e.target.value)}>
            <option value="">Kanton …</option>
            {KANTONE.map(([k, n]) => <option key={k} value={k}>{k} – {n}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
          <button type="button" className="loc-tag-clear" onClick={() => { setManualMode(false); setApiError(false); }}>
            Suche erneut versuchen
          </button>
          {allFilled && (
            <button type="button" className="loc-tag-clear"
              onClick={() => onChange({ plz: v.plz, ort: v.ort, gemeinde: v.ort, kanton: v.kanton })}>
              Übernehmen
            </button>
          )}
        </div>
        <div className="info-callout" style={{ marginTop: 14 }}>
          <span className="info-callout-icon">i</span>
          <span>{t("Dein Wohnort bestimmt die Steuerberechnung.", "Euer Wohnort bestimmt die Steuerberechnung.")} Die Steuersätze unterscheiden sich je nach Kanton und Gemeinde erheblich.</span>
        </div>
      </div>
    );
  }

  const showDropdown = open && query.trim().length >= 2;

  return (
    <div className="loc-wrap" ref={wrapRef}>
      <input
        className="loc-input"
        type="text"
        placeholder="PLZ oder Ort eingeben"
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); setActiveIdx(0); }}
        onFocus={() => setOpen(true)}
        onKeyDown={e => {
          if (!results.length) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
          else if (e.key === "Enter") { e.preventDefault(); select(results[activeIdx]); }
          else if (e.key === "Escape") { setOpen(false); }
        }}
        aria-label="Wohnort"
        autoComplete="off"
      />
      {showDropdown && (
        <div className="loc-suggest" role="listbox">
          {loading && (
            <div className="loc-suggest-item" style={{ color: "var(--ink-500)", cursor: "default" }}>
              <span className="loc-suggest-ort">Suche …</span>
            </div>
          )}
          {!loading && apiError && (
            <div className="loc-suggest-item" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6, cursor: "default" }}>
              <span style={{ color: "var(--danger, #ef4444)", fontSize: 14 }}>
                PLZ-Suche momentan nicht verfügbar.
              </span>
              <button type="button" className="loc-tag-clear"
                onMouseDown={e => { e.preventDefault(); setManualMode(true); setOpen(false); }}>
                Manuell eingeben
              </button>
            </div>
          )}
          {!loading && !apiError && results.length === 0 && (
            <div className="loc-suggest-item" style={{ color: "var(--ink-500)", cursor: "default" }}>
              <span className="loc-suggest-ort">Keine Ergebnisse gefunden</span>
            </div>
          )}
          {!loading && !apiError && results.map((r, i) => (
            <div
              key={r.postalCode + "-" + r.name + "-" + i}
              className={`loc-suggest-item ${i === activeIdx ? "active" : ""}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={e => { e.preventDefault(); select(r); }}
            >
              <span className="loc-suggest-plz">{r.postalCode}</span>
              <span className="loc-suggest-ort">{r.name}</span>
              <span className="loc-suggest-meta">{r.cantonShort}</span>
            </div>
          ))}
        </div>
      )}
      <div className="info-callout" style={{ marginTop: 14 }}>
        <span className="info-callout-icon">i</span>
        <span>{t("Dein Wohnort bestimmt die Steuerberechnung.", "Euer Wohnort bestimmt die Steuerberechnung.")} Die Steuersätze unterscheiden sich je nach Kanton und Gemeinde erheblich.</span>
      </div>
    </div>
  );
}

/* ---------- Children block ---------- */
function ChildrenBlock({ hasChildren, children, onChange }) {
  const { t } = (window.useAnsprache ? window.useAnsprache() : { t: (a, b) => b });
  const addChild = () => onChange({ hasChildren: true, children: [...(children || []), { year: "" }] });
  const updateYear = (idx, year) => {
    const next = [...children];
    next[idx] = { year: year.replace(/[^0-9]/g, "").slice(0, 4) };
    onChange({ hasChildren: true, children: next });
  };
  const removeChild = (idx) => {
    const next = children.filter((_, i) => i !== idx);
    onChange({ hasChildren: next.length > 0, children: next });
  };

  return (
    <div>
      <div className="info-callout" style={{ marginBottom: 16 }}>
        <span className="info-callout-icon">i</span>
        <span>{t("Erziehungsgutschriften erhöhen dein massgebendes Durchschnittseinkommen und damit deine AHV-Rente. Die Gutschriften werden für die Jahre berechnet, in denen du Kinder unter 16 Jahren betreut hast.", "Erziehungsgutschriften erhöhen euer massgebendes Durchschnittseinkommen und damit eure AHV-Rente. Die Gutschriften werden für die Jahre berechnet, in denen ihr Kinder unter 16 Jahren betreut habt.")}</span>
      </div>
      <div className="child-radio-row">
        <button
          type="button"
          className={`child-radio ${!hasChildren ? "active" : ""}`}
          onClick={() => onChange({ hasChildren: false, children: [] })}
          role="radio" aria-checked={!hasChildren}
        >
          <span className="child-radio-dot" /> Nein
        </button>
        <button
          type="button"
          className={`child-radio ${hasChildren ? "active" : ""}`}
          onClick={() => {
            if (!hasChildren) onChange({ hasChildren: true, children: children && children.length ? children : [{ year: "" }] });
          }}
          role="radio" aria-checked={hasChildren}
        >
          <span className="child-radio-dot" /> Ja
        </button>
      </div>
      {hasChildren && (
        <>
          <div className="child-list">
            {(children || []).map((c, i) => (
              <div className="child-row" key={i}>
                <label htmlFor={`child-${i}`}>Kind {i + 1} · Geburtsjahr</label>
                <input
                  id={`child-${i}`}
                  className="child-year"
                  type="text"
                  inputMode="numeric"
                  placeholder="z.B. 2005"
                  value={c.year}
                  onChange={e => updateYear(i, e.target.value)}
                />
                <button type="button" className="child-remove" onClick={() => removeChild(i)}>entfernen</button>
              </div>
            ))}
          </div>
          <button type="button" className="child-add" onClick={addChild}>
            <Icon.Plus width={14} height={14} /> Kind hinzufügen
          </button>
        </>
      )}
    </div>
  );
}

/* ---------- Person form ---------- */
function PersonForm({ person, onChange, hasPartner, onAddPartner, afterSlot }) {
  const { t } = (window.useAnsprache ? window.useAnsprache() : { t: (a, b) => b });
  const age = calcAge(person.dob);
  const showPartnerHint = person.id === 1 && person.civil === "verheiratet" && !hasPartner;
  return (
    <div className="person-card">
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`name-${person.id}`}>Name</label>
          <input
            id={`name-${person.id}`}
            className="input"
            placeholder="z. B. Andrea"
            value={person.name}
            onChange={e => onChange({ ...person, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor={`dob-${person.id}`}>Geburtsdatum</label>
          <input
            id={`dob-${person.id}`}
            type="date"
            className="date-input"
            value={person.dob}
            onChange={e => onChange({ ...person, dob: e.target.value })}
          />
        </div>
      </div>
      <div className="form-grid" style={{ marginTop: 14 }}>
        <div className="field">
          <label>Geschlecht</label>
          <div className="segmented" role="tablist" aria-label="Geschlecht">
            <button
              type="button"
              className={person.sex === "m" ? "active" : ""}
              onClick={() => onChange({ ...person, sex: "m" })}
            >Männlich</button>
            <button
              type="button"
              className={person.sex === "f" ? "active" : ""}
              onClick={() => onChange({ ...person, sex: "f" })}
            >Weiblich</button>
          </div>
        </div>
        <div className="field">
          <label htmlFor={`civil-${person.id}`}>Zivilstand</label>
          <select
            id={`civil-${person.id}`}
            className="select"
            value={person.civil}
            onChange={e => onChange({ ...person, civil: e.target.value })}
          >
            <option value="ledig">Ledig</option>
            <option value="verheiratet">Verheiratet</option>
            <option value="partnerschaft">Eingetragene Partnerschaft</option>
            <option value="geschieden">Geschieden</option>
            <option value="verwitwet">Verwitwet</option>
          </select>
          {showPartnerHint && (
            <div className="partner-hint">
              <div className="ph-ico">💡</div>
              <div className="ph-body">
                <div className="ph-text">{t("Möchtest du die Planung als Paar machen? So können wir die AHV-Plafonierung korrekt berücksichtigen.", "Möchtet ihr die Planung als Paar machen? So können wir die AHV-Plafonierung korrekt berücksichtigen.")}</div>
                <button type="button" className="ph-btn" onClick={onAddPartner}>+ Partner:in hinzufügen</button>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="age-readout" style={{marginTop:18}}>
        {age !== null
          ? <>Alter: <b>{age} Jahre</b></>
          : <>Alter: <span style={{color:"var(--ink-400)"}}>–</span></>}
      </div>
      {afterSlot ? <div style={{ marginTop: 22 }}>{afterSlot}</div> : null}
    </div>
  );
}

/* ---------- Retirement slider ---------- */
function RetireSlider({ person, onChange }) {
  const { t } = (window.useAnsprache ? window.useAnsprache() : { t: (a, b) => b });
  const age = calcAge(person.dob);
  const val = person.retireAge;
  const min = 58, max = 70;
  const pct = ((val - min) / (max - min)) * 100;
  const remain = age !== null ? Math.max(0, val - age) : null;

  // For color sweetspot: AHV Referenzalter CH = 65
  return (
    <div className="slider-card">
      <div className="who">{person.name || (person.id === 1 ? "Person 1" : "Person 2")}</div>
      <h4>{t("Wann möchtest du in Pension gehen?", "Wann möchtet ihr in Pension gehen?")}</h4>
      <div className="retire-value">
        <div className="num">{val}</div>
        <div className="unit">Jahre</div>
      </div>
      <div className="retire-remain">
        {remain !== null
          ? (remain === 0
              ? <>{t(<>Du könntest <b>jetzt</b> in Pension gehen.</>, <>Ihr könntet <b>jetzt</b> in Pension gehen.</>)}</>
              : (() => {
                  const year = new Date().getFullYear() + remain;
                  return <>Noch <b>{remain} {remain === 1 ? "Jahr" : "Jahre"}</b> · Pensionierung im Jahr {year}</>;
                })())
          : <>{t("Gib zuerst dein Geburtsdatum ein, um die verbleibenden Jahre zu sehen.", "Gebt zuerst euer Geburtsdatum ein, um die verbleibenden Jahre zu sehen.")}</>
        }
      </div>
      <div className="range-wrap">
        <input
          type="range"
          className="range"
          min={min} max={max} step={1}
          value={val}
          onChange={e => onChange({ ...person, retireAge: Number(e.target.value) })}
          style={{ "--val": `${pct}%` }}
          aria-label="Pensionierungsalter"
        />
        <div className="range-marks">
          {[58, 62, 65, 68, 70].map(m => {
            const left = ((m - min) / (max - min)) * 100;
            return (
              <span
                key={m}
                className={m === val ? "mark-hit" : ""}
                style={{ left: `${left}%` }}
              >{m}</span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------- Tweaks ---------- */
function Tweaks({ open, state, setState, onClose }) {
  return (
    <div className={`tweaks ${open ? "open" : ""}`}>
      <h5>
        <span>Tweaks</span>
        <button
          onClick={onClose}
          style={{background:"none", border:"none", cursor:"pointer", color:"var(--ink-400)", fontSize:16}}
          aria-label="Tweaks schliessen"
        >×</button>
      </h5>
      <div className="row">
        <label>Dichte</label>
        <select
          value={state.density}
          onChange={e => setState({ density: e.target.value })}
        >
          <option value="comfortable">Komfortabel</option>
          <option value="compact">Kompakt</option>
        </select>
      </div>
      <div className="row">
        <label>Zweite Person</label>
        <input
          type="checkbox"
          checked={state.showSecondPerson}
          onChange={e => setState({ showSecondPerson: e.target.checked })}
        />
      </div>
      <div className="row">
        <label>Ziel-Stil</label>
        <select
          value={state.accentGoals}
          onChange={e => setState({ accentGoals: e.target.value })}
        >
          <option value="navy">Navy Fill</option>
          <option value="outline">Outline nur</option>
          <option value="soft">Soft Hintergrund</option>
        </select>
      </div>
    </div>
  );
}

/* ---------- App ---------- */
function App() {
  const { t, isPaar } = (window.useAnsprache ? window.useAnsprache() : { t: (a, b) => b, isPaar: true });
  const saved = (window.wwStore && window.wwStore.get && window.wwStore.get()) || {};
  const [selectedGoal, setSelectedGoal] = useState(saved.selectedGoal || "rente");
  const [activeTab, setActiveTab] = useState(1);
  const [tweaks, setTweaks] = useState(window.__TWEAKS__ || { density:"comfortable", showSecondPerson:false, accentGoals:"navy" });
  const [tweaksOpen, setTweaksOpen] = useState(false);

  // Auto-save to localStorage whenever key fields change
  useEffect(() => {
    if (window.wwStore) window.wwStore.set({ selectedGoal });
  }, [selectedGoal]);

  // Edit-mode protocol
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

  const updateTweaks = (patch) => {
    const next = { ...tweaks, ...patch };
    setTweaks(next);
    try { window.parent.postMessage({ type: "__edit_mode_set_keys", edits: patch }, "*"); } catch(_) {}
  };

  const _saved1 = (window.wwStore && window.wwStore.get && window.wwStore.get()) || {};
  const _civilToWord = (c) => (c === "married" || c === "verheiratet") ? "verheiratet"
    : (c === "partnerschaft") ? "partnerschaft"
    : (c === "single" || c === "ledig") ? "ledig"
    : (c || "ledig");
  const _ageToDob = (age) => age ? `${new Date().getFullYear() - age}-06-15` : "";
  const _hydrateP = (id, base, fallback) => {
    if (!base) return fallback;
    return {
      id,
      name: base.name || fallback.name,
      dob: base.dob || _ageToDob(base.age) || fallback.dob,
      sex: base.gender || base.sex || fallback.sex,
      civil: _civilToWord(_saved1.civilStatus) || fallback.civil,
      retireAge: base.retirementAge || base.retireAge || fallback.retireAge,
    };
  };
  const [persons, setPersons] = useState([
    _hydrateP(1, _saved1.person1, { id: 1, name: "Andrea", dob: "1968-06-12", sex: "f", civil: "verheiratet", retireAge: 65 }),
    _hydrateP(2, _saved1.person2, { id: 2, name: "",        dob: "",           sex: "m", civil: "ledig",       retireAge: 65 }),
  ]);
  const [location, setLocation] = useState(_saved1.location || null);
  const [hasChildren, setHasChildren] = useState(!!_saved1.hasChildren);
  const [children, setChildren] = useState(_saved1.children || []);

  // Person 2 wird nur bei Paaren angezeigt (Verheiratet / Eingetragene Partnerschaft).
  // Daten von Person 2 bleiben im State erhalten, auch wenn aktuell ausgeblendet.
  const isCouple = persons[0].civil === "verheiratet" || persons[0].civil === "partnerschaft";
  const hasPartner = isCouple;

  // Wenn aus Paar → Einzelperson: activeTab auf 1 zurücksetzen, sonst zeigt UI Person-2-Daten an
  useEffect(() => {
    if (!isCouple && activeTab === 2) setActiveTab(1);
  }, [isCouple, activeTab]);

  // Sync persons + desired income to wwStore (for chat context + triggers)
  useEffect(() => {
    if (!window.wwStore) return;
    const mapCivil = (c) =>
      (c === "verheiratet" || c === "partnerschaft") ? "married" :
      c === "ledig" ? "single" : c;
    const ageFromDob = (dob) => {
      if (!dob) return null;
      const y = new Date(dob).getFullYear();
      if (!y) return null;
      return new Date().getFullYear() - y;
    };
    const p1 = persons[0];
    const p2 = persons[1];
    const patch = {
      civilStatus: mapCivil(p1.civil),
      person1: {
        name: p1.name,
        age: ageFromDob(p1.dob),
        gender: p1.sex,
        retirementAge: Number(p1.retireAge) || 65,
      },
      person2: hasPartner ? {
        name: p2.name,
        age: ageFromDob(p2.dob),
        gender: p2.sex,
        retirementAge: Number(p2.retireAge) || 65,
      } : null,
      location,
      hasChildren,
      children,
    };
    window.wwStore.set(patch);
  }, [persons, location, hasChildren, children, hasPartner]);
  const current = persons[activeTab - 1];

  const updatePerson = (p) => {
    setPersons(prev => prev.map(x => x.id === p.id ? p : x));
  };

  const addPartner = () => {
    setPersons(prev => prev.map(x => x.id === 1 ? { ...x, civil: "verheiratet" } : x));
    setActiveTab(2);
  };

  // Goal-accent switch (applies color vocabulary for .goal.active)
  const accentStyle = useMemo(() => {
    switch(tweaks.accentGoals){
      case "outline":
        return `.goal.active { background: var(--surface) !important; box-shadow: 0 0 0 2px var(--navy-800) inset !important; }
                .goal.active .goal-icon { background: var(--navy-100); color: var(--navy-800); }`;
      case "soft":
        return `.goal.active { background: var(--navy-100); box-shadow: none !important; border-color: transparent !important;}
                .goal.active .goal-icon { background: white; color: var(--navy-800); }`;
      default: return "";
    }
  }, [tweaks.accentGoals]);

  const density = tweaks.density === "compact";

  return (
    <div className="app" data-screen-label="01 Situation" style={density ? { fontSize: 15 } : undefined}>
      <style>{accentStyle}</style>
      <TopBar />
      <ProgressBar current={1} />

      <main>
        <div className="page-head">
          <div className="eyebrow">Schritt 1 · Situation</div>
          <h1 className="title">{t("Was möchtest du erreichen?", "Was möchtet ihr erreichen?")}</h1>
          <p className="subtitle">{t("Wir passen die Analyse auf deine Ziele an.", "Wir passen die Analyse auf eure Ziele an.")}</p>
        </div>

        {/* Block A – Goals */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">A</span>{t("Was möchtest du erreichen?", "Was möchtet ihr erreichen?")}
            </h2>
            <span className="block-hint">Weitere Ziele folgen demnächst</span>
          </div>
          <div className="goal-grid">
            {GOALS.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                selected={selectedGoal === g.id}
                onClick={() => setSelectedGoal(g.id)}
              />
            ))}
          </div>
        </section>

        {/* Block B – Persons */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">B</span>Zu wem gehören diese Angaben?
            </h2>
            <span className="block-hint">{t("Du kannst die Planung auch als Paar machen.", "Ihr könnt die Planung als Paar machen.")}</span>
          </div>

          <div className="tabs" role="tablist">
            <button
              className={`tab ${activeTab === 1 ? "active" : ""}`}
              onClick={() => setActiveTab(1)}
              role="tab" aria-selected={activeTab === 1}
            >
              <span className="tab-dot">1</span>
              <span>{persons[0].name || "Person 1"}</span>
            </button>

            {hasPartner ? (
              <button
                className={`tab ${activeTab === 2 ? "active" : ""}`}
                onClick={() => setActiveTab(2)}
                role="tab" aria-selected={activeTab === 2}
              >
                <span className="tab-dot">2</span>
                <span>{persons[1].name || "Person 2"}</span>
              </button>
            ) : null}
          </div>

          <PersonForm
            person={current}
            onChange={updatePerson}
            hasPartner={hasPartner}
            onAddPartner={addPartner}
            afterSlot={
              <div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 18, color: "var(--ink-900)", margin: "0 0 12px 0" }}>
                  Wo wohn{isPaar ? "t ihr" : "st du"}?
                </h3>
                <LocationField value={location} onChange={setLocation} />
              </div>
            }
          />
        </section>

        {/* Block C – Children */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">C</span>{t("Hast du Kinder?", "Habt ihr Kinder?")}
            </h2>
          </div>
          <ChildrenBlock
            hasChildren={hasChildren}
            children={children}
            onChange={({ hasChildren: h, children: c }) => { setHasChildren(h); setChildren(c); }}
          />
        </section>

        {/* Block D – Retire slider */}
        <section className="block">
          <div className="block-head">
            <h2 className="block-title">
              <span className="block-num">D</span>Wann soll es soweit sein?
            </h2>
            <span className="block-hint">AHV-Referenzalter liegt bei 65 Jahren.</span>
          </div>
          <div className="slider-grid" style={!hasPartner ? { gridTemplateColumns: "1fr" } : undefined}>
            <RetireSlider person={persons[0]} onChange={updatePerson} />
            {hasPartner && <RetireSlider person={persons[1]} onChange={updatePerson} />}
          </div>
        </section>
      </main>

      {/* Footer nav */}
      <div className="footer">
        <div className="footer-meta">Schritt 1 von 4 · Situation</div>
        <div style={{display:"flex", gap:10}}>
          <button className="btn btn-ghost" disabled>← Zurück</button>
          <button className="btn btn-primary" onClick={() => {
            try {
              window.ww && window.ww.track && window.ww.track("wizard_step", { step: 1, screen: "screen_1_situation" });
              window.ww && window.ww.markAdvanced && window.ww.markAdvanced();
            } catch (e) {}
            window.location.href = "WealthWise - Screen 2 Vorsorge.html";
          }}>
            Weiter <Icon.Arrow width={16} height={16} />
          </button>
        </div>
      </div>

      <Tweaks
        open={tweaksOpen}
        state={tweaks}
        setState={updateTweaks}
        onClose={() => setTweaksOpen(false)}
      />
    </div>
  );
}

function Root() {
  const getCtx = () => {
    const s = (window.wwStore && window.wwStore.get && window.wwStore.get()) || {};
    return {
      currentStep: "situation",
      person1: s.person1 || null,
      person2: s.person2 || null,
      civilStatus: s.civilStatus,
      freeAssets: s.freeAssets,
      monthlyExpenses: s.monthlyExpenses,
      hasProperty: s.hasProperty,
      propertyValue: s.propertyValue,
      mortgageRemaining: s.mortgageRemaining,
      analysisResult: s.analysisResult,
    };
  };
  return (
    <>
      <App />
      {window.WWChatPanel ? <window.WWChatPanel currentStep="situation" getContext={getCtx} /> : null}
    </>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
