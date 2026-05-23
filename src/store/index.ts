import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LifeEvent } from '../types/lifeEvents'

export type CivilStatus = 'ledig' | 'verheiratet' | 'partnerschaft' | 'geschieden' | 'verwitwet'
export type Gender = 'm' | 'f'
export type PkMode = 'manual' | 'estimate' | 'unknown'
export type Form3a = 'sparkonto' | 'wertschriften' | 'wertschriften_konservativ' | 'wertschriften_ausgewogen' | 'wertschriften_aggressiv'

export interface PersonBase {
  name: string
  dob: string
  sex: Gender | ''
  civil: CivilStatus
  retireAge: number
}

export interface PersonVorsorge {
  id: 1 | 2
  status: 'erwerb' | 'pension'
  income: number
  employmentGrade: number
  hasPK: boolean
  pkMode: PkMode
  pkCapital: number
  pkYearlyRente: number
  pkRate: number
  pkBezugsart: 'rente' | 'kapital' | 'mix'
  pkKapitalanteil: number
  has3a: boolean
  balance3a: number
  num3aAccounts: number
  yearly3a: number
  form3a: Form3a
  hasFZ: boolean
  fzBalance: number
  ahvContributionYears: number
  ahvContributionGaps: number
  ahvBezugAge: number
  // KZG (Kinderziehungsgutschriften)
  hasKZG: boolean
  kzgChildren: number
  kzgYears: number
  // PK enhanced fields
  pkCurrentCapital: number      // today's actual balance (0 = not entered)
  pkAnnualContribution: number  // total annual contribution AN+AG (0 = auto-estimate)
  pkInterestRate: number        // PK interest rate (default 0.0125)
  pkObligatorisch: number       // mandatory portion of capital (0 = unknown)
  pkMaxGuthaben: number         // max regulatory capital for buy-in calc (0 = unknown)
  pkRetirementTable?: Record<number, { agh: number; uws: number; renteMonat: number }>
  pkLastPurchaseYear?: number   // year of most recent PK Einkauf (for 3-year Sperrfrist)
  pkLastPurchaseAmount?: number // amount of most recent PK Einkauf
  pkVorbezugAmount?: number      // CHF amount of PK withdrawal (WEF or divorce)
  pkVorbezugYear?: number        // year of withdrawal
  pkVorbezugGrund?: 'wef' | 'scheidung'  // reason for withdrawal
  // AHV: user-overridden average lifetime income (MDJ); if undefined, falls back to income
  ahvAvgIncome?: number
  // Scheidungsdetails (optional, nur relevant wenn civil = 'geschieden')
  divorcePkSplitting?: 'ja' | 'nein' | 'weiss_nicht'
  divorceAhvSplitting?: 'ja' | 'nein' | 'weiss_nicht'
  alimenteMonthly?: number
  alimenteUnbefristet?: boolean
  alimenteUntilAge?: number
  // Erwerbsstatus
  employmentStatus?: 'employed' | 'selfEmployed'
  // Firmenwert (nur relevant wenn selfEmployed)
  businessValue?: number       // Geschätzter Nettoerlös nach Steuern
  businessSaleYear?: number    // Geplantes Verkaufsjahr (z.B. 2031)
  // Migration / internationale Vorsorge
  immigrationYear?: number     // Jahr des Einzugs in die Schweiz (leer = seit Geburt / vor 21)
  partnerCoveredGaps?: boolean // Lücken durch Beitragsbefreiung des Ehepartners gedeckt
  foreignPensionMonthly?: number // Monatliche Rente aus Herkunftsland (CHF)
  // Kinder in Ausbildung (AHV-Kinderrente)
  hasChildInTraining?: boolean  // Mindestens ein Kind 18-25 in Ausbildung
  // Bonus / variables Einkommen
  bonusIncome?: number
  // 3a individual account balances
  accounts3a?: number[]
  // FZ investment type
  fzInvestmentType?: 'sparkonto' | 'wertschriften_konservativ' | 'wertschriften_ausgewogen' | 'wertschriften_aggressiv'
}

export type Person = PersonBase & PersonVorsorge & { id: 1 | 2 }

export interface LocationData {
  plz: string
  ort: string
  gemeinde: string
  kanton: string
}

export interface ChildData {
  year: string
}

