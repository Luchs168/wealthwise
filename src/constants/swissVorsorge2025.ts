/**
 * Schweizer Vorsorgesystem – Zentrale Kennzahlen 2025
 *
 * Quelle: ZHAW School of Management and Law, Abteilung Banking, Finance, Insurance
 *         "Vorsorgesystem Schweiz – Update 2025"
 *         (Formelsammlung / Kennzahlenwerk, Januar 2025)
 *
 * Dieses File ist die EINZIGE Quelle für alle Vorsorge-Kennzahlen in dieser Applikation.
 * Alle anderen Konstanten-Dateien importieren aus diesem File.
 *
 * Hinweis: Da der aktuelle Kalenderjahr 2026 ist, die nächste offizielle
 * ZHAW-Ausgabe aber noch nicht erschienen ist, gelten die 2025-Werte als
 * beste verfügbare Approximation. Die Werte sind identisch für 2025.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. AHV / IV  (Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 5–18)
// ─────────────────────────────────────────────────────────────────────────────

/** AHV-Beitragssätze 2025 (S. 5–6) */
export const AHV_BEITRAEGE_2025 = {
  /** Unselbständige: AHV 8.7% + IV 1.4% + EO 0.5% = total 10.6% (je AG+AN = 5.3% je) */
  SATZ_UNSELBSTAENDIG_TOTAL: 0.106,
  SATZ_UNSELBSTAENDIG_AN: 0.053,   // Arbeitnehmer-Anteil
  SATZ_UNSELBSTAENDIG_AG: 0.053,   // Arbeitgeber-Anteil
  SATZ_AHV: 0.087,
  SATZ_IV: 0.014,
  SATZ_EO: 0.005,

  /** Selbständigerwerbende: sinkende Skala 5.371%–10.0% (S. 7) */
  SATZ_SE_MIN: 0.05371,            // ab CHF 10'100 Einkommen
  SATZ_SE_MAX: 0.10000,            // ab CHF 60'500 Einkommen
  SATZ_SE_OBERE_GRENZE: 60500,     // Einkommen ab hier: Fixsatz 10.0%
  SATZ_SE_UNTERE_GRENZE: 10100,    // Einkommen ab hier: Fixsatz 5.371%

  /** ALV (Arbeitslosenversicherung): je 1.1% AN+AG = total 2.2% (S. 6) */
  SATZ_ALV_TOTAL: 0.022,
  SATZ_ALV_AN: 0.011,
  SATZ_ALV_AG: 0.011,
  ALV_MAX_LOHN: 148200,            // Maximaler AHV-Lohn für ALV

  /** Mindest- und Maximalbeiträge (S. 6, 8–9) */
  MINDESTBEITRAG: 530,             // CHF pro Jahr (Personen und Nichterwerbstätige)
  MAXIMALBEITRAG_NET: 26500,       // CHF pro Jahr Nichterwerbstätige (Vermögenssumme > 8'950'000)
  MINDESTBEITRAG_FREIWILLIG: 1010, // Freiwillige Versicherung
  MAXIMALBEITRAG_FREIWILLIG: 25250, // Freiwillige Versicherung

  /** Freibetrag AHV-Rentner:innen bei Erwerbstätigkeit (S. 10) */
  FREIBETRAG_RENTNER_MONATLICH: 1400,
  FREIBETRAG_RENTNER_JAEHRLICH: 16800,

  /** Nichterwerbstätige: Basis = Vermögen + 20 × Renteneinkommen (S. 8–9) */
  VERMOEGEN_FREIBETRAG: 340000,    // Vermögenssumme unter diesem Betrag → Mindestbeitrag
  VERMOEGEN_MAX: 8950000,          // Vermögenssumme ab hier → Maximalbeitrag
  VERMOEGEN_RUNDEN_AUF: 50000,     // Abrunden auf nächstes Vielfaches von CHF 50'000

  /** Minimaleinkommen im IK-Auszug 2025–2026 (S. 6) */
  IK_MIN_UNSELBSTAENDIG: 5000,
  IK_MIN_NICHTERWERBSTAETIG: 10000,
} as const

