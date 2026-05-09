import type { YearlyProjection } from './wealthDepletionCalculation'

export interface FullYearRow extends YearlyProjection {
  annualIncome: number
  annualExpenses: number
}

export function generateYearlyProjection(
  retirementAge: number,
  annualIncome: number,
  annualExpenses: number,
  initialWealth: number,
  returnRate: number,
  inflationRate: number,
  adjustExpensesForInflation: boolean,
  endAge = 95,
): FullYearRow[] {
  const rows: FullYearRow[] = []
  let wealth = initialWealth
  let expenses = annualExpenses

  for (let age = retirementAge; age <= endAge; age++) {
    const year = age - retirementAge
    const wealthStart = wealth
    const returns = Math.max(0, wealth * returnRate)
    const withdrawal = Math.max(0, expenses - annualIncome)
    wealth = wealth + returns - withdrawal

    rows.push({
      year,
      age,
      wealthStart: Math.max(0, Math.round(wealthStart)),
      returns: Math.round(returns),
      withdrawal: Math.round(withdrawal),
      wealthEnd: Math.max(0, Math.round(wealth)),
      depleted: wealth <= 0,
      annualIncome: Math.round(annualIncome),
      annualExpenses: Math.round(expenses),
    })

    if (wealth <= 0) break
    if (adjustExpensesForInflation) {
      expenses = expenses * (1 + inflationRate)
    }
  }

  return rows
}

export function exportProjectionToCSV(rows: FullYearRow[]): string {
  const headers = ['Alter', 'Vermögen Anfang', 'Einnahmen', 'Ausgaben', 'Entnahme', 'Rendite', 'Vermögen Ende']
  const lines = [headers.join(';')]

  for (const r of rows) {
    lines.push([
      r.age,
      r.wealthStart,
      r.annualIncome,
      r.annualExpenses,
      r.withdrawal,
      r.returns,
      r.wealthEnd,
    ].join(';'))
  }

  return lines.join('\n')
}

export function downloadCSV(content: string, filename: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
