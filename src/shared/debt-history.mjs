// Values arrive in millions of euros; chart totals use thousands of millions.
export function debtHistoryValues(row, mode) {
  if (!['euros', 'real', 'pib', 'percapita'].includes(mode)) throw new Error('Unidad de deuda desconocida');
  if (mode === 'pib') return { balance: row.gdpM ? row.balanceM / row.gdpM * 100 : null, debt: row.ratio };
  if (mode === 'percapita') return { balance: row.population ? row.balanceM * 1e6 / row.population : null, debt: row.population && row.debtM != null ? row.debtM * 1e6 / row.population : null };
  const factor = mode === 'real' ? row.priceFactor : 1;
  return { balance: row.balanceM / 1000 * factor, debt: row.debtM == null ? null : row.debtM / 1000 * factor };
}
