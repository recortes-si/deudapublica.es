// Amounts are M€. Annual primary balances; interest follows outstanding debt.
export function repaymentProjection({ debt, primary, rate, years, primaryByYear }) {
  if (![debt, primary, rate].every(Number.isFinite) || debt < 0 || rate < 0 || rate > 1 || !Number.isInteger(years) || years < 1 || years > 100) throw new Error('Plan: parámetros fuera de rango');
  if (primaryByYear && (!Array.isArray(primaryByYear) || primaryByYear.length<years || primaryByYear.some(value=>!Number.isFinite(value)))) throw new Error('Plan: saldos anuales no válidos');
  const rows = [{ offset:0, debt, interest:0, principal:0 }];
  let totalInterest=0, paidAfter=debt===0?0:null;
  for (let offset=1; offset<=years; offset++) {
    const previous=rows.at(-1).debt;
    const interest=previous*rate;
    const annualPrimary=primaryByYear?.[offset-1]??primary;
    const remaining=previous+interest-annualPrimary;
    const next=remaining<1e-6?0:remaining;
    totalInterest+=interest;
    rows.push({offset,debt:next,interest,principal:previous-next,balance:annualPrimary-interest});
    if (next===0 && paidAfter===null) paidAfter=offset;
  }
  return {rows,totalInterest,paidAfter};
}
export function requiredPrimary(debt, rate, years) {
  if (!Number.isFinite(debt) || debt<0 || !Number.isFinite(rate) || rate<0 || rate>1 || !Number.isInteger(years) || years<1 || years>100) throw new Error('Plan: objetivo fuera de rango');
  return rate===0 ? debt/years : debt*rate/(-Math.expm1(-years*Math.log1p(rate)));
}
export function repaymentMeasures(plan, { inflation, pensionMode, reductions }) {
  if (!Number.isFinite(inflation) || inflation<0 || inflation>10) throw new Error('Plan: IPC fuera de rango');
  const mode=plan.pensionModes.find(item=>item.id===pensionMode);
  if (!mode) throw new Error('Plan: revalorización desconocida');
  const pensionRate=mode.rate===null?inflation:mode.rate;
  const reduction=id=>{const value=reductions[id]??0;if(!Number.isFinite(value)||value< -100||value>100)throw new Error('Plan: recorte fuera de rango');return value/100;};
  const pensionFactor=(1+pensionRate/100)*(1-reduction('pensions'))/(1+inflation/100);
  const benefits=plan.benefits.map(item=>({id:item.id,name:item.name,value:item.base*(item.id==='pensions'?1-pensionFactor:reduction(item.id))}));
  const benefitSaving=benefits.reduce((sum,item)=>sum+item.value,0);
  const items=[...benefits,...plan.cuts.map(item=>({id:item.id,name:item.name,value:(item.id==='social'?item.base-benefitSaving:item.base)*reduction(item.id)}))];
  return {items,total:items.reduce((sum,item)=>sum+item.value,0),pensionRate,pensionPurchasingChange:pensionFactor*(1-reduction('social'))-1,pensionNominalChange:(1+pensionRate/100)*(1-reduction('pensions'))*(1-reduction('social'))-1};
}

// Tax changes affect fiscal revenue, including social contributions; growth is nominal.
export function repaymentRevenue(plan,{taxChange=0,growth=0,years}) {
 if (!Number.isFinite(taxChange)||taxChange< -50||taxChange>100||!Number.isFinite(growth)||growth<0||growth>10||!Number.isInteger(years)||years<1||years>100) throw new Error('Ingresos: parámetros fuera de rango');
 const tax=plan.fiscalRevenue*taxChange/100;
 const rows=Array.from({length:years},(_,index)=>{const growthValue=plan.fiscalRevenue*(1+taxChange/100)*Math.expm1((index+1)*Math.log1p(growth/100));return{offset:index+1,tax,growth:growthValue,total:tax+growthValue};});
 return {rows,first:rows[0].total,items:[{id:'tax-income',name:'Cambio de recaudación fiscal',value:tax},{id:'growth-income',name:'Ingresos por crecimiento · primer año',value:rows[0].growth}]};
}
export function requiredSpendingAdjustment({debt,primary,rate,years,extraRevenue}) {
 const payment=requiredPrimary(debt,rate,years);
 if(!Number.isFinite(primary)||!Array.isArray(extraRevenue)||extraRevenue.length<years||extraRevenue.some(value=>!Number.isFinite(value)))throw new Error('Plan: ingresos anuales no válidos');
 const discount=Array.from({length:years},(_,index)=>(1+rate)**(-index-1));
 const equivalent=extraRevenue.slice(0,years).reduce((sum,value,index)=>sum+value*discount[index],0)/discount.reduce((sum,value)=>sum+value,0);
 return payment-primary-equivalent;
}
