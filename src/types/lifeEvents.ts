export type LifeEventCategory =
  | 'immobilie' | 'renovation' | 'hypothek' | 'auto' | 'reise'
  | 'ausbildung' | 'wohnung_kinder' | 'hochzeit' | 'scheidung'
  | 'erbschaft' | 'pflege' | 'selbstaendigkeit' | 'sabbatical'
  | 'teilzeit' | 'sonstiges'

export type LifeEventArt = 'ausgabe' | 'laufend' | 'einnahme'

export interface LifeEventDetails {
  // Immobilie
  kaufpreis?: number
  eigenkapital?: number
  pkVorbezug?: number
  vorbezug3a?: number
  hypothek?: number
  zinssatz?: number
  amortisationJahr?: number   // CHF/year amortisation
  mietEntfaellt?: boolean     // rent eliminated after purchase
  // Teilzeit
  neuerGrad?: number
  // Custom label
  customLabel?: string
}

export type LifeEventType = 'einmalig' | 'wiederkehrend' | 'einkommensaenderung'

export interface LifeEvent {
  id: string
  category: LifeEventCategory
  year: number
  amount: number
  art: LifeEventArt
  duration: number
  enabled: boolean
  details: LifeEventDetails
  eventType?: LifeEventType
  fromAge?: number
  toAge?: number
  intervalYears?: number
  pensum?: number
}

export interface CategoryConfig {
  label: string
  icon: string
  defaultAmount: number
  defaultArt: LifeEventArt
  defaultDuration: number
  hint: string
  complex?: boolean
}

export const CATEGORY_CONFIG: Record<LifeEventCategory, CategoryConfig> = {
  immobilie: {
    label: 'Immobilienkauf',
    icon: '🏠',
    defaultAmount: 200000,
    defaultArt: 'ausgabe',
    defaultDuration: 0,
    hint: 'Eigenkapital-Anteil (Anzahlung), exkl. Hypothek',
    complex: true,
  },
  renovation: {
    label: 'Renovation / Umbau',
    icon: '🔨',
    defaultAmount: 80000,
    defaultArt: 'ausgabe',
    defaultDuration: 0,
    hint: 'Gesamtkosten der Renovation oder des Umbaus',
  },
  hypothek: {
    label: 'Hypothek amortisieren',
    icon: '🏦',
    defaultAmount: 100000,
    defaultArt: 'ausgabe',
    defaultDuration: 0,
    hint: 'Direkte Rückzahlung der bestehenden Hypothek',
  },
  auto: {
    label: 'Auto kaufen',
    icon: '🚗',
    defaultAmount: 45000,
    defaultArt: 'ausgabe',
    defaultDuration: 0,
    hint: 'Fahrzeugkauf inkl. Nebenkosten',
  },
  reise: {
    label: 'Weltreise / grosse Reise',
    icon: '✈️',
    defaultAmount: 40000,
    defaultArt: 'ausgabe',
    defaultDuration: 0,
    hint: 'Längere Reise oder Auslandsaufenthalt',
  },
  ausbildung: {
    label: 'Kinder: Ausbildung / Studium',
    icon: '🎓',
    defaultAmount: 20000,
    defaultArt: 'laufend',
    defaultDuration: 4,
    hint: 'Jährliche Ausbildungskosten pro Kind',
  },
  wohnung_kinder: {
    label: 'Kinder: Wohnungshilfe',
    icon: '🔑',
    defaultAmount: 60000,
    defaultArt: 'ausgabe',
    defaultDuration: 0,
    hint: 'Einmalige Unterstützung beim Wohnungskauf/-miete',
  },
  hochzeit: {
    label: 'Hochzeit',
    icon: '💍',
    defaultAmount: 40000,
    defaultArt: 'ausgabe',
    defaultDuration: 0,
    hint: 'Hochzeitskosten (eigene oder Kinder)',
  },
  scheidung: {
    label: 'Scheidung',
    icon: '⚖️',
    defaultAmount: 50000,
    defaultArt: 'ausgabe',
    defaultDuration: 0,
    hint: 'Anwaltskosten + geschätzte Vermögensteilung',
    complex: true,
  },
  erbschaft: {
    label: 'Erbschaft erwartet',
    icon: '📜',
    defaultAmount: 100000,
    defaultArt: 'einnahme',
    defaultDuration: 0,
    hint: 'Unsicherer Zufluss – nur im optimistischen Szenario',
    complex: true,
  },
  pflege: {
    label: 'Pflege Eltern',
    icon: '🏥',
    defaultAmount: 36000,
    defaultArt: 'laufend',
    defaultDuration: 3,
    hint: 'Jährlicher Pflegebeitrag oder Heimkosten',
  },
  selbstaendigkeit: {
    label: 'Selbständigkeit / Startup',
    icon: '💼',
    defaultAmount: 80000,
    defaultArt: 'ausgabe',
    defaultDuration: 0,
    hint: 'Startkapital und Anfangsinvestitionen',
  },
  sabbatical: {
    label: 'Sabbatical / Auszeit',
    icon: '🌴',
    defaultAmount: 50000,
    defaultArt: 'ausgabe',
    defaultDuration: 0,
    hint: 'Lebenshaltungskosten + entgangenes Einkommen',
  },
  teilzeit: {
    label: 'Teilzeitreduktion',
    icon: '⏰',
    defaultAmount: 15000,
    defaultArt: 'laufend',
    defaultDuration: 7,
    hint: 'Jährliche Einkommensreduktion durch Teilzeit',
    complex: true,
  },
  sonstiges: {
    label: 'Sonstiges',
    icon: '✏️',
    defaultAmount: 10000,
    defaultArt: 'ausgabe',
    defaultDuration: 0,
    hint: 'Eigene Bezeichnung und Betrag',
  },
}

export const CATEGORIES_ORDERED: LifeEventCategory[] = [
  'immobilie', 'renovation', 'hypothek', 'auto', 'reise',
  'ausbildung', 'wohnung_kinder', 'hochzeit', 'scheidung',
  'erbschaft', 'pflege', 'selbstaendigkeit', 'sabbatical', 'teilzeit', 'sonstiges',
]
