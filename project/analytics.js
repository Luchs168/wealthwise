/* =========================================================
   WealthWise · Privacy-friendly Analytics
   ---------------------------------------------------------
   - Uses Plausible (EU-hosted, no cookies, no personal data)
   - Falls back to console logging in local/dev (file://)
   - Never sends input values, names, amounts etc.
   - Exposes a single global: window.ww.track(event, props?)
   ========================================================= */
(function () {
  "use strict";

  // ---- Config ----------------------------------------------------------
  // Replace with your real Plausible domain before production deploy.
  const PLAUSIBLE_DOMAIN = "wealthwise.ch";
  const PLAUSIBLE_SRC = "https://plausible.io/js/script.tagged-events.js";

  // Allowed event names – guardrail against typos / PII leakage.
  const ALLOWED_EVENTS = new Set([
    "page_view",
    "wizard_step",
    "wizard_complete",
    "pdf_export",
    "chatbot_used",
    "pk_upload",
    "drop_off",
    "share_link_created",
    "save_resumed",
  ]);

  // Property keys we allow on events. Everything else is stripped.
  // Values are coerced to string/number/boolean; nothing nested.
  const ALLOWED_PROPS = new Set([
    "screen",          // e.g. "screen_1_situation"
    "step",            // 1..4
    "page",            // pathname
    "source",          // referrer category (own | external | direct)
    "variant",         // e.g. "ab_test_a"
    "status",          // "green" | "yellow" | "red"
    "duration_bucket", // "<2m" | "2-5m" | "5-10m" | ">10m"
    "success",         // true | false
  ]);

  // PII blocklist: refuse anything that smells like user input.
  const PII_KEY_PATTERNS = [
    /name/i, /email/i, /mail/i, /phone/i, /tel/i,
    /address/i, /iban/i, /account/i, /salary/i,
    /income/i, /amount/i, /value/i, /chf/i, /age/i,
    /birth/i, /date/i,
  ];

  // ---- Load script (skip on file://) -----------------------------------
  const isHttp = location.protocol === "http:" || location.protocol === "https:";
  if (isHttp && !document.querySelector('script[data-plausible-loaded]')) {
    const s = document.createElement("script");
    s.defer = true;
    s.src = PLAUSIBLE_SRC;
    s.setAttribute("data-domain", PLAUSIBLE_DOMAIN);
    s.setAttribute("data-plausible-loaded", "");
    document.head.appendChild(s);
    // Stub until script loads
    window.plausible = window.plausible || function () {
      (window.plausible.q = window.plausible.q || []).push(arguments);
    };
  }

  // ---- Helpers ---------------------------------------------------------
  function sanitizeProps(props) {
    if (!props || typeof props !== "object") return {};
    const out = {};
    for (const [k, v] of Object.entries(props)) {
      if (!ALLOWED_PROPS.has(k)) continue;
      if (PII_KEY_PATTERNS.some((re) => re.test(k))) continue;
      const t = typeof v;
      if (t === "string") {
        // Hard cap to avoid accidental leakage of long input.
        out[k] = v.slice(0, 40);
      } else if (t === "number" || t === "boolean") {
        out[k] = v;
      }
    }
    return out;
  }

  function track(event, props) {
    if (!ALLOWED_EVENTS.has(event)) {
      // Strict whitelist – silently ignore unknown events.
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[ww.track] unknown event:", event);
      }
      return;
    }
    const cleanProps = sanitizeProps(props);

    // Dev fallback: log to console if Plausible not present.
    if (typeof window.plausible !== "function") {
      if (console && console.debug) {
        console.debug("[ww.track]", event, cleanProps);
      }
      return;
    }

    try {
      window.plausible(event, Object.keys(cleanProps).length
        ? { props: cleanProps }
        : undefined);
    } catch (e) {
      /* swallow – analytics must never break the app */
    }
  }

  // ---- Auto page_view on load -----------------------------------------
  // Plausible's built-in pageview is fine; we also fire our named event
  // with a stable screen id so the wizard funnel is queryable.
  function inferScreen() {
    const p = location.pathname + location.hash;
    if (/landing/i.test(p) || p === "/" || /index/i.test(p)) return "landing";
    if (/screen\s*1|situation/i.test(p)) return "screen_1_situation";
    if (/screen\s*2|vorsorge/i.test(p)) return "screen_2_vorsorge";
    if (/screen\s*3|ausgaben/i.test(p)) return "screen_3_ausgaben";
    if (/screen\s*4|analyse/i.test(p)) return "screen_4_analyse";
    if (/datenschutz/i.test(p)) return "datenschutz";
    if (/impressum/i.test(p)) return "impressum";
    if (/agb/i.test(p)) return "agb";
    return "unknown";
  }

  // ---- Drop-off detection ---------------------------------------------
  // Fire drop_off if user leaves a wizard screen without advancing.
  // Screens call ww.markAdvanced() when they successfully move on;
  // otherwise beforeunload sends drop_off.
  let advanced = false;
  function markAdvanced() { advanced = true; }

  function installDropOffHandler() {
    const screen = inferScreen();
    if (!/^screen_[1-4]_/.test(screen)) return;
    window.addEventListener("pagehide", () => {
      if (!advanced) {
        track("drop_off", { screen });
      }
    });
  }

  // ---- Public API ------------------------------------------------------
  const ww = window.ww || {};
  ww.track = track;
  ww.markAdvanced = markAdvanced;
  ww.screen = inferScreen;
  window.ww = ww;

  // Fire initial page_view with screen id
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      track("page_view", { screen: inferScreen() });
      installDropOffHandler();
    });
  } else {
    track("page_view", { screen: inferScreen() });
    installDropOffHandler();
  }
})();
