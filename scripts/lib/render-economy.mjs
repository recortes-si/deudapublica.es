import {workerScenario} from '../../src/shared/worker.mjs';
export function economyValues(data,{format,escapeHtml,table,signed}) {
  const e=data.earnings,t=data.commonTaxes,first=e.first,last=e.latest,h=t.housing;
  const selected=e.rows.find(row=>row.year===Number(data.finances.latest.year)) || last;
  const consumption=workerScenario({year:selected.year,taxWedgePercent:selected.taxShare},data.fiscalContext);
  const housing=t.items.find(item=>item.id==='housing');
  const source=key=>escapeHtml(data.sources.find(item=>item.id===data.config[key]).url);
  return {
    ECONOMY_ESTIMATE_NOTE:e.rows.some(row=>row.estimated)?`Salario de ${e.rows.filter(row=>row.estimated).map(row=>row.year).join(', ')}: estimación de la Secretaría de la OCDE.`:'',
    STATE_TAX_TOTAL:format(100-consumption.retained),STATE_RETAINED:format(consumption.retained),
    ECONOMY_FIRST_YEAR:first.year,ECONOMY_LAST_YEAR:last.year,
    ECONOMY_GROSS_GROWTH:signed(e.grossGrowth),ECONOMY_PRICE_GROWTH:signed(e.priceGrowth),ECONOMY_REAL_NET_GROWTH:signed(e.realNetGrowth),
    ECONOMY_GROSS:format(last.gross,0),ECONOMY_NET:format(last.net,0),ECONOMY_REAL_NET:format(last.realNet,0),ECONOMY_TAX_SHARE:format(last.taxShare),
    ECONOMY_SOURCE:source('earningsSourceId'),INFLATION_SOURCE:source('inflationSourceId'),
    COMMON_TAX_CARDS:t.items.map((item,i)=>`<button type="button" class="common-tax-choice ${i===0?'active':''}" data-common-tax="${escapeHtml(item.id)}" aria-pressed="${i===0}"><span>${escapeHtml(item.name)}</span><strong>${format(Number(item.first.rate.toFixed(6)))}% <b>→</b> ${format(Number(item.latest.rate.toFixed(6)))}%</strong><small>${item.first.year} → ${item.latest.year} · ${escapeHtml(item.base)}</small></button>`).join(''),
    COMMON_TAX_FIRST_NAME:escapeHtml(t.items[0].name),COMMON_TAX_FIRST_BASE:escapeHtml(t.items[0].base),COMMON_TAX_FIRST_DESCRIPTION:escapeHtml(t.items[0].description),
    COMMON_TAX_TABLE:table(['Año',...t.items.map(item=>item.name+' (%)')],e.rows.map(row=>[row.year,...t.items.map(item=>format(item.rows.find(x=>x.year===row.year).rate,2))]),'Tipos legales al cierre del año para IVA; tipos efectivos sobre salario bruto para IRPF y cotizaciones. Las columnas tienen bases diferentes y no se suman.'),
    ECONOMY_TABLE:table(['Año','Estado del salario','Bruto (€)','IRPF (€)','Cuota trabajador (€)','Cuota empresa (€)','Neto (€)','Coste laboral (€)','IPCA (base inicial 100)','Neto real (€ iniciales)','Carga laboral / coste'],e.rows.map(row=>[row.year,row.estimated?'Estimación OCDE':'Serie OCDE',format(row.gross,0),format(row.incomeTax,0),format(row.employeeSSC,0),format(row.employerSSC,0),format(row.net,0),format(row.cost,0),format(row.prices,2),format(row.realNet,0),format(row.taxShare,2)+'%']),'Perfil OCDE soltero sin hijos, 100% salario medio; deflactor IPCA medio anual, euros constantes del primer año; no representa una cohorte por edad.'),
    HOUSING_PRICE:format(h.examplePrice,0),HOUSING_FIRST_TAX:format(h.examplePrice*housing.first.rate/100,0),HOUSING_LAST_TAX:format(h.examplePrice*housing.latest.rate/100,0),HOUSING_TAX_EXTRA:format(h.examplePrice*(housing.latest.rate-housing.first.rate)/100,0),HOUSING_CUTOFF_YEAR:h.cutoffYear,HOUSING_DEDUCTION:format(h.deductionBase*h.deductionRate/100,0),HOUSING_DEDUCTION_BASE:format(h.deductionBase,0),HOUSING_DEDUCTION_RATE:format(h.deductionRate),HOUSING_SOURCE:escapeHtml(h.source)
  };
}
