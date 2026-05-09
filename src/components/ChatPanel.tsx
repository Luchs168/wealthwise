import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'

type StepKey = 'situation' | 'vorsorge' | 'ausgaben' | 'analyse'

const QUICK_QUESTIONS: Record<StepKey, string[]> = {
  situation: [
    'Was sind Erziehungsgutschriften?',
    'Was ist die AHV-Plafonierung?',
    'Wie wirkt sich eine Frühpensionierung auf meine AHV aus?',
    'Ab wann kann ich frühzeitig pensionieren?',
  ],
  vorsorge: [
    'Was ist der Unterschied zwischen Rente und Kapital?',
    'Was ist ein guter Umwandlungssatz?',
    'Was ist ein PK-Einkauf?',
    'Wie viel 3a kann ich einzahlen?',
  ],
  ausgaben: [
    'Was sind typische Ausgaben im Alter?',
    'Wie berechne ich meinen Bedarf?',
    'Was ändert sich bei den Ausgaben nach Pensionierung?',
    'Muss ich Steuern auf Renten zahlen?',
  ],
  analyse: [
    'Wie hoch ist meine voraussichtliche Vorsorgelücke?',
    'Was bedeutet dieser Score?',
    'Was kann ich tun wenn das Geld nicht reicht?',
    'Was ist eine Überbrückungsrente?',
  ],
}

