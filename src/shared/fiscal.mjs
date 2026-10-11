// The build and the browser use the same fiscal arithmetic (amounts in M€).
export function measureCost(item, parameter = item.control?.default) {
  if (!item.control) return item.value;
  const { min, max, type, from } = item.control;
  if (!Number.isFinite(parameter) || parameter < min || parameter > max) throw new Error(`Parámetro fuera de rango: ${item.id}`);
  return item.value * (type === 'vat' ? (from - parameter) / from : parameter / 100);
}

export function taxComparison(interestValue, items, selectedIds, parameters = {}) {
  if (!Array.isArray(selectedIds) || new Set(selectedIds).size !== selectedIds.length) throw new Error('Impuestos: la selección contiene IDs duplicados');
  const selected = selectedIds.map(id => {
    const item = items.find(item => item.id === id);
    if (!item) throw new Error(`Impuestos: ID no encontrado: ${id}`);
    return item;
  });
  const total = selected.reduce((sum, item) => sum + measureCost(item, parameters[item.id]), 0);
  const count = selected.filter(item => measureCost(item, parameters[item.id]) > 0).length;
  return { ids: selectedIds, count, total, remaining: interestValue - total, covered: total <= interestValue };
}
