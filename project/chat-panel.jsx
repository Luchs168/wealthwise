/* WealthWise Chat-Panel – sticky right, collapsible */
(function(){
const { useState, useEffect, useRef, useCallback } = React;

const STORAGE_KEY = "ww_chat_state_v1";
const MAX_MESSAGES = 50;
const PROACTIVE_GAP_MS = 30 * 1000;   // min 30s zwischen proaktiven Hinweisen
const TRIGGER_DEBOUNCE_MS = 1500;     // natürliche Verzögerung

function loadChatState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.firedTriggers) s.firedTriggers = new Map(s.firedTriggers);
    return s;
  } catch { return null; }
}
function saveChatState(s) {
  try {
    const serial = { ...s, firedTriggers: Array.from(s.firedTriggers.entries()) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serial));
  } catch {}
}

function ChatPanel({ currentStep, getContext }) {
  const initial = loadChatState() || {};
  const [open, setOpen] = useState(false); // default geschlossen – als FAB
  const [messages, setMessages] = useState(initial.messages || []);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [firedTriggers, setFiredTriggers] = useState(initial.firedTriggers || new Map());
  const [lastProactive, setLastProactive] = useState(initial.lastProactive || 0);
  const prevDataRef = useRef(initial.prevData || null);
  const scrollRef = useRef(null);
  const triggerTimerRef = useRef(null);

  const remaining = Math.max(0, MAX_MESSAGES - messages.length);
  const limitReached = remaining <= 0;

  // Persist
  useEffect(() => {
    saveChatState({ open, messages, firedTriggers, lastProactive, prevData: prevDataRef.current });
  }, [open, messages, firedTriggers, lastProactive]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping, open]);

  // Tweaks-Panel compat – Chat-Panel reagiert NICHT auf edit mode
  const callClaude = useCallback(async (userMessage, triggerId) => {
    const ctx = getContext ? getContext() : {};
    ctx.currentStep = currentStep;
    const { SYSTEM_PROMPT, buildAdvisoryContext, buildTriggerPrompt } = window.WW_CHAT;
    const contextString = buildAdvisoryContext(ctx);
    const sys = SYSTEM_PROMPT + "\n\n# Aktuelle Nutzerdaten\n" + contextString;

    const history = messages.slice(-20).map(m => ({
      role: m.role, content: m.content,
    }));
    const finalMsg = triggerId ? buildTriggerPrompt(triggerId, ctx) : userMessage;
    history.push({ role: "user", content: finalMsg });

    try {
      const reply = await window.claude.complete({ system: sys, messages: history });
      return reply || "Entschuldigung, ich konnte gerade nicht antworten. Versuch es nochmal.";
    } catch (e) {
      return "Entschuldigung, ich konnte gerade nicht antworten. Versuch es nochmal.";
    }
  }, [messages, currentStep, getContext]);

  // Refs für State-Werte, damit die Trigger-Loop nicht bei jedem State-Update neu aufgesetzt wird
  const firedRef = useRef(firedTriggers);
  const lastProactiveRef = useRef(lastProactive);
  useEffect(() => { firedRef.current = firedTriggers; }, [firedTriggers]);
  useEffect(() => { lastProactiveRef.current = lastProactive; }, [lastProactive]);

  // Trigger-Engine – läuft periodisch unabhängig von React-Renders
  useEffect(() => {
    if (limitReached) return;
    let cancelled = false;
    let busy = false;

    const tick = async () => {
      if (cancelled || busy) return;
      if (!window.WW_CHAT_TRIGGERS) return;
      const fired = firedRef.current;
      const ctx = getContext ? getContext() : {};
      ctx.currentStep = currentStep;
      ctx._hasGreeted = fired.has("welcome");
      ctx._welcomedSituation = fired.has("welcome_situation");
      ctx._welcomedVorsorge = fired.has("welcome_vorsorge");
      ctx._welcomedAusgaben = fired.has("welcome_ausgaben");
      ctx._welcomedAnalyse = fired.has("welcome_analyse");

      const prev = prevDataRef.current;
      const { checkTriggers, WARNING_TRIGGERS } = window.WW_CHAT_TRIGGERS;
      const now = Date.now();
      const triggerId = checkTriggers(ctx, prev, fired);
      prevDataRef.current = ctx;
      if (!triggerId) return;
      const isWelcome = triggerId.startsWith("welcome");
      if (!isWelcome && fired.size > 0 && (now - lastProactiveRef.current) < PROACTIVE_GAP_MS) return;

      busy = true;
      // Optimistisch lokal markieren damit derselbe Trigger nicht mehrfach feuert
      const newFired = new Map(fired).set(triggerId, Date.now());
      firedRef.current = newFired;
      lastProactiveRef.current = Date.now();
      setFiredTriggers(newFired);
      setLastProactive(Date.now());

      await new Promise(r => setTimeout(r, TRIGGER_DEBOUNCE_MS));
      if (cancelled) { busy = false; return; }
      setIsTyping(true);
      const reply = await callClaude(null, triggerId);
      if (cancelled) { busy = false; return; }
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: "assistant",
        content: reply,
        type: WARNING_TRIGGERS.has(triggerId) ? "warning" : "proactive",
        triggerId,
        ts: Date.now(),
      }]);
      busy = false;
    };

    tick();
    const iv = setInterval(tick, 1500);
    const onStoreChange = () => tick();
    window.addEventListener("ww:store-change", onStoreChange);
    return () => {
      cancelled = true;
      clearInterval(iv);
      window.removeEventListener("ww:store-change", onStoreChange);
    };
  }, [currentStep, limitReached, callClaude]);

  async function sendMessage(text) {
    if (!text.trim() || limitReached || isTyping) return;
    const userMsg = { role: "user", content: text.trim(), ts: Date.now() };
    setMessages(m => [...m, userMsg]);
    setInput("");
    setIsTyping(true);
    const reply = await callClaude(text.trim(), null);
    setIsTyping(false);
    setMessages(m => [...m, { role: "assistant", content: reply, type: "answer", ts: Date.now() }]);
  }

  function markUnderstood(idx) {
    setMessages(ms => ms.map((m, i) => i === idx ? { ...m, acknowledged: true } : m));
  }

  function askMore(content) {
    sendMessage("Kannst du mehr dazu sagen?");
  }

  const quick = (window.WW_CHAT_TRIGGERS.QUICK_QUESTIONS[currentStep]) || [];

  return (
    <>
      {!open && (
        <button
          className="ww-chat-fab"
          onClick={() => setOpen(true)}
          aria-label="Beratung öffnen"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span>Beratung</span>
          {messages.length > 0 && <span className="ww-chat-fab-dot" />}
        </button>
      )}

      {open && (
        <aside className="ww-chat-panel" role="complementary" aria-label="WealthWise Beratung">
          <header className="ww-chat-head">
            <div className="ww-chat-head-left">
              <div className="ww-chat-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              </div>
              <div>
                <div className="ww-chat-title">Beratung</div>
                <div className="ww-chat-sub">{isTyping ? "schreibt …" : "online"}</div>
              </div>
            </div>
            <div className="ww-chat-head-right">
              <span className="ww-chat-remaining" title="Verbleibende Nachrichten">
                {messages.length}/{MAX_MESSAGES}
              </span>
              <button className="ww-chat-close" onClick={() => setOpen(false)} aria-label="Schliessen">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </header>

          <div className="ww-chat-body" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="ww-chat-empty">
                <div className="ww-chat-empty-icon">💬</div>
                <div className="ww-chat-empty-title">Ich bin hier, falls du Fragen hast.</div>
                <div className="ww-chat-empty-sub">Während du das Formular ausfüllst, gebe ich dir Hinweise zu deinen Eingaben und beantworte Fragen zur Schweizer Vorsorge.</div>
              </div>
            )}

            {messages.map((m, i) => <ChatMessage key={i} m={m} idx={i} onAck={markUnderstood} onAskMore={askMore} />)}

            {isTyping && (
              <div className="ww-msg ww-msg-assistant">
                <div className="ww-msg-bubble ww-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {quick.length > 0 && !limitReached && (
            <div className="ww-chat-quick">
              {quick.map(q => (
                <button key={q} className="ww-chat-quick-chip" onClick={() => sendMessage(q)} disabled={isTyping}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <form
            className="ww-chat-input"
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          >
            <input
              type="text"
              placeholder={limitReached ? "Limit erreicht" : "Frage stellen …"}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={limitReached || isTyping}
              aria-label="Nachricht"
            />
            <button type="submit" disabled={!input.trim() || limitReached || isTyping} aria-label="Senden">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>

          {limitReached && (
            <div className="ww-chat-limit">
              Für weitere Fragen empfehle ich dir ein Gespräch mit einem Finanzplaner.
            </div>
          )}

          <footer className="ww-chat-foot">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            Unverbindliche Informationen, keine Finanzberatung.
          </footer>
        </aside>
      )}
    </>
  );
}

function ChatMessage({ m, idx, onAck, onAskMore }) {
  if (m.role === "user") {
    return (
      <div className="ww-msg ww-msg-user">
        <div className="ww-msg-bubble">{m.content}</div>
      </div>
    );
  }
  if (m.type === "proactive" || m.type === "warning") {
    const isWarn = m.type === "warning";
    return (
      <div className={"ww-msg ww-msg-assistant ww-msg-hint " + (isWarn ? "warn" : "info") + (m.acknowledged ? " acked" : "")}>
        <div className="ww-msg-hint-head">
          {isWarn ? "⚠️" : "💡"}
          <span>{isWarn ? "Achtung" : "Hinweis"}</span>
        </div>
        <div className="ww-msg-hint-body">{m.content}</div>
        {!m.acknowledged && (
          <div className="ww-msg-hint-actions">
            <button className="ww-hint-btn ghost" onClick={() => onAskMore(m.content)}>
              {isWarn ? "Was kann ich tun?" : "Mehr erfahren"}
            </button>
            <button className="ww-hint-btn primary" onClick={() => onAck(idx)}>Verstanden ✓</button>
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="ww-msg ww-msg-assistant">
      <div className="ww-msg-bubble">{m.content}</div>
    </div>
  );
}

window.WWChatPanel = ChatPanel;
})();