/** AHV-Rentenparameter 2025 – Rentenskala 44 (S. 11–13) */
export const AHV_RENTEN_2025 = {
  /** Minimale/Maximale Monatsrenten (Vollrente Skala 44) */
  MIN_MONATSRENTE: 1260,           // CHF/Monat (= 15'120 CHF/Jahr)
  MAX_MONATSRENTE: 2520,           // CHF/Monat (= 30'240 CHF/Jahr)
  MIN_JAHRESRENTE: 15120,
  MAX_JAHRESRENTE: 30240,

  /** Plafonierung Ehegatten: max. 150% der vollen Einzelrente (S. 11, 13) */
  PLAFOND_MONATLICH: 3780,         // CHF/Monat für Ehepaare (= 150% von 2'520)
  PLAFOND_JAEHRLICH: 45360,        // CHF/Jahr

  /** Witwen-/Witwerrente: 80% der Stammrente (S. 11) */
  WITWEN_FAKTOR: 0.80,
  MAX_WITWENRENTE_MONATLICH: 2016, // 80% × 2'520
  MAX_WITWENRENTE_JAEHRLICH: 24192,
  MIN_WITWENRENTE_JAEHRLICH: 12096,

  /** Kinderrente / Waisenrente: 40% (S. 11) */
  KINDER_FAKTOR: 0.40,
  MAX_KINDERRENTE_JAEHRLICH: 12096,
  MIN_KINDERRENTE_JAEHRLICH: 6048,
  MAX_KINDERRENTEN_PLAFOND: 18144, // 150% × 40%

  /** Verwitwetenzuschlag: 20% (S. 11) */
  VERWITWETENZUSCHLAG_FAKTOR: 0.20,
  MAX_VERWITWETENZUSCHLAG_JAEHRLICH: 6048,
  MIN_VERWITWETENZUSCHLAG_JAEHRLICH: 3024,

  /** Referenz-/Rentenalter (S. 10, 17–18, Reform AHV 21) */
  REFERENZALTER_MAENNER: 65,
  REFERENZALTER_FRAUEN_AB_JG_1964: 65,  // vollständig ab 2028
  VORBEZUG_FRUEHESTENS: 63,        // ab 63 (Reform AHV 21)
  AUFSCHUB_SPAETESTENS: 70,
  BEITRAGSJAHRE_VOLLRENTE: 44,     // Männer und Frauen (ab 2028)

  /** Massgebendes durchschnittliches Jahreseinkommen (MDJ) für Rentenskala */
  MDJ_MIN: 15120,                  // Einkommen bis hierher → Minimalrente
  MDJ_MAX: 90720,                  // Einkommen ab hierher → Maximalrente

  /** Erziehungs- und Betreuungsgutschriften (EG/BG) (S. 14) */
  ERZIEHUNGSGUTSCHRIFT_JAEHRLICH: 45360, // = 150% der max. Einzelrente = 3 × 15'120
  EG_MAX_KINDER_PRO_YEAR: 1,       // max. eine Gutschrift pro Beitragsjahr
  EG_KINDER_BIS_ALTER: 16,         // EG für Kinder bis 16. Lebensjahr
  EG_MAX_PRO_KIND: 16,             // maximal 16 Gutschriften pro Kind
  EG_SPLITTING_VERHEIRATET: 0.5,   // bei Ehe je zur Hälfte

  /** Aufwertungsfaktoren für IK-Einträge (S. 14) */
  ERSTER_IK_EINTRAG_MIN_ALTER: 21, // Frühester anrechenbarer IK-Eintrag
} as const

/**
 * AHV Vorbezug / Aufschub Faktoren (S. 10)
 * Quelle: ZHAW Update 2025 + BSV Aktuarielle Tabellen
 * Vorbezug: −6.8% pro Jahr früher; Aufschub: +5.2%/10.8%/17.1%/24.0%/31.5%
 */
export const AHV_BEZUG_FAKTOREN_2025: Record<number, number> = {
  63: 0.864,   // 2 Jahre Vorbezug: −13.6% (= 2 × 6.8%)
  64: 0.932,   // 1 Jahr Vorbezug: −6.8%
  65: 1.000,   // Referenzalter (ohne Zu-/Abschlag)
  66: 1.052,   // 1 Jahr Aufschub: +5.2% (ZHAW S. 10: 0–2 Monate)
  67: 1.106,   // 2 Jahre Aufschub: +10.6%
  68: 1.163,   // 3 Jahre Aufschub: +16.3%
  69: 1.224,   // 4 Jahre Aufschub: +22.4%
  70: 1.313,   // 5 Jahre Aufschub: +31.3%
}

/**
 * AHV Rentenskala 44 (vollständige Tabelle, gültig ab 1. Januar 2025)
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 13
 * Format: [massgebendes durchschnittliches Jahreseinkommen (MDJ), monatliche Vollrente CHF]
 * Interpolation: linear zwischen den Tabellenwerten
 */
export const AHV_RENTENSKALA_44_2025: ReadonlyArray<readonly [number, number]> = [
  [0,     1260], // bis CHF 15'120 → Minimalrente
  [15120, 1260],
  [16632, 1293],
  [18144, 1326],
  [19656, 1358],
  [21168, 1391],
  [22680, 1424],
  [24192, 1457],
  [25704, 1489],
  [27216, 1522],
  [28728, 1555],
  [30240, 1588],
  [31752, 1620],
  [33264, 1653],
  [34776, 1686],
  [36288, 1719],
  [37800, 1751],
  [39312, 1784],
  [40824, 1817],
  [42336, 1850],
  [43848, 1882],
  [45360, 1915],
  [46872, 1935],
  [48384, 1956],
  [49896, 1976],
  [51408, 1996],
  [52920, 2016],
  [54432, 2036],
  [55944, 2056],
  [57456, 2076],
  [58968, 2097],
  [60480, 2117],
  [61992, 2137],
  [63504, 2157],
  [65016, 2177],
  [66528, 2197],
  [68040, 2218],
  [69552, 2238],
  [71064, 2258],
  [72576, 2278],
  [74088, 2298],
  [75600, 2318],
  [77112, 2339],
  [78624, 2359],
  [80136, 2379],
  [81648, 2399],
  [83160, 2419],
  [84672, 2439],
  [86184, 2460],
  [87696, 2480],
  [89208, 2500],
  [90720, 2520], // ab CHF 90'720 → Maximalrente
] as const