const PREPROGRAMMED: Record<string, string> = {
  'Was sind Erziehungsgutschriften?':
    'Erziehungsgutschriften erhöhen dein massgebendes Durchschnittseinkommen für die AHV-Rente. Pro Kind unter 16 Jahren werden jährlich CHF 44\'100 angerechnet (bei Ehepaaren hälftig je Person). Das kann deine AHV-Rente um bis zu mehrere hundert Franken pro Monat steigern.',
  'Was ist die AHV-Plafonierung?':
    'Bei Ehepaaren werden die AHV-Renten auf maximal 150% der Maximalrente begrenzt – also CHF 3\'780 pro Monat (2026). Das bedeutet: auch wenn beide jeweils CHF 2\'520 verdienen würden, erhalten sie zusammen maximal CHF 3\'780 statt CHF 5\'040. Dies ist eine wichtige Überlegung bei der Paar-Planung.',
  'Was bedeutet Vorbezug der AHV?':
    'Du kannst die AHV bis zu 3 Jahre früher (ab Alter 62) beziehen. Die Rente wird dafür lebenslang um 6.8% pro Vorbezugsjahr gekürzt. Bei 3 Jahren wären das 20.4% Kürzung für immer – das sollte gut durchgerechnet werden.',
  'Ab wann kann ich frühzeitig pensionieren?':
    'Frühpensionierung ist grundsätzlich ab Alter 58-60 möglich (je nach Pensionskasse). Der AHV-Vorbezug ist frühestens ab 62 möglich. Zwischen Pensionierung und AHV-Start brauchst du eine Überbrückungsrente oder genügend Vermögen.',
  'Was ist ein guter Umwandlungssatz?':
    'Der gesetzliche Mindest-Umwandlungssatz beträgt 6.8% (nur für das BVG-Obligatorium). Viele Kassen zahlen auf dem überobligatorischen Teil aber nur 4.5-6.0%. Je tiefer der Satz, desto tiefer die monatliche Rente aus dem gleichen Kapital – das macht die Rente vs. Kapital Entscheidung wichtiger.',
  'Soll ich PK-Kapital oder Rente beziehen?':
    'Das hängt stark von Lebenserwartung, Anlagewissen und Sicherheitsbedürfnis ab. Rente bietet lebenslange Sicherheit, Kapital Flexibilität und mögliche Rendite. Der Break-Even (ab wann die Rente mehr einbringt) liegt oft bei 80-84 Jahren. Für die meisten ist ein Mix sinnvoll.',
  'Was ist ein PK-Einkauf?':
    'Du kannst freiwillig in deine Pensionskasse einzahlen bis zur maximalen Lücke (auf dem Vorsorgeausweis unter "Maximaler Einkaufsbetrag"). Der Betrag ist vom steuerbaren Einkommen abzugsfähig – Steuerersparnis typisch 25-35% des Einkaufsbetrags. Danach gilt eine 3-Jahres-Sperrfrist für den Kapitalbezug.',
  'Wie viel 3a kann ich einzahlen?':
    'Mit Pensionskasse: max. CHF 7\'258 pro Jahr (2026). Ohne Pensionskasse: max. 20% des Nettoerwerbseinkommens, max. CHF 36\'288 pro Jahr. Der Betrag ist vollständig vom steuerbaren Einkommen abziehbar – ein direkter Steuervorteil.',
  'Was sind typische Ausgaben im Alter?':
    'Gemäss BFS (HABE 2022) gibt ein Rentner-Haushalt im Schnitt CHF 3\'381 pro Monat aus. Wohnen: CHF 1\'476, Gesundheit: CHF 615, Nahrung+Restaurants: CHF 1\'080. Im Ruhestand fallen Berufskosten weg, dafür steigen oft Gesundheits- und Freizeitkosten.',
  'Wie berechne ich meinen Bedarf?':
    'Als Faustregel gilt 80-90% des letzten Nettoeinkommens. Manche rechnen besser mit einem Budget: Was zahlt ihr jetzt, was fällt weg (Berufskosten, Hypothekar-Amortisation, Kinderkosten), was kommt dazu (mehr Freizeit, Gesundheit)? Dann habt ihr eine realistische Zahl.',
  'Was ändert sich bei den Ausgaben nach Pensionierung?':
    'Typisch fallen weg: Berufskosten (Fahrweg, Mittag, Kleider), Hypothekar-Amortisation, Sparbeiträge PK/3a, Kinderunterhalt. Dazu kommen können: mehr Ferien, Hobbies, Gesundheitskosten. Netto oft 15-20% weniger als vor der Pensionierung.',
  'Muss ich Steuern auf Renten zahlen?':
    'Ja: AHV-Renten und PK-Renten werden als Einkommen besteuert (100%). Aber das Gesamteinkommen im Alter ist meist tiefer als während der Erwerbsphase, daher auch die Steuerbelastung. Ein PK-Kapitalbezug wird mit einer separaten Kapitalbezugssteuer besteuert (einmalig, progressiv, kantonal).',
  'Was bedeutet dieser Score?':
    'Der Nachhaltigkeits-Score (0-100) misst, wie gut deine Vorsorge für das Alter gerüstet ist. Über 70: Gut aufgestellt. 45-70: Anpassungen sinnvoll. Unter 45: Dringende Massnahmen empfehlenswert. Er berücksichtigt Deckungsgrad und wie lange das Vermögen reicht.',
  'Wie wird das Vermögen berechnet?':
    'Die Projektion berechnet Jahr für Jahr: Erwerbseinkommen (bis Pension) minus Ausgaben = Sparbetrag. Ab Pension: Renten minus Ausgaben = Lücke, die aus dem Vermögen gedeckt wird. Das Vermögen wird jährlich mit der Anlagerendite verzinst und durch die Lücke reduziert.',
  'Was kann ich tun wenn das Geld nicht reicht?':
    'Die wirksamsten Hebel: (1) Etwas länger arbeiten (+2 Jahre = große Wirkung), (2) Ausgaben im Alter etwas reduzieren, (3) PK-Einkauf machen wenn noch Zeit ist, (4) 3a maximieren, (5) Anlagestrategie überprüfen. Kombination ist oft besser als eine Massnahme allein.',
  'Was ist eine Überbrückungsrente?':
    'Wenn Sie früher pensioniert werden als die AHV startet, benötigen Sie eine Überbrückung. Viele Pensionskassen bieten eine Überbrückungsrente an (für die Zeit bis 65). Alternativ: freies Vermögen, 3a-Bezug oder Kapitalanteil aus der PK. Fragen Sie unbedingt bei Ihrer Pensionskasse nach diesem Angebot.',
  'Was ist der Unterschied zwischen Rente und Kapital?':
    'Bei der Rente erhalten Sie monatliche Zahlungen lebenslang – unabhängig davon, wie alt Sie werden. Beim Kapitalbezug erhalten Sie das angesparte Guthaben auf einmal und verwalten es selbst. Die Rente bietet Planungssicherheit, der Kapitalbezug Flexibilität. Der Break-Even liegt je nach Umwandlungssatz und Renditeerwartung bei ca. 82–86 Jahren. Für viele ist ein Mix (Teilkapitalbezug) sinnvoll.',
  'Wie wirkt sich eine Frühpensionierung auf meine AHV aus?':
    'Eine Frühpensionierung hat zwei Effekte auf die AHV: (1) Jedes fehlende Beitragsjahr reduziert die Rente um 1/44 = ca. 2.27%. (2) Beim AHV-Vorbezug (frühestens ab 62) wird die Rente lebenslang um 6.8% pro Vorbezugsjahr gekürzt. Bei 3 Jahren Vorbezug sind das 20.4% weniger Rente – dauerhaft. Zudem müssen Selbstständige bis 65 weiterhin AHV-Beiträge zahlen, auch wenn sie schon pensioniert sind.',
  'Wie hoch ist meine voraussichtliche Vorsorgelücke?':
    'Ihre Vorsorgelücke ist die Differenz zwischen Ihren monatlichen Renteneinnahmen (AHV + PK + 3a) und Ihrem geplanten Budget im Alter. In der Analyse auf Schritt 4 sehen Sie diese Lücke konkret ausgewiesen. Ist sie negativ, wird sie in der Regel aus freiem Vermögen gedeckt – daher ist es wichtig zu prüfen, wie lange dieses Vermögen reicht.',
}

