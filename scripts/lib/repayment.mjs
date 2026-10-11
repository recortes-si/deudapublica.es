export function repaymentModel(raw, {debt,finances,interest,benefits,spendingHistory}) {
  const year=raw.year,stock=debt.find(row=>row.year===year),accounts=finances.rows.find(row=>row.year===year),spending=spendingHistory.find(row=>row.year===year);
  if (!stock || !accounts || !spending || interest.year!==year || benefits?.year!==year) throw new Error('Plan: deuda, intereses, cuentas, COFOG y prestaciones deben compartir año');
  const pension=Array.isArray(benefits.items)?benefits.items.find(item=>item.id==='pensions'):null;
  if (!pension || !Number.isFinite(pension.value) || pension.value<=0 || !Number.isInteger(raw.defaultHorizon) || raw.defaultHorizon<1 || raw.defaultHorizon>raw.maxHorizon || raw.maxHorizon>100 || !Number.isInteger(raw.maxHorizon) || !Number.isFinite(raw.defaultInflation) || raw.defaultInflation<0 || raw.defaultInflation>10) throw new Error('Plan: configuración no válida');
  if (benefits.unit!=='millones de euros' || !benefits.basis || !Array.isArray(benefits.items) || benefits.items.length!==5 || new Set(benefits.items.map(item=>item.id)).size!==5 || benefits.items.some(item=>!['pensions','noncontributory','minimum','imv','family'].includes(item.id) || !item.name || !item.shortName || !item.locator || !item.note || !Number.isFinite(item.value) || item.value<0)) throw new Error('Prestaciones: bases incompletas o duplicadas');
  if (!/^https?:$/.test(new URL(benefits.sourceUrl).protocol)) throw new Error('Prestaciones: fuente no válida');
  const amount=id=>benefits.items.find(item=>item.id===id).value;
  if (!Number.isFinite(benefits.checks?.noncontributoryAndMinimum) || !Number.isFinite(benefits.checks?.imvAndFamily) || Math.abs(amount('noncontributory')+amount('minimum')-benefits.checks?.noncontributoryAndMinimum)>.01 || Math.abs(amount('imv')+amount('family')-benefits.checks?.imvAndFamily)>.01) throw new Error('Prestaciones: desglose no cuadra');
  if (!Array.isArray(raw.cuts) || !raw.cuts.length || new Set(raw.cuts.map(item=>item.id)).size!==raw.cuts.length || new Set(raw.cuts.map(item=>item.code)).size!==raw.cuts.length) throw new Error('Plan: partidas duplicadas o vacías');
  const cuts=raw.cuts.map(item=>{
    const category=spending.items.find(row=>row.code===item.code);
    if (!category || !/^[a-z]+$/.test(item.id) || !item.name || !item.note || (item.code==='10' && item.id!=='social') || (item.excludeInterest && item.code!=='01') || (item.code==='01' && !item.excludeInterest)) throw new Error('Plan: partida incompatible o solapada');
    const base=category.value-(item.excludeInterest?interest.value:0);
    if (base<0) throw new Error('Plan: base negativa');
    return {...item,base,share:base/accounts.expenditure*100};
  });
  if (!Array.isArray(raw.pensionModes) || !raw.pensionModes.some(item=>item.id==='ipc' && item.rate===null) || !raw.pensionModes.some(item=>item.id==='freeze' && item.rate===0) || new Set(raw.pensionModes.map(item=>item.id)).size!==raw.pensionModes.length || raw.pensionModes.some(item=>!item.label || (item.rate!==null && (!Number.isFinite(item.rate) || item.rate<0 || item.rate>10)))) throw new Error('Plan: opciones de pensiones no válidas');
  for (const url of [raw.pensionReformUrl,raw.pensionIpcUrl]) if (!/^https?:$/.test(new URL(url).protocol)) throw new Error('Plan: fuente no válida');
  const principal=stock.euros*1e6;
  return {...raw,cuts,debt:principal,interest:interest.value,primary:accounts.balance+interest.value,deficit:-accounts.balance,expenditure:accounts.expenditure,revenue:accounts.revenue,fiscalRevenue:accounts.fiscalRevenue,pensionBase:pension.value,benefits:benefits.items.map(item=>({...item,base:item.value})),benefitsSource:benefits.sourceUrl,benefitsBasis:benefits.basis,rate:interest.value/principal,education:spending.items.find(row=>row.code==='09').value,spendingProvisional:spending.provisional};
}
