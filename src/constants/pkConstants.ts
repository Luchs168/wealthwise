export const PK_CONSTANTS = {
  BVG_MIN_INTEREST_RATE: 0.0125,
  COORDINATION_DEDUCTION_2026: 25725,
  ENTRY_THRESHOLD_2026: 22050,
  BVG_MAX_INSURED_SALARY: 90720,
  BVG_MIN_CONVERSION_RATE: 0.068,
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