/**
 * Gestaffelte Beitragssätze Selbständigerwerbende 2025 (S. 7)
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 7
 */
export const AHV_SE_BEITRAGSSKALA_2025: ReadonlyArray<{
  von: number; bis: number; satz: number
}> = [
  { von: 10100, bis: 17600, satz: 0.05371 },
  { von: 17600, bis: 23000, satz: 0.05494 },
  { von: 23000, bis: 25500, satz: 0.05617 },
  { von: 25500, bis: 28000, satz: 0.05741 },
  { von: 28000, bis: 30500, satz: 0.05864 },
  { von: 30500, bis: 33000, satz: 0.05987 },
  { von: 33000, bis: 35500, satz: 0.06235 },
  { von: 35500, bis: 38000, satz: 0.06481 },
  { von: 38000, bis: 40500, satz: 0.06728 },
  { von: 40500, bis: 43000, satz: 0.06976 },
  { von: 43000, bis: 45500, satz: 0.07222 },
  { von: 45500, bis: 48000, satz: 0.07469 },
  { von: 48000, bis: 50500, satz: 0.07840 },
  { von: 50500, bis: 53000, satz: 0.08209 },
  { von: 53000, bis: 55500, satz: 0.08580 },
  { von: 55500, bis: 58000, satz: 0.08951 },
  { von: 58000, bis: 60500, satz: 0.09321 },
  { von: 60500, bis: Infinity, satz: 0.10000 },
] as const

/**
 * Karrierezuschlag für Hinterlassenenleistungen (S. 16)
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 16
 * Gilt wenn Verstorbene:r bei Tod das 45. Altersjahr noch nicht erreicht hat.
 */
export const AHV_KARRIEREZUSCHLAG_2025: ReadonlyArray<{
  nachAlter: number; vorAlter: number; prozent: number
}> = [
  { nachAlter: 0,  vorAlter: 23, prozent: 100 },
  { nachAlter: 23, vorAlter: 24, prozent: 90 },
  { nachAlter: 24, vorAlter: 25, prozent: 80 },
  { nachAlter: 25, vorAlter: 26, prozent: 70 },
  { nachAlter: 26, vorAlter: 27, prozent: 60 },
  { nachAlter: 27, vorAlter: 28, prozent: 50 },
  { nachAlter: 28, vorAlter: 30, prozent: 40 },
  { nachAlter: 30, vorAlter: 32, prozent: 30 },
  { nachAlter: 32, vorAlter: 35, prozent: 20 },
  { nachAlter: 35, vorAlter: 39, prozent: 10 },
  { nachAlter: 39, vorAlter: 45, prozent: 5 },
] as const

/**
 * Beitragstabelle Nichterwerbstätige 2025 (Auszug, S. 9)
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 9
 * Vollständige Tabelle von CHF 350'000 bis CHF 8'950'000 (Vermögenssumme).
 * Schritte: +CHF 50'000 Vermögenssumme = +CHF 106 Jahresbeitrag
 */
export const AHV_NET_BEITRAEGE_2025: ReadonlyArray<readonly [number, number]> = [
  [350000,   530],
  [350000,   636],
  [400000,   742],
  [450000,   848],
  [500000,   954],
  [550000,  1060],
  [600000,  1166],
  [650000,  1272],
  [700000,  1378],
  [750000,  1484],
  [800000,  1590],
  [850000,  1696],
  [900000,  1802],
  [950000,  1908],
  [1000000, 2014],
  [1500000, 3074],
  [2000000, 4399],
  [3000000, 7579],
  [4000000, 10759],
  [5000000, 13939],
  [6000000, 17119],
  [7000000, 20299],
  [8000000, 23479],
  [8950000, 26500],
] as const

// ─────────────────────────────────────────────────────────────────────────────
// 2. BVG (Berufliche Vorsorge)  (Quelle: ZHAW Update 2025, S. 19–21)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BVG Grenzwerte 2025
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 20
 * Basis: Jährliche volle maximale AHV/IV-Rente = CHF 30'240 (= 100%)
 */
