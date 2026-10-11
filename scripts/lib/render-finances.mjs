import { economyValues } from './render-economy.mjs';
import { workerScenario } from '../../src/shared/worker.mjs';
export function financialValues(data, {format,escapeHtml,table,signed}) {
  const {finances:f,worker:w}=data;
  const source = key => escapeHtml(data.sources.find(item=>item.id===data.config[key]).url);
  const commonYears=f.rows.map(row=>row.year).filter(year=>w.history.some(row=>row.year===year));
  if (!commonYears.length) throw new Error('No hay años comunes para la comparación fiscal');
  const selected=f.rows.find(row=>row.year===commonYears.at(-1));
  const selectedNet=100-w.history.find(row=>row.year===selected.year).taxWedgePercent;
  const selectedDifference=selectedNet-w.firstNet;
  const p=data.fiscalContext,meiFirst=p.mei[0],meiLast=p.mei.at(-1),currentYear=Number(data.generatedAt.slice(0,4));
  const firstConsumption=workerScenario(w.history[0],data.fiscalContext);
  const lastConsumption=workerScenario(w.history.at(-1),data.fiscalContext);
  return {
    ...economyValues(data,{format,escapeHtml,table,signed}),
    FISCAL_WORKER_NET:format(selectedNet),FISCAL_WORKER_DIFFERENCE:Math.abs(selectedDifference)<1e-8 ? `Referencia inicial: la carga fiscal de ${w.history[0].year}.` : `${format(Math.abs(selectedDifference))} € ${selectedDifference<0?'menos':'más'} que con la carga fiscal de ${w.history[0].year}.`,
    FISCAL_YEAR_MIN:commonYears[0],FISCAL_YEAR_MAX:commonYears.at(-1),FISCAL_SELECTED_YEAR:selected.year,
    FISCAL_WORKER_USEFUL:format(workerScenario(w.history.find(row=>row.year===selected.year),p).retained),
    YOUTH_FIRST_YEAR:meiFirst.year,YOUTH_LAST_YEAR:meiLast.year,YOUTH_FIRST_RATE:format(meiFirst.total),YOUTH_LAST_RATE:format(meiLast.total),YOUTH_MULTIPLIER:format(meiLast.total/meiFirst.total,0),YOUTH_BASE:format(p.exampleAnnualBase,0),YOUTH_FIRST_COST:format(p.exampleAnnualBase*meiFirst.total/100,0),YOUTH_LAST_COST:format(p.exampleAnnualBase*meiLast.total/100,0),YOUTH_EMPLOYER_COST:format(p.exampleAnnualBase*meiLast.employer/100,0),YOUTH_EMPLOYEE_COST:format(p.exampleAnnualBase*meiLast.employee/100,0),YOUTH_END_YEAR:p.meiEndYear,YOUTH_MAINTAIN_FROM:meiLast.year+1,
    WORKER_FIRST_USEFUL:format(firstConsumption.retained),WORKER_LAST_USEFUL:format(lastConsumption.retained),WORKER_USEFUL_LOSS:format((firstConsumption.retained-lastConsumption.retained)/firstConsumption.retained*100),
    FINANCE_BALANCE_NAME:f.latest.balance<0?'déficit':f.latest.balance>0?'superávit':'equilibrio',
    YOUTH_BARS:data.fiscalContext.mei.map(row=>`<div class="mei-year ${row.year>currentYear?'future-rate':''}"><strong>${format(row.total,2)}%</strong><div class="mei-bar"><span style="height:${row.total/Math.max(...p.mei.map(item=>item.total))*100}%"></span></div><b>${row.year}</b><small>${row.year>currentYear?'previsto por ley':'en vigor ese año'}</small></div>`).join(''),
    YOUTH_TABLE:table(['Año','MEI total / base','Empresa / base','Trabajador / base'],data.fiscalContext.mei.map(row=>[row.year,format(row.total,2)+'%',format(row.employer,2)+'%',format(row.employee,2)+'%']),'MEI · Régimen General · calendario legal, no previsión de carga fiscal total'),
    FINANCE_REVENUE:format(selected.revenue,0),
    FINANCE_PARTS:selected.incomeParts.filter(part=>part.value>0).map(part=>`<div class="income-part"><div><strong>${escapeHtml(part.name)}</strong><span>${format(part.value,0)} M€ · ${format(part.value/selected.revenue*100)}%</span></div><div class="income-track"><span style="width:${part.value/selected.revenue*100}%"></span></div><p>${escapeHtml(part.description)}</p></div>`).join(''),
    WORKER_LOSS:format(w.netLoss),WORKER_RELATIVE_LOSS:format(w.relativeNetLoss),
    FINANCE_FIRST:f.first.year,FINANCE_YEAR:f.latest.year,FINANCE_TAX_GROWTH:signed(f.taxGrowth),FINANCE_SPEND_GROWTH:signed(f.spendingGrowth),FINANCE_BALANCE:signed(f.latest.balance,0),FINANCE_SOURCE:source('financesSourceId'),
    FINANCE_TABLE:table(['Año','Otros impuestos (M€)','Cotizaciones (M€)','Impuestos + cotizaciones (M€)','Ingresos totales (M€)','Gasto (M€)','Saldo (M€)'],f.rows.map(row=>[row.year,format(row.taxes,0),format(row.social,0),format(row.fiscalRevenue,0),format(row.revenue,0),format(row.expenditure,0),signed(row.balance,0)]),'Finanzas públicas · España · S.13 · euros corrientes · SEC 2010'),
    WORKER_YEAR:w.year,WORKER_PROFILE:escapeHtml(w.profile),WORKER_NET:format(w.net),WORKER_SOURCE:source('workerSourceId'),WORKER_FIRST_YEAR:w.history[0].year,WORKER_FIRST_NET:format(100-w.history[0].taxWedgePercent),
    WORKER_TABLE:table(['Año','Cuña fiscal / coste laboral','Neto antes de consumo / coste laboral','Tras IVA general (escenario) / coste laboral'],w.history.map(row=>[row.year,format(row.taxWedgePercent)+'%',format(100-row.taxWedgePercent)+'%',format(workerScenario(row,data.fiscalContext).retained)+'%']),'Trabajador soltero sin hijos · 100% del salario medio · OCDE, edición 2026')
  };
}
