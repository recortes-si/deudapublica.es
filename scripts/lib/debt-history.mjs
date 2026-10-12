export function debtHistoryModel(rawPrices, { debt, finances, sourceId }) {
  if (rawPrices.id?.join(',') !== 'freq,unit,coicop,geo,time' || rawPrices.size?.slice(0,-1).some(size => size !== 1)) throw new Error('IPCA: estructura inesperada');
  for (const [dimension, code] of Object.entries({ freq: 'A', unit: 'INX_A_AVG', coicop: 'CP00', geo: 'ES' })) {
    const index = rawPrices.dimension?.[dimension]?.category?.index;
    if (!index || Object.keys(index).length !== 1 || !(code in index)) throw new Error(`IPCA: se esperaba ${dimension}=${code}`);
  }
  const prices = new Map(Object.entries(rawPrices.dimension.time.category.index).map(([year,index]) => [Number(year),rawPrices.value[index]]));
  const baseYear = finances.latest.year, baseIndex = prices.get(baseYear);
  if (!Number.isFinite(baseIndex) || baseIndex <= 0) throw new Error(`IPCA: falta índice para el año base ${baseYear}; actualiza la fuente de inflación`);
  const debtByYear = new Map(debt.map(row => [row.year,row]));
  const rows = finances.rows.map(row => {
    const priceIndex = prices.get(row.year), d = debtByYear.get(row.year);
    if (!Number.isFinite(priceIndex) || priceIndex <= 0) throw new Error(`IPCA: falta índice válido en ${row.year}`);
    return { year: row.year, balanceM: row.balance, debtM: d ? d.euros * 1e6 : null, ratio: d?.ratio ?? null, gdpM: d ? d.euros * 1e6 * 100 / d.ratio : null, population: d?.population ?? null, priceIndex, priceFactor: baseIndex / priceIndex };
  });
  return { baseYear, baseIndex, sourceId, rows };
}