export const BVG_GRENZWERTE_2025 = {
  /** Jährliche volle max. AHV/IV-Rente (Basis = 100%) */
  AHV_MAX_JAHRESRENTE_BASIS: 30240,

  /** Mindestjahreslohn / Eintrittsschwelle: 75% von 30'240 */
  EINTRITTSSCHWELLE: 22680,

  /** Koordinationsabzug: 87.5% von 30'240 */
  KOORDINATIONSABZUG: 26460,

  /** Maximaler obligatorischer Jahreslohn: 300% von 30'240 */
  MAX_PFLICHTIGER_LOHN: 90720,

  /** Minimaler koordinierter Lohn (Mindestbetrag, versichert): 12.5% von 30'240 */
  MIN_KOORDINIERTER_LOHN: 3780,

  /** Maximaler koordinierter Lohn (für BVG-Minimum): 212.5% von 30'240 */
  MAX_KOORDINIERTER_LOHN: 64260,

  /** Maximal in der beruflichen Vorsorge versicherbarer Jahreslohn: 10 × 300% */
  MAX_VERSICHERBARER_LOHN: 907200,

  /** Deckungsgrenze Sicherungsfonds: 450% von 30'240 */
  DECKUNGSGRENZE_SICHERUNGSFONDS: 136080,
} as const

/**
 * BVG Altersgutschriften (Sparkomponente) 2025
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 20
 * Männer = Frauen (ab Reform, Referenzalter 65 für beide)
 * Sätze gelten für den versicherten (koordinierten) Lohn.
 * Total: 40 Gutschriften × 500% des koordinierten Lohns über 40 Jahre.
 */
export const BVG_ALTERSGUTSCHRIFTEN_2025: ReadonlyArray<{
  alterVon: number; alterBis: number; satz: number
}> = [
  { alterVon: 25, alterBis: 34, satz: 0.07 },  // 7% des versicherten Lohns
  { alterVon: 35, alterBis: 44, satz: 0.10 },  // 10%
  { alterVon: 45, alterBis: 54, satz: 0.15 },  // 15%
  { alterVon: 55, alterBis: 65, satz: 0.18 },  // 18%
] as const

/**
 * BVG Leistungsparameter 2025
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 20–21
 */
export const BVG_LEISTUNGEN_2025 = {
  /** Mindestzinssatz BVG 2024–2025 */
  MINDESTZINSSATZ: 0.0125,         // 1.25%

  /** Mindestumwandlungssatz (obligatorisch): Männer und Frauen bei RA 65 */
  MINDESTUMWANDLUNGSSATZ: 0.068,   // 6.80%

  /** Leistungsanteile */
  INVALIDENRENTE_FAKTOR: 1.00,
  WITWEN_WITWERRENTE_FAKTOR: 0.60, // 60% der Invalidenrente oder Altersrente
  KINDER_WAISENRENTE_FAKTOR: 0.20, // 20% der Rente

  /** Invaliditätsgrade für Rentenanspruch (stufenloses System ab 1.1.2022) */
  IV_GRAD_GANZE_RENTE: 0.70,
  IV_GRAD_KEIN_ANSPRUCH: 0.40,

  /** Sicherheitsfonds BVG 2025 (S. 20) */
  SICHERHEITSFONDS_INSOLVENZ: 0.00002,        // 0.002% vom versicherten Lohn
  SICHERHEITSFONDS_ALTERSSTRUKTUR: 0.0013,    // 0.13%
} as const

/**
 * Mindestzinssatz BVG historisch (S. 20)
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 20
 */