export interface PropertyData {
  has: boolean
  value: number
  mortgage: number
  steuerwert: number          // Steuerwert der Liegenschaft (≈70% Marktwert)
  hypothekZinssatz: number    // Hypothekarzinssatz in % (z.B. 1.5)
  amortisationYearly?: number // Jährliche Amortisation (Rückzahlung, CHF)
  amortisationYears?: number  // Verbleibende Laufzeit der Amortisation (Jahre)
  hypothekarmodell?: 'fest' | 'saron' | 'gemischt'
}

export interface ExpensesData {
  mode: 'simple' | 'detailed'
  simpleTotal: number
  detailed: Record<string, number>
  goal: '70' | '80' | '90' | 'custom'
  customAmount: number
  kkPremium1: number
  kkPremium2: number
  kkFranchise: number
}

export interface WealthWiseState {
  // Step 1
  selectedGoal: string
  civilStatus: CivilStatus
  person1: PersonBase & { id: 1 }
  person2: PersonBase & { id: 2 }
  hasPartner: boolean
  location: LocationData | null
  hasChildren: boolean
  children: ChildData[]

  // Step 2 (persons array with vorsorge data)
  persons: Person[]
  freeAssets: number      // = sparkonto + wertschriften (auto-computed)
  sparkonto: number       // liquid savings (Sparkonto, Bargeld)
  wertschriften: number   // investments (Wertschriften, Anlagen)
  cryptoAssets: number
  property: PropertyData

  // Step 3
  expenses: ExpensesData

  // Tax
  kirchensteuer: boolean

  // Wertschriften investment profile (separate from riskProfile)
  wealthInvestmentProfile: 'konto' | 'conservative' | 'balanced' | 'growth' | 'aggressive'

  // Risk profile / Anlagestrategie
  riskProfile: 'conservative' | 'balanced' | 'growth'

  // Life events
  lifeEvents: LifeEvent[]

  // Touched flags — true only when user has actively entered a value (not defaults)
  ahvTouched: boolean
  pkTouched: boolean
  pillar3aTouched: boolean
  wealthTouched: boolean

  // Savings strategy (Screen 3A)
  savingsStrategy: 'sparkonto' | 'konservativ' | 'ausgewogen' | 'aggressiv'
  monthlySavingsAmount: number   // monthly CHF to invest (only for 'teilweise')

  // Screen 4 decisions (gate the PDF download)
  ahvChoice: 'vorbezug2' | 'vorbezug1' | 'ordentlich' | 'aufschub1' | 'aufschub2' | null
  pkChoice: 'rente' | 'kapital' | 'mix' | null
  pkMixPercent: number   // 0-100, only relevant when pkChoice === 'mix'
  withdrawalStrategy: 'verzehr90' | 'verzehr95' | 'kapitalerhalt' | null

  // Actions
  setGoal: (g: string) => void
  setCivilStatus: (s: CivilStatus) => void
  setPerson1: (p: Partial<PersonBase>) => void
  setPerson2: (p: Partial<PersonBase>) => void
  setHasPartner: (v: boolean) => void
  setLocation: (l: LocationData | null) => void
  setHasChildren: (v: boolean) => void
  setChildren: (c: ChildData[]) => void
  updatePerson: (id: 1 | 2, patch: Partial<Person>) => void
  setFreeAssets: (v: number) => void
  setSparkonto: (v: number) => void
  setWertschriften: (v: number) => void
  setCryptoAssets: (v: number) => void
  setProperty: (p: Partial<PropertyData>) => void
  setExpenses: (e: Partial<ExpensesData>) => void
  setKirchensteuer: (v: boolean) => void
  setWealthInvestmentProfile: (v: WealthWiseState['wealthInvestmentProfile']) => void
  setRiskProfile: (v: 'conservative' | 'balanced' | 'growth') => void
  addLifeEvent: (e: LifeEvent) => void
  updateLifeEvent: (id: string, patch: Partial<LifeEvent>) => void
  removeLifeEvent: (id: string) => void
  setAhvTouched: (v: boolean) => void
  setPkTouched: (v: boolean) => void
  setPillar3aTouched: (v: boolean) => void
  setWealthTouched: (v: boolean) => void
  setSavingsStrategy: (v: WealthWiseState['savingsStrategy']) => void
  setMonthlySavingsAmount: (v: number) => void
  setAhvChoice: (v: WealthWiseState['ahvChoice']) => void
  setPkChoice: (v: WealthWiseState['pkChoice']) => void
  setPkMixPercent: (v: number) => void
  setWithdrawalStrategy: (v: WealthWiseState['withdrawalStrategy']) => void
  resetStore: () => void
}

