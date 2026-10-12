import { financeInflationSeries } from '../../src/shared/inflation.mjs';
import { governmentForYear } from '../../src/shared/debt-timeline.mjs';
export function financialValues(data, {format,escapeHtml,table,signed}) {
  const {finances:f}=data;
  const source = key => escapeHtml(data.sources.find(item=>item.id===data.config[key]).url);
  const debtByYear = new Map(data.debt.map(row=>[row.year,row]));
  // PIB nominal implícito en millones de euros: deuda (billones) × 1e6 / (ratio/100).
  const gdp = row => { const d=debtByYear.get(row.year); return d ? d.euros*1e6*100/d.ratio : null; };
  const gdpFirst = gdp(f.first), gdpLast = gdp(f.latest);
  const gdpGrowth = gdpFirst && gdpLast ? (gdpLast/gdpFirst-1)*100 : null;
  const selected=f.latest, story=financeInflationSeries(f,data.debtHistory,data.config.inflationBaselineYear??f.first.year,data.citizenIncome), end=story.rows.at(-1);
  return {
    INFLATION_DEBT_GROWTH:story.debtGrowth==null?'Sin dato':signed(story.debtGrowth)+'%',
    INFLATION_COMPARE_FIRST:story.firstYear,
    INFLATION_COMPARE_YEAR:story.lastYear,INFLATION_TAX_NOMINAL:signed(end.taxIndex-100),INFLATION_SPEND_NOMINAL:signed(end.spendIndex-100),INFLATION_NET_GROWTH:signed(story.netGrowth),INCOME_SOURCE:source('citizenIncomeSourceId'),
    INFLATION_START_OPTIONS:f.rows.filter(row=>row.year<story.lastYear).map(row=>`<option value="${row.year}" ${row.year===story.firstYear?'selected':''}>${row.year}</option>`).join(''),
    FISCAL_PRICE_INDEX_EXACT:format(end.priceIndex),
    FISCAL_TAX_INDEX:format(end.taxIndex,0),FISCAL_SPEND_INDEX:format(end.spendIndex,0),FISCAL_PRICE_INDEX:format(end.priceIndex,0),INFLATION_LOSS:format(end.loss),
    INFLATION_SERIES_TABLE:table(['Año','Subida de impuestos + cotizaciones','Subida del gasto','Subida de los precios','Subida del salario neto del perfil OCDE','Poder de compra del ahorro sin rendimiento','Inflación anual','Subida de deuda nominal'],story.rows.map(row=>[row.year,signed(row.taxIndex-100)+'%',signed(row.spendIndex-100)+'%',signed(row.priceIndex-100)+'%',signed(row.netIndex-100)+'%',format(row.purchasingPower)+' €',row.annualInflation==null?'Sin dato':signed(row.annualInflation)+'%',row.debtIndex==null?'Sin dato':signed(row.debtIndex-100)+'%']),'Variación desde '+story.firstYear+' · poder de compra expresado en euros de ese año · inflación IPCA media anual'),
    INFLATION_PRICE_GROWTH:format(end.priceIndex-100),INFLATION_PURCHASING:format(end.purchasingPower),INFLATION_PURCHASING_RAW:end.purchasingPower,
    INFLATION_TAX_REAL:signed(story.taxGrowthReal),INFLATION_SPEND_REAL:signed(story.spendGrowthReal),
    DEBT_EVENTS:data.debtTimeline.events.map(event=>`<span><b>${event.year}</b> · <a href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(event.label)} ↗</a></span>`).join(''),
    GOVERNMENT_SOURCE:escapeHtml(data.debtTimeline.governmentSourceUrl),
    REAL_BASE_YEAR:data.debtHistory.baseYear, INFLATION_SOURCE:source('inflationSourceId'),
    FISCAL_YEAR_MIN:f.first.year,FISCAL_YEAR_MAX:f.latest.year,FISCAL_SELECTED_YEAR:selected.year,
    FINANCE_DEBT_SOURCE:source('debtSourceId'),
    EVOLUTION_BALANCE:signed(selected.balance/1000,1),
    EVOLUTION_DEBT:debtByYear.has(selected.year)?format(debtByYear.get(selected.year).euros*1000,1):'Sin dato',
    FINANCE_BALANCE_SIGN:selected.balance<0?'deficit':selected.balance>0?'surplus':'balanced',
    DEBT_BALANCE_TABLE:table(['Año','Saldo nominal (M€)','Deuda nominal (M€)','Deuda / PIB','Saldo a precios de '+data.debtHistory.baseYear+' (M€)','Deuda a precios de '+data.debtHistory.baseYear+' (M€)','Gobierno durante más días del año'],f.rows.map(row=>[row.year,signed(row.balance,0),debtByYear.has(row.year)?format(debtByYear.get(row.year).euros*1e6,0):'Sin dato',debtByYear.has(row.year)?format(debtByYear.get(row.year).ratio)+'%':'Sin dato',format(row.balance*data.debtHistory.rows.find(item=>item.year===row.year).priceFactor,0),debtByYear.has(row.year)?format(debtByYear.get(row.year).euros*1e6*data.debtHistory.rows.find(item=>item.year===row.year).priceFactor,0):'Sin dato',governmentForYear(data.debtTimeline,row.year)?.name ?? 'Sin dato']),'Serie anual de deuda pública y saldo de todas las Administraciones · nominal y constante a precios de '+data.debtHistory.baseYear),
    FINANCE_BALANCE_NAME:f.latest.balance<0?'déficit':f.latest.balance>0?'superávit':'equilibrio',
    FINANCE_REVENUE:format(selected.revenue,0),
    FINANCE_PARTS:selected.incomeParts.filter(part=>part.value>0).map(part=>`<div class="income-part"><div><strong>${escapeHtml(part.name)}</strong><span>${format(part.value,0)} M€ · ${format(part.value/selected.revenue*100)}%</span></div><div class="income-track"><span style="width:${part.value/selected.revenue*100}%"></span></div><p>${escapeHtml(part.description)}</p></div>`).join(''),
    FINANCE_FIRST:f.first.year,FINANCE_YEAR:f.latest.year,FINANCE_TAX_GROWTH:signed(f.taxGrowth),FINANCE_SPEND_GROWTH:signed(f.spendingGrowth),FINANCE_BALANCE:signed(f.latest.balance,0),FINANCE_SOURCE:source('financesSourceId'),
    FINANCE_GDP_GROWTH: gdpGrowth == null ? '—' : signed(gdpGrowth),
    FINANCE_GDP_FIRST: gdpFirst == null ? '—' : format(gdpFirst/1000,0),
    FINANCE_GDP_LAST: gdpLast == null ? '—' : format(gdpLast/1000,0),
    FINANCE_SPEND_GDP_FIRST: gdpFirst == null ? '—' : format(f.first.expenditure/gdpFirst*100),
    FINANCE_SPEND_GDP_LAST: gdpLast == null ? '—' : format(f.latest.expenditure/gdpLast*100),
    FINANCE_TABLE:table(['Año','Otros impuestos (M€)','Cotizaciones (M€)','Impuestos + cotizaciones (M€)','Ingresos totales (M€)','Gasto (M€)','PIB (M€)','Saldo (M€)','Deuda total al cierre (M€)'],f.rows.map(row=>[row.year,format(row.taxes,0),format(row.social,0),format(row.fiscalRevenue,0),format(row.revenue,0),format(row.expenditure,0),gdp(row)==null?'—':format(gdp(row),0),signed(row.balance,0),data.debt.some(item=>item.year===row.year)?format(data.debt.find(item=>item.year===row.year).euros*1e6,0):'Sin dato']),'Finanzas públicas · España · S.13 · euros corrientes · SEC 2010 · PIB derivado de la deuda y la ratio de cada año'),
  };
}