export const BVG_MINDESTZINS_HISTORISCH: Record<string, number> = {
  '1985-2002': 0.0400,
  '2003':      0.0325,
  '2004':      0.0225,
  '2005-2007': 0.0250,
  '2008':      0.0275,
  '2009-2011': 0.0200,
  '2012-2013': 0.0150,
  '2014-2015': 0.0175,
  '2016':      0.0125,
  '2017-2023': 0.0100,
  '2024-2025': 0.0125,
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. UVG (Unfallversicherung)  (Quelle: ZHAW Update 2025, S. 22–23)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * UVG Leistungsparameter 2025
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 22–23
 */
export const UVG_2025 = {
  /** Maximaler versicherter Jahreslohn (100% Basis) */
  MAX_VERSICHERTER_LOHN: 148200,

  /** Maximales Taggeld: 80% von 148'200 / 365 */
  MAX_TAGGELD: 325,

  /** Leistungssätze (Prozent des versicherten Verdienstes) */
  INVALIDENRENTE_MAX_SATZ: 0.80,         // 80% → CHF 118'560
  WITWEN_WITWERRENTE_MAX_SATZ: 0.40,     // 40% → CHF 59'280
  HALBWAISENRENTE_MAX_SATZ: 0.15,        // 15% → CHF 22'230
  VOLLWAISENRENTE_MAX_SATZ: 0.25,        // 25% → CHF 37'050

  MAX_INVALIDENRENTE: 118560,
  MAX_WITWEN_WITWERRENTE: 59280,
  MAX_HALBWAISENRENTE: 22230,
  MAX_VOLLWAISENRENTE: 37050,

  /** Plafonierung UVG (S. 23) */
  PLAFOND_EHEGATTE_KINDER: 0.70,         // 70% des versicherten Verdienstes (max CHF 103'740)
  PLAFOND_UVG_AHV: 0.90,                 // 90% (UVG + 1. Säule max 90% von 148'200 = 133'380)
  PLAFOND_UVG_AHV_BVG: 0.90,            // 90% total (1. + 2. + 3. Stufe)

  MAX_PLAFOND_EHEGATTE_KINDER: 103740,
  MAX_KOMPLEMENTAER: 133380,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// 4. Lohnfortzahlung  (Quelle: ZHAW Update 2025, S. 24)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lohnfortzahlungsanspruch bei Krankheit (Wochen)
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 24
 * Gilt wenn keine gleichwertige Krankentaggeldversicherung abgeschlossen ist.
 */
export const LOHNFORTZAHLUNG_2025 = {
  /** Berner Skala (übrige Kantone) */
  BERNER_SKALA: [
    { dienstjahr: 1,     wochen: 3 },
    { dienstjahr: 2,     wochen: 4 },
    { dienstjahr: 3,     wochen: 9 },  // 3. und 4. Jahr
    { dienstjahr: 4,     wochen: 9 },
    { dienstjahr: 5,     wochen: 13 }, // 5. bis 9. Jahr
    { dienstjahr: 9,     wochen: 13 },
    { dienstjahr: 10,    wochen: 17 }, // 10. bis 14. Jahr
    { dienstjahr: 14,    wochen: 17 },
    { dienstjahr: 15,    wochen: 22 }, // 15. bis 19. Jahr
    { dienstjahr: 19,    wochen: 22 },
    { dienstjahr: 20,    wochen: 26 }, // 20. bis 24. Jahr
    { dienstjahr: 24,    wochen: 26 },
    { dienstjahr: 25,    wochen: 30 }, // 25. bis 29. Jahr
    { dienstjahr: 29,    wochen: 30 },
    { dienstjahr: 30,    wochen: 33 }, // 30. bis 34. Jahr
    { dienstjahr: 34,    wochen: 33 },
    { dienstjahr: 35,    wochen: 39 }, // ab 35. Jahr
  ] as const,

  /** Basler Skala (BS, BL) */
  BASLER_SKALA: [
    { dienstjahr: 1,  wochen: 3 },
    { dienstjahr: 2,  wochen: 9 },  // 2. und 3. Jahr
    { dienstjahr: 3,  wochen: 9 },
    { dienstjahr: 4,  wochen: 13 }, // 4. bis 10. Jahr
    { dienstjahr: 10, wochen: 13 },
    { dienstjahr: 11, wochen: 17 }, // 11. bis 15. Jahr
    { dienstjahr: 15, wochen: 17 },
    { dienstjahr: 16, wochen: 22 }, // 16. bis 20. Jahr
    { dienstjahr: 20, wochen: 22 },
    { dienstjahr: 21, wochen: 26 }, // ab 21. Jahr
  ] as const,

  /** Zürcher Skala (ZH, SH, TG) */
  ZUERCHER_SKALA: {
    DIENSTJAHR_1: 3,
    DIENSTJAHR_2: 8,
    DIENSTJAHR_3: 9,
    DIENSTJAHR_4: 10,
    ZUWACHS_PRO_WEITERES_JAHR: 1, // je eine zusätzliche Woche pro Dienstjahr
  } as const,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// 5. Dritte Säule (Säule 3a)  (Quelle: ZHAW Update 2025, S. 25–26)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Säule 3a Parameter 2025
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 25–26
 */
export const SAEULE_3A_2025 = {
  /** Max. Jahresbeitrag mit PK-Anschluss: 8% des oberen BVG-Grenzlohns von CHF 90'720 */
  MAX_BEITRAG_MIT_PK: 7258,

  /** Max. Jahresbeitrag ohne PK-Anschluss: 20% des Erwerbseinkommens, max. 40% von 90'720 */
  MAX_BEITRAG_OHNE_PK: 36288,
  MAX_BEITRAG_OHNE_PK_SATZ: 0.20, // 20% des Erwerbseinkommens

  /** Maximales Guthaben per 31.12.2025 (BSV-Richtwert, Sparbeginn ab Alter 25) */
  MAX_GUTHABEN_2025: 342655,

  /** Bezugsfenster: 5 Jahre vor bis 5 Jahre nach ordentlicher Pensionierung */
  BEZUG_FRUEHESTENS_VOR_RA: 5,    // Jahre vor Referenzalter
  BEZUG_SPAETESTENS_NACH_RA: 5,   // Jahre nach Referenzalter
  BEZUG_MAX_ALTER: 70,            // max. Alter für Einzahlung bei Weiterarbeit

  /** Einkauf in Säule 3a (neu ab 2025, S. 26) */
  EINKAUF_MAX_RUECKWIRKEND: 10,   // max. 10 vorangehende Beitragsjahre
  EINKAUF_MAX_PRO_JAHR: 7258,     // = kleiner Abzug (CHF 7'258 für 2025)
} as const

// ─────────────────────────────────────────────────────────────────────────────
// 6. Invalidenversicherung (IV)  (Quelle: ZHAW Update 2025, S. 15–16)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * IV Leistungsparameter 2025
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 15–16
 */
export const IV_2025 = {
  /** IV-Grad für ganze Rente */
  IV_GRAD_GANZE_RENTE: 0.70,      // ab 70% IV-Grad
  IV_GRAD_KEIN_ANSPRUCH: 0.40,    // unter 40% kein Anspruch

  /** Stufenloses Rentensystem (ab 1.1.2022): 40%–69% proportionale Rente (S. 15) */
  IV_STUFENLOS_TABELLE: [
    { ivGrad: 0.49, rentenanteil: 0.475 },
    { ivGrad: 0.48, rentenanteil: 0.450 },
    { ivGrad: 0.47, rentenanteil: 0.425 },
    { ivGrad: 0.46, rentenanteil: 0.400 },
    { ivGrad: 0.45, rentenanteil: 0.375 },
    { ivGrad: 0.44, rentenanteil: 0.350 },
    { ivGrad: 0.43, rentenanteil: 0.325 },
    { ivGrad: 0.42, rentenanteil: 0.300 },
    { ivGrad: 0.41, rentenanteil: 0.275 },
    { ivGrad: 0.40, rentenanteil: 0.250 },
  ] as const,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// 7. BVG Subsidiärleistungen bei Unfall (S. 21)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BVG Subsidiärleistungen bei Unfall (max. koordinierter Lohn als Basis)
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 21
 */
export const BVG_SUBSIDIÄRLEISTUNGEN_2025 = {
  /** Invalidenrente Mann: max. koodinierter Lohn × 500% × 6.8% UWS */
  INVALIDENRENTE_MANN: 21848,
  INVALIDENRENTE_FRAU: 21062,

  /** Ehegattenrente bei Tod: × 60% */
  EHEGATTENRENTE_MANN: 13109,
  EHEGATTENRENTE_FRAU: 12637,

  /** Kinderrente: × 20% */
  KINDERRENTE_MANN: 4370,
  KINDERRENTE_FRAU: 4212,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// 8. Historische Masszahlen – BVG (Quelle: ZHAW Update 2025, S. 28–35)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BVG historische Grenzwerte (Auswahl der wichtigsten Jahre, 2010–2025)
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 28–35
 * Format: { Jahr: { minAHV, maxAHV, eintrittsschwelle, koordinationsabzug,
 *                    maxPflichtlohn, minKoordLohn, maxKoordLohn,
 *                    maxVersicherbarer, bvgMinzins } }
 */
export const BVG_HISTORISCH_2010_2025: Record<number, {
  minAhvJahr: number; maxAhvJahr: number
  eintrittsschwelle: number; koordinationsabzug: number
  maxPflichtlohn: number; minKoordLohn: number; maxKoordLohn: number
  maxVersicherbarer: number; bvgMinzins: number
}> = {
  2010: { minAhvJahr: 13320, maxAhvJahr: 26640, eintrittsschwelle: 19980, koordinationsabzug: 23310, maxPflichtlohn: 79560, minKoordLohn: 3330, maxKoordLohn: 56250, maxVersicherbarer: 795600, bvgMinzins: 0.020 },
  2011: { minAhvJahr: 13680, maxAhvJahr: 27360, eintrittsschwelle: 20520, koordinationsabzug: 23940, maxPflichtlohn: 82080, minKoordLohn: 3420, maxKoordLohn: 58140, maxVersicherbarer: 820800, bvgMinzins: 0.020 },
  2012: { minAhvJahr: 13680, maxAhvJahr: 27360, eintrittsschwelle: 20520, koordinationsabzug: 23940, maxPflichtlohn: 82080, minKoordLohn: 3420, maxKoordLohn: 58140, maxVersicherbarer: 820800, bvgMinzins: 0.015 },
  2013: { minAhvJahr: 13680, maxAhvJahr: 27360, eintrittsschwelle: 20520, koordinationsabzug: 23940, maxPflichtlohn: 82080, minKoordLohn: 3420, maxKoordLohn: 58140, maxVersicherbarer: 820800, bvgMinzins: 0.015 },
  2014: { minAhvJahr: 13680, maxAhvJahr: 27360, eintrittsschwelle: 20520, koordinationsabzug: 23940, maxPflichtlohn: 82080, minKoordLohn: 3420, maxKoordLohn: 58140, maxVersicherbarer: 820800, bvgMinzins: 0.0175 },
  2015: { minAhvJahr: 13680, maxAhvJahr: 27360, eintrittsschwelle: 20520, koordinationsabzug: 23940, maxPflichtlohn: 82080, minKoordLohn: 3420, maxKoordLohn: 58140, maxVersicherbarer: 820800, bvgMinzins: 0.0175 },
  2016: { minAhvJahr: 13680, maxAhvJahr: 27360, eintrittsschwelle: 20520, koordinationsabzug: 23940, maxPflichtlohn: 82080, minKoordLohn: 3420, maxKoordLohn: 58140, maxVersicherbarer: 820800, bvgMinzins: 0.0125 },
  2017: { minAhvJahr: 14100, maxAhvJahr: 28200, eintrittsschwelle: 21150, koordinationsabzug: 24675, maxPflichtlohn: 84600, minKoordLohn: 3525, maxKoordLohn: 59925, maxVersicherbarer: 846000, bvgMinzins: 0.010 },
  2018: { minAhvJahr: 14100, maxAhvJahr: 28200, eintrittsschwelle: 21150, koordinationsabzug: 24675, maxPflichtlohn: 84600, minKoordLohn: 3525, maxKoordLohn: 59925, maxVersicherbarer: 846000, bvgMinzins: 0.010 },
  2019: { minAhvJahr: 14220, maxAhvJahr: 28440, eintrittsschwelle: 21330, koordinationsabzug: 24885, maxPflichtlohn: 85320, minKoordLohn: 3555, maxKoordLohn: 60435, maxVersicherbarer: 853200, bvgMinzins: 0.010 },
  2020: { minAhvJahr: 14220, maxAhvJahr: 28440, eintrittsschwelle: 21330, koordinationsabzug: 24885, maxPflichtlohn: 85320, minKoordLohn: 3555, maxKoordLohn: 60435, maxVersicherbarer: 853200, bvgMinzins: 0.010 },
  2021: { minAhvJahr: 14340, maxAhvJahr: 28680, eintrittsschwelle: 21510, koordinationsabzug: 25095, maxPflichtlohn: 86040, minKoordLohn: 3585, maxKoordLohn: 60945, maxVersicherbarer: 860400, bvgMinzins: 0.010 },
  2022: { minAhvJahr: 14340, maxAhvJahr: 28680, eintrittsschwelle: 21510, koordinationsabzug: 25095, maxPflichtlohn: 86040, minKoordLohn: 3585, maxKoordLohn: 60945, maxVersicherbarer: 860400, bvgMinzins: 0.010 },
  2023: { minAhvJahr: 14700, maxAhvJahr: 29400, eintrittsschwelle: 22050, koordinationsabzug: 25725, maxPflichtlohn: 88200, minKoordLohn: 3675, maxKoordLohn: 62475, maxVersicherbarer: 882000, bvgMinzins: 0.010 },
  2024: { minAhvJahr: 14700, maxAhvJahr: 29400, eintrittsschwelle: 22050, koordinationsabzug: 25725, maxPflichtlohn: 88200, minKoordLohn: 3675, maxKoordLohn: 62475, maxVersicherbarer: 882000, bvgMinzins: 0.0125 },
  2025: { minAhvJahr: 15120, maxAhvJahr: 30240, eintrittsschwelle: 22680, koordinationsabzug: 26460, maxPflichtlohn: 90720, minKoordLohn: 3780, maxKoordLohn: 64260, maxVersicherbarer: 907200, bvgMinzins: 0.0125 },
}

/**
 * Steuerfreier Grenzbetrag Säule 3a historisch (2025: CHF 7'258 mit PK / CHF 36'288 ohne PK)
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 28–35 (historische Tabelle)
 */
export const SAEULE_3A_HISTORISCH: Record<number, { mitPK: number; ohnePK: number }> = {
  1990: { mitPK:  4608, ohnePK: 23040 },
  1995: { mitPK:  5731, ohnePK: 28656 },
  2000: { mitPK:  5933, ohnePK: 29664 },
  2005: { mitPK:  6077, ohnePK: 30384 },
  2006: { mitPK:  6192, ohnePK: 30960 },
  2010: { mitPK:  6566, ohnePK: 32832 },
  2015: { mitPK:  6768, ohnePK: 33840 },
  2017: { mitPK:  6768, ohnePK: 33696 },
  2018: { mitPK:  6768, ohnePK: 33840 },
  2019: { mitPK:  6826, ohnePK: 34128 },
  2021: { mitPK:  6883, ohnePK: 34416 },
  2023: { mitPK:  7056, ohnePK: 35280 },
  2024: { mitPK:  7056, ohnePK: 35280 },
  2025: { mitPK:  7258, ohnePK: 36288 },
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Reform AHV 21 – Schrittweise Erhöhung Referenzalter Frauen (S. 17–18)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Schrittweise Erhöhung Referenzalter Frauen (AHV 21 Reform)
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 17–18
 */
export const AHV_REFORM_21 = {
  REFERENZALTER_FRAUEN_STUFENWEISE: [
    { jahrgang: { bis: 1960 }, referenzalter: 64.00 },   // bis Jahrgang 1960
    { jahrgang: { von: 1961, bis: 1961 }, referenzalter: 64.25 }, // +3 Monate
    { jahrgang: { von: 1962, bis: 1962 }, referenzalter: 64.50 }, // +6 Monate
    { jahrgang: { von: 1963, bis: 1963 }, referenzalter: 64.75 }, // +9 Monate
    { jahrgang: { von: 1964 }, referenzalter: 65.00 },   // ab Jahrgang 1964
  ] as const,
  VOLLSTAENDIG_AB: 2028,           // Ab 2028 RA 65 für alle

  /** Rentenzuschlag Ausgleichsmassnahmen (Frauen Jg. 1961–1969 ohne Vorbezug) */
  AUSGLEICHSZUSCHLAG_MIN: 12.50,   // CHF/Monat
  AUSGLEICHSZUSCHLAG_MAX: 160.00,  // CHF/Monat
} as const

// ─────────────────────────────────────────────────────────────────────────────
// 10. Aufwertungsfaktoren 2025 für IK-Einträge (Quelle: ZHAW Update 2025, S. 14)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aufwertungsfaktoren für Einkommenssumme im IK-Auszug
 * Quelle: ZHAW Vorsorgesystem Schweiz Update 2025, S. 14
 * Erster IK-Eintrag im angegebenen Jahr → Aufwertungsfaktor für 2025
 */
export const AHV_AUFWERTUNGSFAKTOREN_2025: Record<number, number> = {
  1976: 1.110,
  1977: 1.098,
  1978: 1.086,
  1979: 1.075,
  1980: 1.063,
  1981: 1.052,
  1982: 1.042,
  1983: 1.032,
  1984: 1.022,
  1985: 1.013,
  1986: 1.004,
  // 1987–2024: Faktor 1.000 (keine Aufwertung erforderlich)
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Convenience-Exports für bestehende Imports (Single Source of Truth)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Alle AHV 2025-Werte als einzigen Export für ahvCalculation.ts
 * (ersetzt den bisherigen AHV_2026-Block)
 */
export const AHV_AKTUELL = {
  MIN_MONTHLY:              AHV_RENTEN_2025.MIN_MONATSRENTE,           // 1260
  MAX_MONTHLY:              AHV_RENTEN_2025.MAX_MONATSRENTE,           // 2520
  MIN_AVG_INCOME:           AHV_RENTEN_2025.MDJ_MIN,                   // 15120
  MAX_AVG_INCOME:           AHV_RENTEN_2025.MDJ_MAX,                   // 90720
  PLAFOND_MONTHLY:          AHV_RENTEN_2025.PLAFOND_MONATLICH,         // 3780
  FULL_CONTRIBUTION_YEARS:  AHV_RENTEN_2025.BEITRAGSJAHRE_VOLLRENTE,   // 44
  REFERENCE_AGE:            AHV_RENTEN_2025.REFERENZALTER_MAENNER,     // 65
  CHILD_CREDIT_YEARLY:      AHV_RENTEN_2025.ERZIEHUNGSGUTSCHRIFT_JAEHRLICH, // 45360
  BEZUG_FACTORS:            AHV_BEZUG_FAKTOREN_2025,
} as const

/**
 * Alle BVG 2025-Werte als einzigen Export für pkConstants.ts / bvgConstants.ts
 */
export const BVG_AKTUELL = {
  // Core BVG limits
  COORDINATION_DEDUCTION_2026:              BVG_GRENZWERTE_2025.KOORDINATIONSABZUG,     // 26460
  ENTRY_THRESHOLD_2026:                     BVG_GRENZWERTE_2025.EINTRITTSSCHWELLE,       // 22680
  BVG_MAX_INSURED_SALARY:                   BVG_GRENZWERTE_2025.MAX_PFLICHTIGER_LOHN,    // 90720
  BVG_MIN_INTEREST_RATE:                    BVG_LEISTUNGEN_2025.MINDESTZINSSATZ,         // 0.0125
  BVG_MIN_CONVERSION_RATE:                  BVG_LEISTUNGEN_2025.MINDESTUMWANDLUNGSSATZ,  // 0.068
  // Säule 3a
  MAX_3A_WITH_PK:                           SAEULE_3A_2025.MAX_BEITRAG_MIT_PK,           // 7258
  MAX_3A_WITHOUT_PK:                        SAEULE_3A_2025.MAX_BEITRAG_OHNE_PK,          // 36288
  // PK conversion / Früh-/Spätpensionierung
  DEFAULT_CONVERSION_RATE:                  0.054,
  EARLY_RETIREMENT_CONVERSION_REDUCTION_PER_YEAR: 0.00175,
  EARLIEST_RETIREMENT_AGE:                  58,
  /**
   * BVG Altersgutschriften (Kombinierte Arbeitgeber+Arbeitnehmer Sätze, überobligatorisch typisch)
   * BVG-Minimum (Quelle ZHAW): 7/10/15/18% des koordinierten Lohns.
   * Typische Schweizer PK liegen bei ca. 14/21/28/35% (doppelter Satz AG+AN).
   * Diese Werte werden für die PK-Hochrechnung genutzt (überobligatorischer Standard).
   */
  BVG_CONTRIBUTION_RATES: [
    { ageFrom: 25, ageTo: 34, rate: 0.14 }, // Minimum BVG: 7%; Standard PK: ~14%
    { ageFrom: 35, ageTo: 44, rate: 0.21 }, // Minimum BVG: 10%; Standard PK: ~21%
    { ageFrom: 45, ageTo: 54, rate: 0.28 }, // Minimum BVG: 15%; Standard PK: ~28%
    { ageFrom: 55, ageTo: 65, rate: 0.35 }, // Minimum BVG: 18%; Standard PK: ~35%
  ] as { ageFrom: number; ageTo: number; rate: number }[],
} as const
