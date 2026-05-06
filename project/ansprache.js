/* =========================================================
   WealthWise · Ansprache (Du/Ihr)
   ---------------------------------------------------------
   Quelle: wwStore.civilStatus
   - "verheiratet" / "married" / "partnerschaft" / "registered_partnership"
     → Paar (Ihr-Form)
   - alles andere / leer → Einzelperson (Du-Form)

   Reaktiv via "ww:store-change"-Event.

   Public API:
     window.wwAnsprache.isPaar()       → bool
     window.wwAnsprache.t(du, ihr)     → string
     window.wwAnsprache.subscribe(fn)  → unsubscribe
     window.useAnsprache()              → React hook
   ========================================================= */
(function () {
  "use strict";

  const PAAR_VALUES = new Set([
    "verheiratet", "married",
    "partnerschaft", "eingetragene_partnerschaft", "registered_partnership",
  ]);

  function readCivil() {
    try {
      const s = (window.wwStore && window.wwStore.get && window.wwStore.get()) || {};
      // primary: civilStatus key
      let cs = s.civilStatus;
      // fallback: person1.civil (in case some screens write only that)
      if (!cs && s.person1 && s.person1.civil) cs = s.person1.civil;
      return (cs || "").toString().toLowerCase().trim();
    } catch (e) { return ""; }
  }

  function isPaar() {
    return PAAR_VALUES.has(readCivil());
  }

  function t(du, ihr) {
    return isPaar() ? ihr : du;
  }

  // --- subscribers ---
  const subs = new Set();
  function subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    subs.add(fn);
    return () => subs.delete(fn);
  }
  function notify() {
    const paar = isPaar();
    subs.forEach(fn => { try { fn(paar); } catch (e) {} });
  }

  window.addEventListener("ww:store-change", notify);

  window.wwAnsprache = { isPaar, t, subscribe };

  // --- React hook (optional, only if React is present) ---
  if (typeof window.React !== "undefined") {
    const { useState, useEffect, useCallback } = window.React;
    window.useAnsprache = function useAnsprache() {
      const [paar, setPaar] = useState(isPaar());
      useEffect(() => subscribe(setPaar), []);
      const tt = useCallback((du, ihr) => (paar ? ihr : du), [paar]);
      return { isPaar: paar, t: tt };
    };
  } else {
    // Defer hook registration until React loads
    const tryRegister = () => {
      if (typeof window.React === "undefined") return;
      const { useState, useEffect, useCallback } = window.React;
      window.useAnsprache = function useAnsprache() {
        const [paar, setPaar] = useState(isPaar());
        useEffect(() => subscribe(setPaar), []);
        const tt = useCallback((du, ihr) => (paar ? ihr : du), [paar]);
        return { isPaar: paar, t: tt };
      };
      clearInterval(iv);
    };
    const iv = setInterval(tryRegister, 50);
    setTimeout(() => clearInterval(iv), 5000);
  }
})();
