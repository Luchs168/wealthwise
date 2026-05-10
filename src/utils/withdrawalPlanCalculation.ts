import { calculateCapitalWithdrawalTax } from '../lib/tax'
import type { TaxCivilStatus } from '../lib/tax'

export interface WithdrawalEntry {
  label: string
  amount: number
  calendarYear: number
  tax: number
  netAmount: number
}

export interface WithdrawalPlan {
  entries: WithdrawalEntry[]
  totalGross: number
  totalTax: number
  totalNet: number
}

export interface OptimalWithdrawalResult {
  worst: WithdrawalPlan    // all capital in same year → max tax
  optimal: WithdrawalPlan  // staggered per year → min tax
  savings: number
  hasAnything: boolean
}

export function calculateOptimalWithdrawal(
  pkCapital: number,
  pillar3aTotal: number,
  pillar3aAccounts: number,
  fzBalance: number,
  canton: string,
  status: TaxCivilStatus,
  retirementCalendarYear: number,
): OptimalWithdrawalResult {
  const accounts3a = pillar3aAccounts > 0 ? pillar3aAccounts : 1
  const perAccount3a = pillar3aTotal > 0 ? Math.round(pillar3aTotal / accounts3a) : 0

  // Collect all capital items
  const items: Array<{ label: string; amount: number; canBeEarly: boolean }> = []
  for (let i = 0; i < accounts3a; i++) {
    if (perAccount3a > 0) items.push({ label: `Säule 3a Konto ${i + 1}`, amount: perAccount3a, canBeEarly: true })
  }
  if (fzBalance > 0) items.push({ label: 'Freizügigkeitsguthaben', amount: fzBalance, canBeEarly: true })
  if (pkCapital > 0) items.push({ label: 'PK-Kapitalbezug', amount: pkCapital, canBeEarly: false })

  if (items.length === 0) {
    const empty: WithdrawalPlan = { entries: [], totalGross: 0, totalTax: 0, totalNet: 0 }
    return { worst: empty, optimal: empty, savings: 0, hasAnything: false }
  }

  const totalGross = items.reduce((s, i) => s + i.amount, 0)

  // Worst case: all in retirement year
  const worstTax = calculateCapitalWithdrawalTax(totalGross, canton, status).totalTax
  const worst: WithdrawalPlan = {
    entries: [{ label: 'Alle Kapitalbezüge', amount: totalGross, calendarYear: retirementCalendarYear, tax: worstTax, netAmount: totalGross - worstTax }],
    totalGross,
    totalTax: worstTax,
    totalNet: totalGross - worstTax,
  }

  // Optimal: assign each item its own year
  // Early items (3a, FZ): staggered backwards from retirement year
  // Mandatory items (PK): at retirement year
  const earlyItems = items.filter(i => i.canBeEarly)
  const mandatoryItems = items.filter(i => !i.canBeEarly)
  const entries: WithdrawalEntry[] = []

  earlyItems.forEach((item, idx) => {
    const yearsBack = earlyItems.length - idx
    const yr = retirementCalendarYear - yearsBack
    const tax = calculateCapitalWithdrawalTax(item.amount, canton, status).totalTax
    entries.push({ label: item.label, amount: item.amount, calendarYear: yr, tax, netAmount: item.amount - tax })
  })

  mandatoryItems.forEach(item => {
    const tax = calculateCapitalWithdrawalTax(item.amount, canton, status).totalTax
    entries.push({ label: item.label, amount: item.amount, calendarYear: retirementCalendarYear, tax, netAmount: item.amount - tax })
  })

  entries.sort((a, b) => a.calendarYear - b.calendarYear)

  const optimalTax = entries.reduce((s, e) => s + e.tax, 0)
  const optimal: WithdrawalPlan = {
    entries,
    totalGross,
    totalTax: optimalTax,
    totalNet: totalGross - optimalTax,
  }

  return { worst, optimal, savings: worstTax - optimalTax, hasAnything: true }
}