function getAutoResponse(question: string): string {
  const directMatch = PREPROGRAMMED[question]
  if (directMatch) return directMatch

  const q = question.toLowerCase()
  if (q.includes('ahv') && q.includes('plafon')) return PREPROGRAMMED['Was ist die AHV-Plafonierung?']
  if (q.includes('erziehung')) return PREPROGRAMMED['Was sind Erziehungsgutschriften?']
  if (q.includes('vorbezug') || (q.includes('frühpension') && q.includes('ahv'))) return PREPROGRAMMED['Wie wirkt sich eine Frühpensionierung auf meine AHV aus?']
  if (q.includes('frühpension') || q.includes('früh') && q.includes('pension')) return PREPROGRAMMED['Ab wann kann ich frühzeitig pensionieren?']
  if (q.includes('umwandlung')) return PREPROGRAMMED['Was ist ein guter Umwandlungssatz?']
  if (q.includes('einkauf')) return PREPROGRAMMED['Was ist ein PK-Einkauf?']
  if (q.includes('3a')) return PREPROGRAMMED['Wie viel 3a kann ich einzahlen?']
  if ((q.includes('unterschied') && (q.includes('rente') || q.includes('kapital'))) || (q.includes('rente') && q.includes('kapital'))) return PREPROGRAMMED['Was ist der Unterschied zwischen Rente und Kapital?']
  if (q.includes('kapital')) return PREPROGRAMMED['Soll ich PK-Kapital oder Rente beziehen?']
  if (q.includes('steuer')) return PREPROGRAMMED['Muss ich Steuern auf Renten zahlen?']
  if (q.includes('ausgaben') || q.includes('budget') || q.includes('kosten')) return PREPROGRAMMED['Was sind typische Ausgaben im Alter?']
  if (q.includes('überbrückung')) return PREPROGRAMMED['Was ist eine Überbrückungsrente?']
  if (q.includes('lücke') || q.includes('vorsorgelücke')) return PREPROGRAMMED['Wie hoch ist meine voraussichtliche Vorsorgelücke?']
  if (q.includes('score') || q.includes('bewertung') || q.includes('ergebnis')) return PREPROGRAMMED['Was bedeutet dieser Score?']

  return 'Das ist eine wichtige Frage. WealthWise gibt Ihnen eine fundierte Orientierung auf Basis offizieller Schweizer Vorsorgedaten. Für eine individuell verbindliche Antwort empfehle ich zusätzlich ein Gespräch mit einer unabhängigen Finanzplanerin oder einem Finanzplaner, die alle steuerlichen, rechtlichen und persönlichen Faktoren berücksichtigen können.'
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  type?: 'proactive' | 'warning' | 'answer'
  ts: number
  acknowledged?: boolean
}

interface Props {
  currentStep: StepKey
}

