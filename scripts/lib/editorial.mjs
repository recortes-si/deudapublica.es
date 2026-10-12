// Curated single observations, kept separate from the historical chart series.
export function editorialModel(raw, sources) {
  if (raw.schemaVersion !== 1 || !Array.isArray(raw.indicators)) throw new Error('Editorial: esquema no válido');
  const indicators = {};
  for (const item of raw.indicators) {
    if (!/^[a-z][a-z0-9-]*$/.test(item.id || '') || indicators[item.id]) throw new Error('Editorial: ID no válido o duplicado');
    if (!Number.isFinite(item.value) || item.value < 0 || !item.unit || !item.scope || !item.period || !item.locator || !['documented','legacy-unverified'].includes(item.status)) throw new Error(`Editorial: metadatos o valor incompletos ${item.id}`);
    if (item.sourceId ? !sources.has(item.sourceId) : !/^https?:$/.test(new URL(item.sourceUrl).protocol)) throw new Error(`Editorial: fuente desconocida ${item.id}`);
    if (item.status === 'legacy-unverified' && !item.note) throw new Error(`Editorial: explicar la procedencia pendiente ${item.id}`);
    indicators[item.id] = item;
  }
  const value = id => {
    if (!indicators[id]) throw new Error(`Editorial: falta ${id}`);
    return indicators[id].value;
  };
  const imvTotal = value('imv-total-holders'), imvForeign = value('imv-foreign-holders');
  if (imvTotal <= 0 || imvForeign > imvTotal) throw new Error('Editorial: denominador IMV incoherente');
  const foreign = value('convictions-foreign'), spanish = value('convictions-spanish');
  const maxRate = Math.max(foreign, spanish);
  if (!maxRate) throw new Error('Editorial: tasas de condenas vacías');
  return { indicators, imvForeignShare: imvForeign / imvTotal * 100, convictionWidths: { foreign: foreign / maxRate * 100, spanish: spanish / maxRate * 100 } };
}
