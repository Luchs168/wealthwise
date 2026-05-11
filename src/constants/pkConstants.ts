// Official BVG/AHV 2026 values (BSV / Bundesamt für Sozialversicherungen)
// Single source of truth — bvgConstants.ts merged here to avoid duplication
export const PK_CONSTANTS = {
  // Core BVG limits
  COORDINATION_DEDUCTION_2026: 25725,       // Koordinationsabzug
  ENTRY_THRESHOLD_2026: 22050,              // Eintrittsschwelle
  BVG_MAX_INSURED_SALARY: 88200,            // Obere Lohngrenze (= AHV-Max-Jahresrente 29'400 × 3)
  BVG_MIN_INTEREST_RATE: 0.0125,            // Mindestzinssatz BVG
  BVG_MIN_CONVERSION_RATE: 0.068,          // Mindestumwandlungssatz (obligat.)
  // Säule 3a limits
  MAX_3A_WITH_PK: 7258,                     // Max. Einzahlung mit PK-Anschluss
  MAX_3A_WITHOUT_PK: 36288,                 // Max. Einzahlung ohne PK-Anschluss
  // Conversion rate (überobligatorisch)
  DEFAULT_CONVERSION_RATE: 0.054,
  EARLY_RETIREMENT_CONVERSION_REDUCTION_PER_YEAR: 0.00175,
  EARLIEST_RETIREMENT_AGE: 58,
  BVG_CONTRIBUTION_RATES: [
    { ageFrom: 25, ageTo: 34, rate: 0.14 },
    { ageFrom: 35, ageTo: 44, rate: 0.21 },
    { ageFrom: 45, ageTo: 54, rate: 0.28 },
    { ageFrom: 55, ageTo: 65, rate: 0.35 },
  ] as { ageFrom: number; ageTo: number; rate: number }[],
}