export default function ChatPanel({ currentStep }: Props) {
  const { person1, person2, hasPartner } = useStore()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [greeted, setGreeted] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const prevStepRef = useRef<StepKey | null>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, isTyping])

  useEffect(() => {
    if (!open || greeted || prevStepRef.current === currentStep) return
    prevStepRef.current = currentStep
    const greetings: Record<StepKey, string> = {
      situation: `Guten Tag. Ich unterstütze Sie bei Fragen rund um Ihre Vorsorge- und Pensionierungsplanung. Hier erfassen wir zunächst Ihre persönliche Ausgangslage. Was möchten Sie wissen?`,
      vorsorge: `Wir befassen uns nun mit Ihrer Vorsorgesituation – AHV, Pensionskasse und Säule 3a. Hier steckt oft das grösste Optimierungspotenzial. Stellen Sie mir gerne Ihre Fragen dazu.`,
      ausgaben: `In diesem Schritt erfassen wir Ihr geplantes Budget im Alter. Eine realistische Einschätzung der Ausgaben ist die Grundlage für eine belastbare Vorsorgeanalyse. Wie kann ich Ihnen helfen?`,
      analyse: `Hier sehen Sie das Ergebnis Ihrer persönlichen Vorsorgeanalyse. Ich erkläre Ihnen gerne die Berechnungsgrundlagen und was die Zahlen für Ihre Situation bedeuten.`,
    }
    setGreeted(true)
    setTimeout(() => {
      setIsTyping(true)
      setTimeout(() => {
        setIsTyping(false)
        setMessages((m) => [...m, {
          role: 'assistant',
          content: greetings[currentStep],
          type: 'proactive',
          ts: Date.now(),
        }])
      }, 1200)
    }, 800)
  }, [open, currentStep, greeted, hasPartner, person1.name])

  async function sendMessage(text: string) {
    if (!text.trim() || isTyping) return
    setMessages((m) => [...m, { role: 'user', content: text.trim(), ts: Date.now() }])
    setInput('')
    setIsTyping(true)
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 800))
    setIsTyping(false)
    const reply = getAutoResponse(text.trim())
    setMessages((m) => [...m, { role: 'assistant', content: reply, type: 'answer', ts: Date.now() }])
  }

  const quick = QUICK_QUESTIONS[currentStep] || []

  return (
    <>
      {!open && (
        <button className="ww-chat-fab" onClick={() => setOpen(true)} aria-label="Beratung öffnen">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Beratung</span>
          {messages.length > 0 && <span className="ww-chat-fab-dot" />}
        </button>
      )}

      {open && (
        <aside className="ww-chat-panel">
          <header className="ww-chat-head">
            <div className="ww-chat-head-left">
              <div className="ww-chat-avatar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div>
                <div className="ww-chat-title">Beratung</div>
                <div className="ww-chat-sub">{isTyping ? 'schreibt …' : 'online'}</div>
              </div>
            </div>
            <button className="ww-chat-close" onClick={() => setOpen(false)} aria-label="Schliessen">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <div className="ww-chat-body" ref={scrollRef}>
            {messages.length === 0 && !isTyping && (
              <div className="ww-chat-empty">
                <div className="ww-chat-empty-icon">💬</div>
                <div className="ww-chat-empty-title">Ich bin hier, falls du Fragen hast.</div>
                <div className="ww-chat-empty-sub">
                  Während du das Formular ausfüllst, beantworte ich Fragen zur Schweizer Vorsorge.
                </div>
              </div>
            )}

            {messages.map((m, i) => {
              if (m.role === 'user') {
                return (
                  <div key={i} className="ww-msg ww-msg-user">
                    <div className="ww-msg-bubble">{m.content}</div>
                  </div>
                )
              }
              if (m.type === 'proactive' || m.type === 'warning') {
                const isWarn = m.type === 'warning'
                return (
                  <div key={i} className={`ww-msg ww-msg-hint ${isWarn ? 'warn' : 'info'} ${m.acknowledged ? 'opacity-60' : ''}`}>
                    <div className="ww-msg-hint-head">
                      {isWarn ? '⚠️' : '💡'}
                      <span>{isWarn ? 'Achtung' : 'Hinweis'}</span>
                    </div>
                    <div className="ww-msg-hint-body">{m.content}</div>
                    {!m.acknowledged && (
                      <div className="ww-msg-hint-actions">
                        <button className="ww-hint-btn ghost" onClick={() => sendMessage('Kannst du mehr dazu sagen?')}>
                          Mehr erfahren
                        </button>
                        <button className="ww-hint-btn primary" onClick={() =>
                          setMessages((ms) => ms.map((msg, j) => j === i ? { ...msg, acknowledged: true } : msg))}>
                          Verstanden ✓
                        </button>
                      </div>
                    )}
                  </div>
                )
              }
              return (
                <div key={i} className="ww-msg ww-msg-assistant">
                  <div className="ww-msg-bubble">{m.content}</div>
                </div>
              )
            })}

            {isTyping && (
              <div className="ww-msg ww-msg-assistant ww-typing">
                <div className="ww-msg-bubble"><span /><span /><span /></div>
              </div>
            )}
          </div>

          {quick.length > 0 && (
            <div className="ww-chat-quick">
              {quick.map((q) => (
                <button key={q} className="ww-chat-quick-chip" onClick={() => sendMessage(q)} disabled={isTyping}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <form className="ww-chat-input" onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}>
            <input type="text" placeholder="Frage stellen …" value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping} aria-label="Nachricht" />
            <button type="submit" disabled={!input.trim() || isTyping}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>

          <footer className="ww-chat-foot">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            Unverbindliche Informationen, keine Finanzberatung.
          </footer>
        </aside>
      )}
    </>
  )
}
