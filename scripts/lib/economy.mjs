import {parseCsv} from './csv.mjs';

export function earningsModel(text,rawPrices,worker,estimatedYears=[]) {
  if(!Array.isArray(estimatedYears) || estimatedYears.some(year=>!Number.isInteger(year)))throw new Error('Salarios OCDE: años estimados no válidos');
  const csv=parseCsv(text),header=csv.shift();
  const fields=['REF_AREA','MEASURE','UNIT_MEASURE','HOUSEHOLD_TYPE','INCOME_PRINCIPAL','INCOME_SPOUSE','FREQ','TIME_PERIOD','OBS_VALUE','UNIT_MULT'];
  if(fields.some(key=>!header.includes(key)))throw new Error('Salarios OCDE: faltan columnas');
  const records=csv.map(values=>Object.fromEntries(header.map((key,i)=>[key,values[i]])));
  const measures={gross:'GEBT',net:'THP',incomeTax:'CGITFP',regionalTax:'SLT',employeeSSC:'EECSSC',employerSSC:'ERCSSCPT',cost:'LC',benefits:'CTGG'};
  for(const [dimension,code] of Object.entries({freq:'A',unit:'INX_A_AVG',coicop:'CP00',geo:'ES'})) {
    const index=rawPrices.dimension?.[dimension]?.category?.index;
    if(!index || Object.keys(index).length!==1 || !(code in index))throw new Error(`Inflación: se esperaba ${dimension}=${code}`);
  }
  if(rawPrices.id?.join(',')!=='freq,unit,coicop,geo,time' || rawPrices.size?.slice(0,-1).some(size=>size!==1))throw new Error('Inflación: estructura inesperada');
  const prices=new Map(Object.entries(rawPrices.dimension.time.category.index).map(([year,i])=>[Number(year),rawPrices.value[i]]));
  const rows=worker.history.map(reference=>{
    const year=reference.year, result={year,estimated:estimatedYears.includes(year),priceIndex:prices.get(year)};
    if(!Number.isFinite(result.priceIndex) || result.priceIndex<=0)throw new Error(`Inflación: falta índice válido en ${year}`);
    for(const [key,measure] of Object.entries(measures)) {
      const matches=records.filter(row=>row.MEASURE===measure && row.TIME_PERIOD===String(year));
      if(matches.length!==1)throw new Error(`Salarios OCDE: falta o se duplica ${measure} en ${year}`);
      const row=matches[0];
      if(row.REF_AREA!=='ESP' || row.UNIT_MEASURE!=='XDC' || row.HOUSEHOLD_TYPE!=='S_C0' || row.INCOME_PRINCIPAL!=='AW100' || row.INCOME_SPOUSE!=='_Z' || row.FREQ!=='A' || row.UNIT_MULT!=='0' || !row.OBS_VALUE?.trim())throw new Error(`Salarios OCDE: perfil o unidades incorrectos ${year}`);
      const value=Number(row.OBS_VALUE);
      if(!Number.isFinite(value)||value<0)throw new Error(`Salarios OCDE: dato inválido ${measure} ${year}`);
      result[key]=value;
    }
    result.incomeTax+=result.regionalTax;delete result.regionalTax;
    if(!result.gross || !result.net || !result.cost || result.benefits!==0 || Math.abs(result.cost-result.gross-result.employerSSC)>.01 || Math.abs(result.gross-result.net-result.incomeTax-result.employeeSSC)>.01)throw new Error(`Salarios OCDE: partidas incoherentes ${year}`);
    result.taxShare=(result.cost-result.net)/result.cost*100;
    if(Math.abs(result.taxShare-reference.taxWedgePercent)>.051)throw new Error(`Salarios OCDE: cuña fiscal incompatible ${year}`);
    result.irpfRate=result.incomeTax/result.gross*100;
    result.sscRate=(result.employeeSSC+result.employerSSC)/result.gross*100;
    return result;
  });
  const first=rows[0],latest=rows.at(-1);
  for(const row of rows) {
    row.prices=row.priceIndex/first.priceIndex*100;
    row.grossIndex=row.gross/first.gross*100;
    row.netIndex=row.net/first.net*100;
    row.realGross=row.gross/(row.priceIndex/first.priceIndex);
    row.realNet=row.net/(row.priceIndex/first.priceIndex);
    row.realNetIndex=row.realNet/first.net*100;
  }
  return {rows,first,latest,priceGrowth:latest.prices-100,grossGrowth:latest.grossIndex-100,realGrossGrowth:(latest.realGross/first.gross-1)*100,realNetGrowth:latest.realNetIndex-100};
}

export function commonTaxesModel(raw,earnings) {
  if(!Array.isArray(raw?.items) || raw.items.length<3 || new Set(raw.items.map(item=>item.id)).size!==raw.items.length)throw new Error('Impuestos habituales: catálogo no válido');
  const items=raw.items.map(item=>{
    if(!item.id || !item.name || !item.base || !item.description || !/^#[a-f\d]{6}$/i.test(item.color) || !Array.isArray(item.sources) || !item.sources.length)throw new Error('Impuestos habituales: metadatos incompletos');
    item.sources.forEach(source=>{if(!source.title || !/^https?:$/.test(new URL(source.url).protocol))throw new Error('Impuestos habituales: fuente no válida');});
    if(item.kind==='statutory') {
      if(!Array.isArray(item.changes) || !item.changes.length || item.changes.some((row,i)=>!/^\d{4}-\d{2}-\d{2}$/.test(row.date) || !Number.isFinite(row.rate) || row.rate<0 || row.rate>100 || (i && row.date<=item.changes[i-1].date)))throw new Error('Impuestos habituales: calendario no válido');
    } else if(item.kind!=='effective' || !['irpfRate','sscRate'].includes(item.measure))throw new Error('Impuestos habituales: medida no válida');
    const rows=earnings.rows.map(row=>{
      const change=item.kind==='statutory'?item.changes.filter(change=>change.date<=`${row.year}-12-31`).at(-1):null;
      const rate=item.kind==='statutory'?change?.rate:row[item.measure];
      if(!Number.isFinite(rate))throw new Error(`Impuestos habituales: falta ${item.id} ${row.year}`);
      return {year:row.year,rate};
    });
    return {...item,rows,first:rows[0],latest:rows.at(-1)};
  });
  if(!raw.housing || !Number.isFinite(raw.housing.examplePrice) || raw.housing.examplePrice<=0 || !Number.isFinite(raw.housing.deductionRate) || raw.housing.deductionRate<=0 || raw.housing.deductionRate>100 || !Number.isFinite(raw.housing.deductionBase) || raw.housing.deductionBase<=0 || !Number.isInteger(raw.housing.cutoffYear) || !/^https?:$/.test(new URL(raw.housing.source).protocol))throw new Error('Impuestos habituales: ejemplo de vivienda no válido');
  return {items,housing:raw.housing};
}
