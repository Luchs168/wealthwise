import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LifeEvent } from '../types/lifeEvents'

export type CivilStatus = 'ledig' | 'verheiratet' | 'partnerschaft' | 'geschieden' | 'verwitwet'
export type Gender = 'm' | 'f'
export type PkMode = 'manual' | 'estimate' | 'unknown'
export type Form3a = 'sparkonto' | 'wertschriften'

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
  yearly3a: number
  form3a: Form3a
  hasFZ: boolean
  fzBalance: number
  ahvContributionYears: number
  ahvContributionGaps: number
  ahvBezugAge: number
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
}

export interface ExpensesData {
  mode: 'simple' | 'detailed'
  simpleTotal: number
  detailed: Record<string, number>
  goal: '70' | '80' | '90' | 'custom'
  customAmount: number
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
  freeAssets: number
  property: PropertyData

  // Step 3
  expenses: ExpensesData

  // Tax
  kirchensteuer: boolean

  // Life events
  lifeEvents: LifeEvent[]

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
  setProperty: (p: Partial<PropertyData>) => void
  setExpenses: (e: Partial<ExpensesData>) => void
  setKirchensteuer: (v: boolean) => void
  addLifeEvent: (e: LifeEvent) => void
  updateLifeEvent: (id: string, patch: Partial<LifeEvent>) => void
  removeLifeEvent: (id: string) => void
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
    income: id === 1 ? 100000 : 80000,
    employmentGrade: 100,
    hasPK: true,
    pkMode: 'estimate',
    pkCapital: id === 1 ? 400000 : 250000,
    pkYearlyRente: 0,
    pkRate: 5.4,
    pkBezugsart: 'rente',
    pkKapitalanteil: 50,
    has3a: true,
    balance3a: id === 1 ? 50000 : 30000,
    yearly3a: 7258,
    form3a: 'sparkonto',
    hasFZ: false,
    fzBalance: 0,
    ahvContributionYears: 44,
    ahvContributionGaps: 0,
    ahvBezugAge: 65,
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
      property: { has: false, value: 0, mortgage: 0 },

      expenses: {
        mode: 'simple',
        simpleTotal: 0,
        detailed: {},
        goal: '80',
        customAmount: 0,
      },

      kirchensteuer: false,
      lifeEvents: [],

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
      setProperty: (p) => set((state) => ({ property: { ...state.property, ...p } })),
      setExpenses: (e) => set((state) => ({ expenses: { ...state.expenses, ...e } })),
      setKirchensteuer: (v) => set({ kirchensteuer: v }),
      addLifeEvent: (e) => set(state => ({ lifeEvents: [...state.lifeEvents, e] })),
      updateLifeEvent: (id, patch) =>
        set(state => ({
          lifeEvents: state.lifeEvents.map(e => e.id === id ? { ...e, ...patch } : e),
        })),
      removeLifeEvent: (id) => set(state => ({ lifeEvents: state.lifeEvents.filter(e => e.id !== id) })),
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
        property: { has: false, value: 0, mortgage: 0 },
        expenses: { mode: 'simple', simpleTotal: 0, detailed: {}, goal: '80', customAmount: 0 },
        kirchensteuer: false,
        lifeEvents: [],
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
    pillar3aAccounts: 3,
    hasPensionFund: vorsorge.hasPK,
    birthDate: base.dob,
  })

  const p1 = merge(person1, p1stored)
  const p2 = hasPartner ? merge(person2, p2stored) : null

  return { p1, p2, civilStatus, isPaar: hasPartner }
}
