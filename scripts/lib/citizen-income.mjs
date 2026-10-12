import { parseCsv } from './csv.mjs';

export function citizenIncomeModel(text,source) {
  const records=parseCsv(text),header=records.shift();
  const columns=['REF_AREA','MEASURE','UNIT_MEASURE','HOUSEHOLD_TYPE','INCOME_PRINCIPAL','INCOME_SPOUSE','FREQ','TIME_PERIOD','OBS_VALUE','UNIT_MULT'];
  if(columns.some(key=>!header.includes(key)))throw new Error('Ingresos OCDE: faltan columnas');
  const estimated=source.estimatedYears??[];
  if(!Array.isArray(estimated)||estimated.some(year=>!Number.isInteger(year)))throw new Error('Ingresos OCDE: años estimados inválidos');
  const rows=records.map(values=>Object.fromEntries(header.map((key,i)=>[key,values[i]]))).filter(row=>row.MEASURE==='THP'&&!estimated.includes(Number(row.TIME_PERIOD))).map(row=>{
    if(row.REF_AREA!=='ESP'||row.UNIT_MEASURE!=='XDC'||row.HOUSEHOLD_TYPE!=='S_C0'||row.INCOME_PRINCIPAL!=='AW100'||row.INCOME_SPOUSE!=='_Z'||row.FREQ!=='A'||row.UNIT_MULT!=='0')throw new Error('Ingresos OCDE: perfil o unidades incompatibles');
    const year=Number(row.TIME_PERIOD),net=Number(row.OBS_VALUE);
    if(!Number.isInteger(year)||!(net>0)||!Number.isFinite(net))throw new Error('Ingresos OCDE: observación inválida');
    return {year,net};
  }).sort((a,b)=>a.year-b.year);
  if(rows.length<2||new Set(rows.map(row=>row.year)).size!==rows.length||rows.some((row,i)=>i&&row.year!==rows[i-1].year+1))throw new Error('Ingresos OCDE: faltan años consecutivos o hay duplicados');
  return {sourceId:source.id,profile:'Persona soltera sin hijos, con el 100% del salario medio',rows,lastYear:rows.at(-1).year};
}
