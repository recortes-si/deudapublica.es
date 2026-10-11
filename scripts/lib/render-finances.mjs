export function financialValues(data, {format,escapeHtml,table,signed}) {
  const {finances:f}=data;
  const source = key => escapeHtml(data.sources.find(item=>item.id===data.config[key]).url);
  const selected=f.latest;
  const p=data.fiscalContext,meiFirst=p.mei[0],meiLast=p.mei.at(-1),currentYear=Number(data.generatedAt.slice(0,4));
  return {
    FISCAL_YEAR_MIN:f.first.year,FISCAL_YEAR_MAX:f.latest.year,FISCAL_SELECTED_YEAR:selected.year,
    YOUTH_FIRST_YEAR:meiFirst.year,YOUTH_LAST_YEAR:meiLast.year,YOUTH_FIRST_RATE:format(meiFirst.total),YOUTH_LAST_RATE:format(meiLast.total),YOUTH_MULTIPLIER:format(meiLast.total/meiFirst.total,0),YOUTH_BASE:format(p.exampleAnnualBase,0),YOUTH_FIRST_COST:format(p.exampleAnnualBase*meiFirst.total/100,0),YOUTH_LAST_COST:format(p.exampleAnnualBase*meiLast.total/100,0),YOUTH_EMPLOYER_COST:format(p.exampleAnnualBase*meiLast.employer/100,0),YOUTH_EMPLOYEE_COST:format(p.exampleAnnualBase*meiLast.employee/100,0),YOUTH_END_YEAR:p.meiEndYear,YOUTH_MAINTAIN_FROM:meiLast.year+1,
    FINANCE_DEBT_SOURCE:source('debtSourceId'),
    FINANCE_DEBT:data.debt.some(row=>row.year===selected.year)?format(data.debt.find(row=>row.year===selected.year).euros*1e6,0)+' M€':'sin dato disponible',
    FINANCE_BALANCE_NAME:f.latest.balance<0?'déficit':f.latest.balance>0?'superávit':'equilibrio',
    YOUTH_BARS:data.fiscalContext.mei.map(row=>`<div class="mei-year ${row.year>currentYear?'future-rate':''}"><strong>${format(row.total,2)}%</strong><div class="mei-bar"><span style="height:${row.total/Math.max(...p.mei.map(item=>item.total))*100}%"></span></div><b>${row.year}</b><small>${row.year>currentYear?'previsto por ley':'en vigor ese año'}</small></div>`).join(''),
    YOUTH_TABLE:table(['Año','MEI total / base','Empresa / base','Trabajador / base'],data.fiscalContext.mei.map(row=>[row.year,format(row.total,2)+'%',format(row.employer,2)+'%',format(row.employee,2)+'%']),'MEI · Régimen General · calendario legal, no previsión de carga fiscal total'),
    FINANCE_REVENUE:format(selected.revenue,0),
    FINANCE_PARTS:selected.incomeParts.filter(part=>part.value>0).map(part=>`<div class="income-part"><div><strong>${escapeHtml(part.name)}</strong><span>${format(part.value,0)} M€ · ${format(part.value/selected.revenue*100)}%</span></div><div class="income-track"><span style="width:${part.value/selected.revenue*100}%"></span></div><p>${escapeHtml(part.description)}</p></div>`).join(''),
    FINANCE_FIRST:f.first.year,FINANCE_YEAR:f.latest.year,FINANCE_TAX_GROWTH:signed(f.taxGrowth),FINANCE_SPEND_GROWTH:signed(f.spendingGrowth),FINANCE_BALANCE:signed(f.latest.balance,0),FINANCE_SOURCE:source('financesSourceId'),
    FINANCE_TABLE:table(['Año','Otros impuestos (M€)','Cotizaciones (M€)','Impuestos + cotizaciones (M€)','Ingresos totales (M€)','Gasto (M€)','Saldo (M€)','Deuda total al cierre (M€)'],f.rows.map(row=>[row.year,format(row.taxes,0),format(row.social,0),format(row.fiscalRevenue,0),format(row.revenue,0),format(row.expenditure,0),signed(row.balance,0),data.debt.some(item=>item.year===row.year)?format(data.debt.find(item=>item.year===row.year).euros*1e6,0):'Sin dato']),'Finanzas públicas · España · S.13 · euros corrientes · SEC 2010'),
  };
}