const defaultPerson1Base: PersonBase & { id: 1 } = {
  id: 1,
  name: '',
  dob: '',
  sex: '',
  civil: 'ledig',
  retireAge: 65,
}

const defaultPerson2Base: PersonBase & { id: 2 } = {
  id: 2,
  name: '',
  dob: '',
  sex: '',
  civil: 'ledig',
  retireAge: 65,
}

function defaultVorsorge(id: 1 | 2): PersonVorsorge {
  return {
    id,
    status: 'erwerb',
    income: 0,
    employmentGrade: 100,
    hasPK: false,
    pkMode: 'estimate',
    pkCapital: 0,
    pkYearlyRente: 0,
    pkRate: 5.4,
    pkBezugsart: 'rente',
    pkKapitalanteil: 50,
    has3a: false,
    balance3a: 0,
    num3aAccounts: 1,
    yearly3a: 0,
    form3a: 'sparkonto',
    hasFZ: false,
    fzBalance: 0,
    accounts3a: undefined,
    ahvContributionYears: 44,
    ahvContributionGaps: 0,
    ahvBezugAge: 65,
    hasKZG: false,
    kzgChildren: 0,
    kzgYears: 0,
    pkCurrentCapital: 0,
    pkAnnualContribution: 0,
    pkInterestRate: 0.0125,
    pkObligatorisch: 0,
    pkMaxGuthaben: 0,
  }
}

