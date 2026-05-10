// Official BVG 2026 values (BSV / Bundesamt für Sozialversicherungen)
export const BVG_2026 = {
  COORDINATION_DEDUCTION: 25725,  // Koordinationsabzug
  ENTRY_THRESHOLD: 22050,         // Eintrittsschwelle
  MAX_INSURED_SALARY: 88200,      // Obere Lohngrenze (= AHV-Max × 3)
  MIN_INTEREST_RATE: 0.0125,      // Mindestzinssatz BVG
  MIN_CONVERSION_RATE: 0.068,     // Mindestumwandlungssatz (obligat.)
  MAX_3A_WITH_PK: 7258,           // Max. Säule-3a-Einzahlung mit PK
  MAX_3A_WITHOUT_PK: 36288,       // Max. Säule-3a-Einzahlung ohne PK
} as const
