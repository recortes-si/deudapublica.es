import { numeric } from './csv.mjs';

import { taxComparison } from '../../src/shared/fiscal.mjs';
export { taxComparison } from '../../src/shared/fiscal.mjs';

export function interestModel(raw, taxes, exampleIds) {
  for (const [dimension, code] of Object.entries({ freq:'A', unit:'MIO_EUR', sector:'S13', na_item:'D41PAY', geo:'ES' })) {
    const index = raw.dimension?.[dimension]?.category?.index;
    if (!index || Object.keys(index).length !== 1 || !(code in index)) throw new Error(`Intereses: se esperaba ${dimension}=${code}`);
  }
  const periods = Object.entries(raw.dimension.time.category.index);
  if (periods.length !== 1 || raw.size.some(size => size !== 1)) throw new Error('Intereses: se esperaba una sola observación anual');
  const [yearText, index] = periods[0], year = Number(yearText);
  if (!Number.isInteger(year) || year < 1900 || taxes.year !== year) throw new Error('Intereses e impuestos deben corresponder al mismo año');
  const value = numeric(raw.value[index], `Intereses ${year}`);
  if (taxes.unit !== 'millones de euros' || !taxes.basis || !taxes.scope) throw new Error('Impuestos: indicar unidad, base contable y ámbito territorial');
  if (!Array.isArray(taxes.items) || !taxes.items.length || new Set(taxes.items.map(item => item.id)).size !== taxes.items.length) throw new Error('Impuestos: faltan partidas o hay IDs duplicados');
  for (const item of taxes.items) {
    if (!/^[a-z][a-z0-9-]*$/.test(item.id || '') || !item.name || !item.sourceLocator || !/^https?:$/.test(new URL(item.sourceUrl).protocol)) throw new Error('Impuesto sin identificación o procedencia');
    numeric(item.value, `Recaudación ${item.name}`);
    if (!item.basis || !item.scope || !item.note) throw new Error(`Partida sin metodología: ${item.id}`);
    if (item.control) {
      const c = item.control;
      if (!['vat','reduction'].includes(c.type) || !Number.isFinite(c.min) || !Number.isFinite(c.max) || !Number.isFinite(c.default) || c.min !== 0 || c.max <= c.min || c.default < c.min || c.default > c.max || (c.type === 'vat' && c.from !== c.max) || (c.type === 'reduction' && c.max !== 100)) throw new Error(`Control fiscal inválido: ${item.id}`);
    }
  }
  const values = new Map(taxes.items.map(item => [item.id, numeric(item.value, `Recaudación ${item.name}`)]));
  const normalizedTaxes = { ...taxes, items: taxes.items.map(item => {
    const excluded = item.excludeIds || [];
    if (!Array.isArray(excluded) || new Set(excluded).size !== excluded.length || excluded.some(id => id === item.id || !values.has(id) || taxes.items.find(entry => entry.id === id).excludeIds || taxes.items.find(entry => entry.id === id).control)) throw new Error(`Exclusiones fiscales inválidas: ${item.id}`);
    const value = values.get(item.id) - excluded.reduce((sum,id) => sum + values.get(id), 0);
    if (value < 0) throw new Error(`Las exclusiones superan el total: ${item.id}`);
    return { ...item, sourceValue:values.get(item.id), value };
  }) };
  const example = taxComparison(value, normalizedTaxes.items, exampleIds);
  if (!example.count || !example.covered) throw new Error('Impuestos: el ejemplo inicial debe seleccionar al menos un impuesto y no superar el ahorro en intereses');
  const days = (Date.UTC(year + 1,0,1) - Date.UTC(year,0,1)) / 86400000;
  return { year, value, perDay: value / days, days, taxes: normalizedTaxes, example };
}