export const useStore = create<WealthWiseState>()(
  persist(
    (set) => ({
      selectedGoal: 'rente',
      civilStatus: 'ledig',
      person1: { ...defaultPerson1Base },
      person2: { ...defaultPerson2Base },
      hasPartner: false,
      location: null,
      hasChildren: false,
      children: [],

      persons: [
        { ...defaultPerson1Base, ...defaultVorsorge(1) },
        { ...defaultPerson2Base, ...defaultVorsorge(2) },
      ],
      freeAssets: 0,
      sparkonto: 0,
      wertschriften: 0,
      cryptoAssets: 0,
      property: { has: false, value: 0, mortgage: 0, steuerwert: 0, hypothekZinssatz: 1.5 },

      expenses: {
        mode: 'simple',
        simpleTotal: 0,
        detailed: {},
        goal: '80',
        customAmount: 0,
        kkPremium1: 0,
        kkPremium2: 0,
        kkFranchise: 300,
      },

      kirchensteuer: false,
      wealthInvestmentProfile: 'balanced',
      riskProfile: 'balanced',
      lifeEvents: [],

      ahvTouched: false,
      pkTouched: false,
      pillar3aTouched: false,
      wealthTouched: false,

      savingsStrategy: 'ausgewogen',
      monthlySavingsAmount: 0,

      ahvChoice: null,
      pkChoice: null,
      pkMixPercent: 50,
      withdrawalStrategy: null,

      setGoal: (g) => set({ selectedGoal: g }),
      setCivilStatus: (s) => set({ civilStatus: s }),
      setPerson1: (p) => set((state) => ({ person1: { ...state.person1, ...p } })),
      setPerson2: (p) => set((state) => ({ person2: { ...state.person2, ...p } })),
      setHasPartner: (v) => set({ hasPartner: v }),
      setLocation: (l) => set({ location: l }),
      setHasChildren: (v) => set({ hasChildren: v }),
      setChildren: (c) => set({ children: c }),
      updatePerson: (id, patch) =>
        set((state) => ({
          persons: state.persons.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      setFreeAssets: (v) => set({ freeAssets: v }),
      setSparkonto: (v) => set((state) => ({ sparkonto: v, freeAssets: v + state.wertschriften })),
      setWertschriften: (v) => set((state) => ({ wertschriften: v, freeAssets: state.sparkonto + v })),
      setCryptoAssets: (v) => set({ cryptoAssets: v }),
      setProperty: (p) => set((state) => ({ property: { ...state.property, ...p } })),
      setExpenses: (e) => set((state) => ({ expenses: { ...state.expenses, ...e } })),
      setKirchensteuer: (v) => set({ kirchensteuer: v }),
      setWealthInvestmentProfile: (v) => set({ wealthInvestmentProfile: v }),
      setRiskProfile: (v) => set({ riskProfile: v }),
      addLifeEvent: (e) => set(state => ({ lifeEvents: [...state.lifeEvents, e] })),
      updateLifeEvent: (id, patch) =>
        set(state => ({
          lifeEvents: state.lifeEvents.map(e => e.id === id ? { ...e, ...patch } : e),
        })),
      removeLifeEvent: (id) => set(state => ({ lifeEvents: state.lifeEvents.filter(e => e.id !== id) })),
      setAhvTouched: (v) => set({ ahvTouched: v }),
      setPkTouched: (v) => set({ pkTouched: v }),
      setPillar3aTouched: (v) => set({ pillar3aTouched: v }),
      setWealthTouched: (v) => set({ wealthTouched: v }),
      setSavingsStrategy: (v) => set({ savingsStrategy: v }),
      setMonthlySavingsAmount: (v) => set({ monthlySavingsAmount: v }),
      setAhvChoice: (v) => set({ ahvChoice: v }),
      setPkChoice: (v) => set({ pkChoice: v }),
      setPkMixPercent: (v) => set({ pkMixPercent: v }),
      setWithdrawalStrategy: (v) => set({ withdrawalStrategy: v }),
      resetStore: () => set({
        selectedGoal: 'rente',
        civilStatus: 'ledig',
        person1: { ...defaultPerson1Base },
        person2: { ...defaultPerson2Base },
        hasPartner: false,
        location: null,
        hasChildren: false,
        children: [],
        persons: [
          { ...defaultPerson1Base, ...defaultVorsorge(1) },
          { ...defaultPerson2Base, ...defaultVorsorge(2) },
        ],
        freeAssets: 0,
        sparkonto: 0,
        wertschriften: 0,
        cryptoAssets: 0,
        property: { has: false, value: 0, mortgage: 0, steuerwert: 0, hypothekZinssatz: 1.5 },
        expenses: { mode: 'simple', simpleTotal: 0, detailed: {}, goal: '80', customAmount: 0, kkPremium1: 0, kkPremium2: 0, kkFranchise: 300 },
        kirchensteuer: false,
        wealthInvestmentProfile: 'balanced',
        riskProfile: 'balanced',
        lifeEvents: [],
        ahvTouched: false,
        pkTouched: false,
        pillar3aTouched: false,
        wealthTouched: false,
        savingsStrategy: 'ausgewogen',
        monthlySavingsAmount: 0,
        ahvChoice: null,
        pkChoice: null,
        pkMixPercent: 50,
        withdrawalStrategy: null,
      }),
    }),
    {
      name: 'wealthwise.v1',
      version: 1,
    }
  )
)

// Derived helpers
export function getPersonsForCalc(state: WealthWiseState) {
  const { persons, person1, person2, hasPartner, civilStatus } = state
  const p1stored = persons.find((p) => p.id === 1) || persons[0]
  const p2stored = persons.find((p) => p.id === 2) || persons[1]

  const merge = (base: PersonBase & { id: 1 | 2 }, vorsorge: Person) => ({
    ...vorsorge,
    name: base.name || vorsorge.name,
    dob: base.dob || vorsorge.dob,
    sex: base.sex || vorsorge.sex,
    civil: base.civil || vorsorge.civil,
    retireAge: base.retireAge || vorsorge.retireAge,
    retirementAge: base.retireAge || vorsorge.retireAge,
    gender: base.sex || vorsorge.sex,
    grossIncome: vorsorge.income,
    pkCapitalAt65: vorsorge.pkCapital,
    pkConversionRate: vorsorge.pkRate,
    pillar3aBalance: vorsorge.balance3a,
    pillar3aAccounts: vorsorge.num3aAccounts || 1,
    hasPensionFund: vorsorge.hasPK,
    birthDate: base.dob,
  })

  const p1 = merge(person1, p1stored)
  const p2 = hasPartner ? merge(person2, p2stored) : null

  return { p1, p2, civilStatus, isPaar: hasPartner }
}
