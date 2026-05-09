export const BRIDGING_CONSTANTS = {
  AHV_REGULAR_AGE: 65,
  AHV_EARLY_WITHDRAWAL_REDUCTION_PER_YEAR: 0.068,
  AHV_NON_EMPLOYED_MIN: 514,
  AHV_NON_EMPLOYED_MAX: 25700,
  // AHV non-employed: assessed wealth brackets (approximate 2026 table)
  // Assessment base = wealth + (pension income * 20)
  // Rate brackets: contribution = assessment_base / 50 (capped at min/max)
  AHV_NON_EMPLOYED_DIVISOR: 50,
  // PK early retirement reduction per year (typical, varies by fund)
  PK_EARLY_RETIREMENT_ACTUARIAL_REDUCTION_PER_YEAR: 0.04,
} as const
