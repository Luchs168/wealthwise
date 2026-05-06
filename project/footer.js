/* =========================================================
   WealthWise · shared Footer + Disclaimer
   Injects a consistent footer into any page that includes:
     <div id="ww-footer"></div>
   or appends one automatically if missing.
   ========================================================= */
(function () {
  "use strict";

  const CSS = `
  .ww-disclaimer {
    background: #fffbeb;
    border-top: 1px solid #fde68a;
    border-bottom: 1px solid #fde68a;
    padding: 14px 40px;
    font-family: "Inter", system-ui, sans-serif;
    font-size: 13px;
    color: #78350f;
    line-height: 1.5;
    text-align: center;
  }
  .ww-disclaimer b { color: #92400e; font-weight: 600; }
  .ww-footer {
    background: #111f3a;
    color: rgba(255,255,255,.7);
    font-family: "Inter", system-ui, sans-serif;
    padding: 0;
  }
  .ww-footer-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    flex-wrap: wrap;
  }
  .ww-footer-left {
    display: flex; align-items: center; gap: 12px;
  }
  .ww-footer-mark {
    width: 26px; height: 26px; border-radius: 7px;
    background: rgba(255,255,255,.12);
    display: grid; place-items: center;
    color: #fff; font-weight: 700; font-size: 14px;
    font-family: "Inter Tight", system-ui, sans-serif;
  }
  .ww-footer-brand {
    font-family: "Inter Tight", system-ui, sans-serif;
    font-weight: 600; font-size: 15px; color: #fff;
  }
  .ww-footer-links { display: flex; gap: 22px; }
  .ww-footer-links a {
    color: rgba(255,255,255,.65);
    text-decoration: none;
    font-size: 14px;
  }
  .ww-footer-links a:hover { color: #fff; }
  .ww-footer-meta {
    font-family: "JetBrains Mono", ui-monospace, monospace;
    font-size: 11px;
    letter-spacing: 0.04em;
    color: rgba(255,255,255,.5);
  }
  @media (max-width: 720px) {
    .ww-footer-inner { flex-direction: column; align-items: flex-start; padding: 24px 20px; }
    .ww-disclaimer { padding: 12px 20px; font-size: 12.5px; }
  }
  `;

  const HTML = `
  <div class="ww-disclaimer">
    ⚠️ <b>WealthWise ersetzt keine professionelle Finanzberatung.</b>
    Alle Berechnungen basieren auf vereinfachten Annahmen.
  </div>
  <footer class="ww-footer">
    <div class="ww-footer-inner">
      <div class="ww-footer-left">
        <div class="ww-footer-mark">W</div>
        <div class="ww-footer-brand">WealthWise</div>
      </div>
      <div class="ww-footer-links">
        <a href="WealthWise - Impressum.html">Impressum</a>
        <a href="WealthWise - Datenschutz.html">Datenschutz</a>
        <a href="WealthWise - AGB.html">AGB</a>
        <a href="mailto:info@wealthwise.ch">Kontakt</a>
      </div>
      <div class="ww-footer-meta">© 2026 WealthWise · Made in Switzerland 🇨🇭</div>
    </div>
  </footer>`;

  function mount() {
    if (!document.getElementById("ww-footer-styles")) {
      const style = document.createElement("style");
      style.id = "ww-footer-styles";
      style.textContent = CSS;
      document.head.appendChild(style);
    }
    let host = document.getElementById("ww-footer");
    if (!host) {
      host = document.createElement("div");
      host.id = "ww-footer";
      document.body.appendChild(host);
    }
    host.innerHTML = HTML;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
