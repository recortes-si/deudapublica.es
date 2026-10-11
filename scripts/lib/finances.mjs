import { numeric } from './csv.mjs';
import { workerEuro } from '../../src/shared/worker.mjs';

export function financesModel(raw) {
  for (const [dimension,code] of Object.entries({ freq:'A',unit:'MIO_EUR',sector:'S13',geo:'ES' })) {
    const index = raw.dimension?.[dimension]?.category?.index;
    if (!index || Object.keys(index).length !== 1 || !(code in index)) throw new Error(`Finanzas: se esperaba ${dimension}=${code}`);
  }
  const required = ['TE','TR','D2REC','D5REC','D91REC','D61REC','B9','P11_P12_P131','D4REC','D7REC','D9REC','D39REC'];
  if (raw.id?.join(',') !== 'freq,unit,sector,na_item,geo,time' || raw.size?.[3] !== Object.keys(raw.dimension.na_item.category.index).length || raw.size?.[5] !== Object.keys(raw.dimension.time.category.index).length) throw new Error('Finanzas: estructura Eurostat inesperada');
  const count = raw.size[5];
  const value = (code,time) => {
    const itemIndex = raw.dimension.na_item.category.index[code];
    if (itemIndex == null) throw new Error(`Finanzas: falta ${code}`);
    const observation = raw.value[itemIndex*count+time];
    if (observation == null || !Number.isFinite(observation) || (code !== 'B9' && observation < 0)) throw new Error(`Finanzas: dato inválido ${code}`);
    return observation;
  };
  const rows = Object.entries(raw.dimension.time.category.index).map(([year,time]) => {
    const observations = Object.fromEntries(required.map(code => [code,value(code,time)]));
    if (!/^\d{4}$/.test(year) || Math.abs(observations.TR-observations.TE-observations.B9)>1) throw new Error(`Finanzas: año o saldo incoherente ${year}`);
    const taxes = observations.D2REC+observations.D5REC+observations.D91REC;
    if (taxes+observations.D61REC > observations.TR+1) throw new Error(`Finanzas: partidas superiores al ingreso total ${year}`);
    const incomeParts = [
      {id:'taxes',name:'Otros impuestos',value:taxes,description:'IRPF, IVA, Sociedades y otros impuestos sobre producción, renta y capital.'},
      {id:'social',name:'Cotizaciones sociales · también impuestos',value:observations.D61REC,description:'Carga fiscal de empresas y trabajadores; el agregado incluye cotizaciones imputadas según SEC 2010.'},
      {id:'sales',name:'Ventas y servicios',value:observations.P11_P12_P131,description:'Ventas, pagos por servicios públicos y producción para uso propio. No todo este agregado es cobro en caja.'},
      {id:'property',name:'Rentas de la propiedad',value:observations.D4REC,description:'Intereses, dividendos y otras rentas de activos públicos.'},
      {id:'current',name:'Transferencias corrientes',value:observations.D7REC,description:'Transferencias recibidas de otros sectores, incluidas instituciones europeas cuando corresponda.'},
      {id:'capital',name:'Transferencias de capital',value:observations.D9REC-observations.D91REC,description:'Ayudas a la inversión y otras transferencias de capital, sin duplicar los impuestos sobre capital.'},
      {id:'subsidies',name:'Subvenciones recibidas',value:observations.D39REC,description:'Otras subvenciones a la producción recibidas por las Administraciones.'}
    ];
    if (incomeParts.some(part=>part.value<0) || Math.abs(incomeParts.reduce((sum,part)=>sum+part.value,0)-observations.TR)>2) throw new Error(`Finanzas: desglose de ingresos incoherente ${year}`);
    return { year:Number(year),taxes,fiscalRevenue:taxes+observations.D61REC,incomeParts,social:observations.D61REC,revenue:observations.TR,expenditure:observations.TE,balance:observations.B9 };
  }).sort((a,b)=>a.year-b.year);
  if (rows.length<2 || rows.some((row,i)=>i && row.year !== rows[i-1].year+1)) throw new Error('Finanzas: se requieren al menos dos años consecutivos');
  const first=rows[0],latest=rows.at(-1);
  if (!first.taxes || !first.expenditure) throw new Error('Finanzas: la base de comparación debe ser positiva');
  return { rows,first,latest,taxGrowth:(latest.fiscalRevenue/first.fiscalRevenue-1)*100,spendingGrowth:(latest.expenditure/first.expenditure-1)*100 };
}

export function workerModel(raw, sourceId) {
  if (raw.sourceId !== sourceId || raw.country !== 'ES' || !raw.profile || !Number.isInteger(raw.year)) throw new Error('Trabajador: metadatos incompletos');
  const shares=workerEuro(raw.taxWedgePercent);
  numeric(raw.netTaxGrossPercent,'Tipo neto sobre salario bruto');
  if (raw.netTaxGrossPercent>100 || raw.netTaxGrossPercent>raw.taxWedgePercent) throw new Error('Trabajador: bases incoherentes');
  if (!Array.isArray(raw.history) || raw.history.length<2 || raw.history.some((row,i)=>!Number.isInteger(row.year) || (i && row.year !== raw.history[i-1].year+1))) throw new Error('Trabajador: serie temporal no válida');
  raw.history.forEach(row=>workerEuro(row.taxWedgePercent));
  if (raw.history.at(-1).year!==raw.year || raw.history.at(-1).taxWedgePercent!==raw.taxWedgePercent) throw new Error('Trabajador: último dato incoherente');
  const firstNet=100-raw.history[0].taxWedgePercent;
  if (!firstNet) throw new Error('Trabajador: el neto inicial debe ser positivo');
  const netLoss=firstNet-shares.net;
  return { ...raw,...shares,firstNet,netLoss,relativeNetLoss:netLoss/firstNet*100,netGrossPercent:100-raw.netTaxGrossPercent };
}
