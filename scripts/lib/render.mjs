export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
export const format = (value, digits = 1) => value.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const signed = (value, digits = 1) => `${value < 0 ? '−' : '+'}${format(Math.abs(value), digits)}`;
const table = (headings, rows, caption) => `<div class="table-scroll"><table><caption>${escapeHtml(caption)}</caption><thead><tr>${headings.map(text => `<th scope="col">${escapeHtml(text)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((text, i) => i === 0 ? `<th scope="row">${escapeHtml(text)}</th>` : `<td>${escapeHtml(text)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const tree = node => node.children ? `<details><summary>${escapeHtml(node.name)}</summary><ul>${node.children.map(child => `<li>${tree(child)}</li>`).join('')}</ul></details>` : `${escapeHtml(node.name)} <b>${format(node.value, 0)} M€</b>`;

export function templateValues(data) {
  const { latest, previous, spendingYear, spending, spendingHistory, population, budget } = data;
  const flow = (latest.euros - previous.euros) * 1e12;
  const social = spending.find(item => item.code === '10');
  const status = spendingHistory.at(-1).provisional ? 'provisional' : 'definitivo';
  const period = `${previous.year} → ${latest.year}`;
  return {
    DEBT: format(latest.euros, 2), YEAR: latest.year, START_YEAR: data.debt[0].year, PREVIOUS_YEAR: previous.year,
    RATIO_WIDTH: Math.min(100, latest.ratio / 150 * 100), RATIO: format(latest.ratio), RATIO_CHANGE: signed(latest.ratio-previous.ratio), DEBT_CHANGE: signed((latest.euros/previous.euros-1)*100),
    SPENDING_GDP: data.spendingGdp == null ? '—' : format(data.spendingGdp), SOCIAL_SHARE: format(social.share),
    SPENDING_YEAR: spendingYear, SPENDING_STATUS: status, BUDGET_DATASET: escapeHtml(budget.dataset), BUDGET_TOTAL: format(budget.total,0), BUDGET_STATUS: escapeHtml(budget.status),
    PER_CAPITA: format(latest.euros*1e12/population.value,0), POPULATION_DATE: escapeHtml(population.date),
    ANNUAL_FLOW: signed(flow/1e6,0), SECOND_FLOW: signed(flow/(365.25*86400),0), MINUTE_FLOW: signed(flow/(365.25*1440),0), DAY_FLOW: signed(flow/(365.25*1e6),0),
    COUNTER_NOTE: `Proyección desde el cierre de ${latest.year}, al ritmo medio de la variación ${period}. No es una medición en tiempo real ni una predicción: la deuda puede aumentar o disminuir.`,
    DEBT_TABLE: table(['Año','Deuda (billones €)','Deuda / PIB'],data.debt.map(row=>[row.year,format(row.euros,2),format(row.ratio)+'%']), 'Serie anual de deuda pública'),
    SPENDING_TABLE: table(['Función',...spendingHistory.map(row=>`${row.year} (M€)`)],spending.map(item=>[item.name,...spendingHistory.map(row=>format(row.items.find(entry=>entry.code===item.code).value,0))]),'Gasto por funciones COFOG'),
    BUDGET_TREE: tree(budget.root),
    SOURCES: data.sources.map(source => `<div class="source-item"><div><strong>${escapeHtml(source.publisher)}</strong><p>${escapeHtml(source.title)} · ${escapeHtml(source.period)} · actualizado ${escapeHtml(source.updated)}</p></div><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Ver fuente ↗</a></div>`).join(''),
    SPENDING_OPTIONS: spendingHistory.map(row=>`<option value="${row.year}" ${row.year===spendingYear?'selected':''}>${row.year}${row.provisional?' · provisional':''}</option>`).join('')
  };
}

export function fillTemplate(template, values) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Variable de plantilla desconocida: ${key}`);
    return values[key];
  });
}
