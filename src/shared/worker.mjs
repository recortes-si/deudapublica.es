export function workerEuro(taxWedgePercent, vatPercent = 0) {
  if (!Number.isFinite(taxWedgePercent) || taxWedgePercent < 0 || taxWedgePercent > 100 || !Number.isFinite(vatPercent) || vatPercent < 0 || vatPercent > 100) throw new Error('Porcentajes del trabajador fuera de rango');
  const net = 100 - taxWedgePercent;
  const purchasing = net / (1 + vatPercent / 100);
  return { net, labourTaxes:taxWedgePercent, purchasing, vat:net-purchasing };
}

export function validateFiscalContext(policy) {
  if (!Array.isArray(policy?.vat) || !policy.vat.length || !Array.isArray(policy.mei) || policy.mei.length<2) throw new Error('Calendario fiscal incompleto');
  policy.vat.forEach((row,i)=>{
    workerEuro(0,row.rate);
    if (!Number.isInteger(row.year) || !Number.isInteger(row.month) || row.month<1 || row.month>12 || (i && row.year*12+row.month<=policy.vat[i-1].year*12+policy.vat[i-1].month)) throw new Error('Calendario IVA no válido');
  });
  if (!Number.isFinite(policy.exampleAnnualBase) || policy.exampleAnnualBase<=0 || !Number.isInteger(policy.meiEndYear) || policy.meiEndYear<policy.mei.at(-1).year || policy.mei[0].total<=0) throw new Error('Ejemplo MEI no válido');
  policy.mei.forEach((row,i)=>{
    if (!Number.isInteger(row.year) || (i && row.year!==policy.mei[i-1].year+1) || [row.total,row.employer,row.employee].some(value=>!Number.isFinite(value) || value<0 || value>100) || Math.abs(row.total-row.employer-row.employee)>1e-8) throw new Error('Calendario MEI no válido');
  });
  for (const key of ['vatSource','meiSource']) if (!/^https?:$/.test(new URL(policy[key]).protocol)) throw new Error('Fuente fiscal no válida');
}

// Equal monthly spending, tax-inclusive prices; savings are retained, not consumed.
export function workerScenario(row,policy,spentPercent=100,otherPercent=0,vatMode='historic') {
  if ([spentPercent,otherPercent].some(value=>!Number.isFinite(value) || value<0 || value>100)) throw new Error('Supuestos de consumo fuera de rango');
  if (!['historic','0','4','10','21'].includes(String(vatMode))) throw new Error('Escenario IVA no válido');
  const net=workerEuro(row.taxWedgePercent).net, spent=net*spentPercent/100;
  let base=0;
  for(let month=1;month<=12;month++) {
    const schedule=policy.vat.filter(item=>item.year*12+item.month<=row.year*12+month).at(-1);
    if(!schedule) throw new Error('Falta IVA para el año del trabajador');
    const rate=vatMode==='historic'?schedule.rate:Number(vatMode);
    base+=spent/(1+rate/100)/12;
  }
  const savings=net-spent,vat=spent-base,other=base*otherPercent/100,purchasing=base-other;
  return {net,savings,other,vat,purchasing,retained:savings+purchasing,labourTaxes:100-net};
}
