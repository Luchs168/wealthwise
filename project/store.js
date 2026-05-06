/* =========================================================
   WealthWise · Save & Share Store
   ---------------------------------------------------------
   - LocalStorage: auto-save on every set(), auto-load on boot
   - URL sharing: ?d=<lz-compressed-base64-json>
   - Resume banner on wizard screens if existing data found
   - "Clear data" action
   - Public API: window.wwStore
   ========================================================= */
(function () {
  "use strict";

  const KEY = "wealthwise.v1";
  const VERSION = 1;
  const MAX_URL_LEN = 2000;

  /* Lazy-load lz-string from CDN once, fall back to btoa if offline */
  let lzReady = null;
  function ensureLz() {
    if (lzReady) return lzReady;
    lzReady = new Promise((resolve) => {
      if (window.LZString) return resolve(window.LZString);
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/lz-string@1.5.0/libs/lz-string.min.js";
      s.onload = () => resolve(window.LZString || null);
      s.onerror = () => resolve(null);
      document.head.appendChild(s);
    });
    return lzReady;
  }

  function readLS() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || obj.v !== VERSION) return null;
      return obj.data || null;
    } catch (e) { return null; }
  }

  function writeLS(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: VERSION, t: Date.now(), data }));
    } catch (e) {}
  }

  function clearLS() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  /* ---- URL import on boot -------------------------------------------- */
  async function tryImportFromURL() {
    const params = new URLSearchParams(location.search);
    const d = params.get("d");
    if (!d) return null;
    const lz = await ensureLz();
    try {
      const json = lz
        ? lz.decompressFromEncodedURIComponent(d)
        : decodeURIComponent(escape(atob(d.replace(/-/g,'+').replace(/_/g,'/'))));
      if (!json) return null;
      const parsed = JSON.parse(json);
      writeLS(parsed);
      try { window.ww && window.ww.track && window.ww.track("save_resumed", { source: "url" }); } catch(e){}
      // Strip the param so a page refresh doesn't re-apply stale data
      params.delete("d");
      const clean = location.pathname + (params.toString() ? "?" + params.toString() : "");
      history.replaceState(null, "", clean);
      return parsed;
    } catch (e) { return null; }
  }

  /* ---- Share link creation ------------------------------------------- */
  async function makeShareURL(data) {
    const lz = await ensureLz();
    const json = JSON.stringify(data || readLS() || {});
    let code;
    if (lz) {
      code = lz.compressToEncodedURIComponent(json);
    } else {
      code = btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
    }
    const url = location.origin + "/" + "WealthWise - Landing.html?d=" + code;
    if (url.length > MAX_URL_LEN) {
      console.warn("[wwStore] share URL exceeds", MAX_URL_LEN, "chars:", url.length);
    }
    try { window.ww && window.ww.track && window.ww.track("share_link_created"); } catch(e){}
    return url;
  }

  /* ---- Resume banner ------------------------------------------------- */
  function injectResumeBanner(onResume, onFresh) {
    if (document.getElementById("ww-resume-banner")) return;
    const css = `
      #ww-resume-banner{position:fixed;left:50%;top:76px;transform:translateX(-50%);
        background:#fff;border:1px solid #e2e8f0;border-radius:14px;
        box-shadow:0 12px 32px rgba(17,31,58,.14),0 2px 4px rgba(17,31,58,.06);
        padding:14px 18px;display:flex;align-items:center;gap:14px;z-index:100;
        font-family:"Inter",system-ui,sans-serif;font-size:14px;color:#0f172a;
        max-width:calc(100% - 40px);animation:wwSlideDown .3s ease}
      @keyframes wwSlideDown{from{opacity:0;transform:translate(-50%,-12px)}to{opacity:1;transform:translate(-50%,0)}}
      #ww-resume-banner .ww-r-ico{width:32px;height:32px;border-radius:8px;background:#f1f4fa;color:#2a3e63;display:grid;place-items:center;flex-shrink:0}
      #ww-resume-banner .ww-r-txt b{font-family:"Inter Tight",sans-serif;font-weight:600;display:block;color:#111f3a}
      #ww-resume-banner .ww-r-txt span{color:#64748b;font-size:13px}
      #ww-resume-banner button{font:inherit;font-family:"Inter Tight",sans-serif;font-weight:500;font-size:14px;
        padding:8px 14px;border-radius:8px;border:1px solid transparent;cursor:pointer;transition:all .15s}
      #ww-resume-banner .ww-r-primary{background:#1a2b4a;color:#fff}
      #ww-resume-banner .ww-r-primary:hover{background:#111f3a}
      #ww-resume-banner .ww-r-ghost{background:transparent;color:#64748b}
      #ww-resume-banner .ww-r-ghost:hover{color:#0f172a}
      @media(max-width:720px){#ww-resume-banner{flex-direction:column;align-items:flex-start;left:10px;right:10px;transform:none;top:68px}
        @keyframes wwSlideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:none}}}
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    const el = document.createElement("div");
    el.id = "ww-resume-banner";
    el.innerHTML = `
      <div class="ww-r-ico">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><polyline points="3 3 3 8 8 8"/></svg>
      </div>
      <div class="ww-r-txt">
        <b>Willkommen zurück!</b>
        <span>Möchtest du deine letzte Analyse fortsetzen?</span>
      </div>
      <button class="ww-r-primary">Fortsetzen</button>
      <button class="ww-r-ghost">Neu starten</button>
    `;
    const [resumeBtn, freshBtn] = el.querySelectorAll("button");
    resumeBtn.onclick = () => { el.remove(); onResume && onResume(); };
    freshBtn.onclick = () => { clearLS(); el.remove(); onFresh && onFresh(); };
    document.body.appendChild(el);
  }

  /* ---- Toast for copy-share ------------------------------------------ */
  function toast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = `
      position:fixed;left:50%;bottom:30px;transform:translateX(-50%);
      background:#111f3a;color:#fff;padding:12px 22px;border-radius:10px;
      font-family:"Inter",system-ui,sans-serif;font-size:14px;font-weight:500;
      z-index:200;box-shadow:0 8px 24px rgba(0,0,0,.2);animation:wwToast .3s ease`;
    const s = document.createElement("style");
    s.textContent = `@keyframes wwToast{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}`;
    document.head.appendChild(s);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2400);
  }

  /* ---- Derived selectors --------------------------------------------- */
  // Single source of truth: leitet ein Personen-Array für Screen 2/3/4 ab
  // Berücksichtigt Zivilstand aus Schritt 1, Namen aus Schritt 1, und merged
  // bestehende Vorsorge-Felder aus persons-Array (falls vorhanden).
  function getPersons() {
    const s = readLS() || {};
    const civil = s.civilStatus;
    const isPaar = civil === "married" || civil === "partnerschaft" || civil === "verheiratet";
    const p1Base = s.person1 || {};
    const p2Base = isPaar ? (s.person2 || {}) : null;
    const stored = Array.isArray(s.persons) ? s.persons : [];
    const findStored = (id) => stored.find(x => x && x.id === id) || {};

    const buildPerson = (id, base, fallbackName) => {
      const fromArr = findStored(id);
      return {
        id,
        name: base.name || fromArr.name || fallbackName,
        // Vorsorge-Felder (mit Defaults) aus persons-Array überschreiben Base
        status: fromArr.status || "erwerb",
        incomeMode: fromArr.incomeMode || "manual",
        income: fromArr.income ?? 100000,
        employmentGrade: fromArr.employmentGrade ?? 100,
        hasPK:  fromArr.hasPK !== undefined ? fromArr.hasPK : true,
        pkMode: fromArr.pkMode || "manual",
        pkCapital: fromArr.pkCapital ?? 400000,
        pkYearlyRente: fromArr.pkYearlyRente ?? 0,
        pkRate: fromArr.pkRate ?? "5.8",
        has3a: fromArr.has3a !== undefined ? fromArr.has3a : true,
        balance3a: fromArr.balance3a ?? 50000,
        yearly3a: fromArr.yearly3a ?? 0,
        form3a: fromArr.form3a || "sparkonto",
        hasFZ: fromArr.hasFZ !== undefined ? fromArr.hasFZ : false,
        fzBalance: fromArr.fzBalance ?? 0,
        currentRente: fromArr.currentRente ?? 0,
        // Schritt-1-Daten
        age: base.age ?? null,
        gender: base.gender ?? null,
        retirementAge: base.retirementAge ?? 65,
      };
    };

    const p1 = buildPerson(1, p1Base, "Person 1");
    const p2 = isPaar ? buildPerson(2, p2Base || {}, "Person 2") : null;
    return { isPaar, civilStatus: civil, p1, p2, list: p2 ? [p1, p2] : [p1] };
  }

  /* ---- Public API ---------------------------------------------------- */
  const api = {
    get() { return readLS() || {}; },
    getPersons,
    set(patch) {
      const cur = readLS() || {};
      const next = Object.assign({}, cur, patch || {});
      writeLS(next);
      try { window.dispatchEvent(new CustomEvent("ww:store-change", { detail: next })); } catch(e){}
      return next;
    },
    replace(data) {
      writeLS(data || {});
      try { window.dispatchEvent(new CustomEvent("ww:store-change", { detail: data || {} })); } catch(e){}
    },
    clear() { clearLS(); },
    has() { return !!readLS(); },
    async share() {
      const url = await makeShareURL();
      try {
        await navigator.clipboard.writeText(url);
        toast("Link in Zwischenablage kopiert");
      } catch (e) {
        prompt("Kopiere diesen Link:", url);
      }
      return url;
    },
    async shareURL() { return makeShareURL(); },
    injectResumeBanner,
    importFromURL: tryImportFromURL,
  };
  window.wwStore = api;

  /* ---- Boot: import URL param, then show resume if applicable -------- */
  (async function boot() {
    const imported = await tryImportFromURL();
    if (imported) return; // URL takes precedence, no banner
    const isWizard = /Screen\s*1|Screen\s*2|Screen\s*3|Screen\s*4/i.test(location.pathname + location.search);
    const isLanding = /Landing|index/i.test(location.pathname) || location.pathname === "/" || location.pathname.endsWith("/");
    if ((isWizard || isLanding) && api.has()) {
      // Only show on Screen 1 and Landing; on deeper screens user already resumed
      if (isLanding || /Screen\s*1/i.test(location.pathname)) {
        const fire = () => injectResumeBanner(
          () => { try { window.ww && window.ww.track && window.ww.track("save_resumed", { source: "localstorage" }); } catch(e){}
                  if (isLanding) location.href = "WealthWise - Screen 1 Situation.html"; },
          () => {}
        );
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fire);
        else fire();
      }
    }
  })();
})();
