import { sourceCards } from './render-sources.mjs';
import { repaymentValues } from './render-repayment.mjs';
import { financialValues } from './render-finances.mjs';
import { measureCost } from '../../src/shared/fiscal.mjs';
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
export const format = (value, digits = 1) => value.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const signed = (value, digits = 1) => `${value < 0 ? '−' : '+'}${format(Math.abs(value), digits)}`;
const table = (headings, rows, caption) => `<div class="table-scroll"><table><caption>${escapeHtml(caption)}</caption><thead><tr>${headings.map(text => `<th scope="col">${escapeHtml(text)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map((text, i) => i === 0 ? `<th scope="row">${escapeHtml(text)}</th>` : `<td>${escapeHtml(text)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
const tree = node => node.children ? `<details><summary>${escapeHtml(node.name)}</summary><ul>${node.children.map(child => `<li>${tree(child)}</li>`).join('')}</ul></details>` : `${escapeHtml(node.name)} <b>${format(node.value, 0)} M€</b>`;

export function templateValues(data) {
  const { latest, previous, spendingYear, spending, spendingHistory, population, budget, interest } = data;
  const flow = (latest.euros - previous.euros) * 1e12;
  const social = spending.find(item => item.code === '10');
  const status = spendingHistory.at(-1).provisional ? 'provisional' : 'definitivo';
  const period = `${previous.year} → ${latest.year}`;
  return {
    ...repaymentValues(data, { format, escapeHtml }),
    ...financialValues(data, { format, escapeHtml, table, signed }),
    HOUSING_FIRST:data.housing.rows[0].year,HOUSING_YEAR:data.housing.latest.year,HOUSING_BASE:data.housing.baseYear,
    HOUSING_HOUSEHOLDS:format(data.housing.latest.cumulativeHouseholds,0),HOUSING_COMPLETED:format(data.housing.latest.cumulativeCompleted,0),HOUSING_GAP:format(data.housing.latest.cumulativeGap,0),
    HOUSING_BLOCKED:format(data.housing.blockedLatest.households,0),HOUSING_BLOCKED_YEAR:data.housing.blockedLatest.year,
    HOUSING_OPTIONS:data.housing.rows.map(r=>`<option value="${r.year}" ${r.year===data.housing.latest.year?'selected':''}>${r.year}</option>`).join(''),
    HOUSING_TABLE:table(['Año','Hogares creados acumulados','Viviendas terminadas acumuladas','Déficit acumulado desde '+data.housing.rows[0].year,'Nuevos hogares del año','Viviendas terminadas del año','Cambio de la brecha en el año','Hogares bloqueados (estimación ICE)','Precio vs. año anterior','Precio desde '+data.housing.baseYear],data.housing.rows.map(r=>[r.year,format(r.cumulativeHouseholds,0),format(r.cumulativeCompleted,0),format(r.cumulativeGap,0),format(r.newHouseholds,0),format(r.completed,0),format(r.gap,0),r.blockedHouseholds==null?'Sin estimación':format(r.blockedHouseholds,0),signed(r.priceGrowth)+'%',signed(r.priceAccumulated)+'%']),'Hogares, construcción y precio de vivienda en España'),
    INTEREST_YEAR: interest.year, INTEREST_VALUE: format(interest.value,0), INTEREST_DAY: format(interest.perDay,0),
    INTEREST_SOURCE: escapeHtml(data.sources.find(source => source.id === data.config.interestSourceId).download),
    TAX_EXAMPLE_COUNT: interest.example.count, TAX_EXAMPLE_TOTAL: format(interest.example.total,0), TAX_EXAMPLE_REMAINING: format(interest.example.remaining,0),
    TAX_EXAMPLE_SHARE: format(interest.value ? interest.example.total / interest.value * 100 : 0), TAX_EXAMPLE_SHARE_RAW: Math.min(100, interest.value ? interest.example.total / interest.value * 100 : 0),
    TAX_ONLY_NAMES: interest.taxOnlyExample.ids.map(id => escapeHtml(interest.taxes.items.find(item => item.id === id).name.toLowerCase())).join(', '),
    TAX_EXAMPLE_DESCRIPTION: interest.example.ids.map(id => {
      const item = interest.taxes.items.find(item => item.id === id), c = item.control;
      return escapeHtml(item.name) + (c ? (c.type === 'vat' ? ` (general ${c.from}% → ${c.default}%; todos los tipos proporcionalmente)` : ` (−${c.default}%${item.excludeIds?.length ? "; sin RETA" : ""})`) : ' (suprimir)');
    }).join('; '),
    TAX_ONLY_COUNT: interest.taxOnlyExample.count,
    TAX_ONLY_TOTAL: format(interest.taxOnlyExample.total,0),
    TAX_CHOICES: interest.taxes.items.map(item => {
      const selected = interest.example.ids.includes(item.id), c = item.control;
      const rate = c ? (c.type === 'vat' ? `${c.from}% → ${c.default}%` : `−${c.default}%`) : 'Suprimir';
      return `<label class="tax-choice" title="${escapeHtml(item.name)}"><input type="checkbox" value="${escapeHtml(item.id)}" ${selected?'checked':''}><span>${escapeHtml(item.shortName || item.name)}</span><small data-rate="${escapeHtml(item.id)}">${rate}</small><b data-cost="${escapeHtml(item.id)}">${format(measureCost(item),0)} M€</b></label>`;
    }).join(''),
    TAX_ADJUSTMENTS: (() => {
      const adjustable = interest.taxes.items.filter(item => item.control);
      const active = adjustable.find(item => interest.example.ids.includes(item.id));
      return `<div class="tax-adjustments" ${active?'':'hidden'}><p class="tax-adjustment-heading">Ajusta una rebaja <span>Al elegir una pestaña, activas esa medida.</span></p><div class="tax-editor-tabs" role="group" aria-label="Medida a ajustar">${adjustable.map(item => `<button type="button" data-edit="${item.id}" aria-pressed="${active?.id===item.id}" aria-controls="editor-${item.id}">${escapeHtml(item.shortName || item.name)}</button>`).join('')}</div>${adjustable.map(item => {
        const c = item.control;
        const label = c.type === 'vat' ? 'Tipo general de referencia' : 'Reducción proporcional (%)';
        const note = c.type === 'vat' ? 'Todos los tipos bajan proporcionalmente. Estimación.' : item.excludeIds?.length ? 'Sobre cotizaciones sin RETA; los autónomos se contabilizan aparte.' : 'Rebaja proporcional de recaudación; no son puntos de los tipos ni una simulación por tramos.';
        return `<div class="tax-parameter" id="editor-${item.id}" data-editor="${item.id}" ${active?.id===item.id?'':'hidden'}><div class="tax-parameter-top"><label for="rate-${item.id}">${label}</label><output for="rate-${item.id}" data-output="${item.id}">${c.default}%</output></div><input id="rate-${item.id}" data-measure="${item.id}" type="range" min="${c.min}" max="${c.max}" step="1" value="${c.default}" ${interest.example.ids.includes(item.id)?'':'disabled'} aria-describedby="note-${item.id}"><p class="tax-note" id="note-${item.id}">${note}</p></div>`;
      }).join('')}</div>`;
    })(),
    TAX_TABLE: `<div class="table-scroll"><table><caption>Bases anuales · ${interest.year} · millones de euros · ámbitos y criterios por partida</caption><thead><tr><th scope="col">Partida</th><th scope="col">Base (M€)</th><th scope="col">Fuente y metodología</th></tr></thead><tbody>${interest.taxes.items.map(item => `<tr><th scope="row">${escapeHtml(item.name)}</th><td>${format(item.value,3)}</td><td><a href="${escapeHtml(item.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(item.sourceLocator)} ↗</a><p>${escapeHtml(item.basis)}. ${escapeHtml(item.scope)}</p><p>${escapeHtml(item.note)}</p></td></tr>`).join('')}</tbody></table></div>`,
    DEBT: format(latest.euros, 2), YEAR: latest.year, START_YEAR: data.debt[0].year, PREVIOUS_YEAR: previous.year,
    RATIO: format(latest.ratio), RATIO_CHANGE: signed(latest.ratio-previous.ratio), DEBT_CHANGE: signed((latest.euros/previous.euros-1)*100),
    SPENDING_GDP: data.spendingGdp == null ? '—' : format(data.spendingGdp), SOCIAL_SHARE: format(social.share),
    SPENDING_YEAR: spendingYear, SPENDING_STATUS: status, BUDGET_DATASET: escapeHtml(budget.dataset), BUDGET_TOTAL: format(budget.total,0), BUDGET_STATUS: escapeHtml(budget.status),
    PER_CAPITA: format(latest.euros*1e12/population.value,0), POPULATION_DATE: escapeHtml(population.date),
    ANNUAL_FLOW: signed(flow/1e6,0), SECOND_FLOW: signed(flow/(365.25*86400),0), MINUTE_FLOW: signed(flow/(365.25*1440),0), DAY_FLOW: signed(flow/(365.25*1e6),0),
    COUNTER_NOTE: `Proyección desde el cierre de ${latest.year}, al ritmo medio de la variación ${period}. No es una medición en tiempo real ni una predicción: la deuda puede aumentar o disminuir.`,
    SPENDING_TABLE: table(['Función',...spendingHistory.map(row=>`${row.year} (M€)`)],spending.map(item=>[item.name,...spendingHistory.map(row=>format(row.items.find(entry=>entry.code===item.code).value,0))]),'Gasto por funciones COFOG'),
    BUDGET_TREE: tree(budget.root),
    SOURCES: sourceCards(data.sources, { escapeHtml }), SOURCE_COUNT: data.sources.length,
    SPENDING_OPTIONS: spendingHistory.map(row=>`<option value="${row.year}" ${row.year===spendingYear?'selected':''}>${row.year}${row.provisional?' · provisional':''}</option>`).join('')
  };
}

export function fillTemplate(template, values) {
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Variable de plantilla desconocida: ${key}`);
    return values[key];
  });
}
