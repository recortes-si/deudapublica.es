export function housingModel(raw,emancipation=null) {
  const validSeries=(rows,key)=>{
    if(!Array.isArray(rows)||rows.length<2||new Set(rows.map(r=>r.year)).size!==rows.length)throw Error('Vivienda: serie incompleta o años duplicados');
    for(const row of rows)if(!Number.isInteger(row.year)||!Number.isFinite(row[key])||row[key]<=0)throw Error('Vivienda: observación inválida');
    return new Map(rows.map(row=>[row.year,row[key]]));
  };
  const households=validSeries(raw.households,'households'),prices=validSeries(raw.prices,'index'),historical=raw.historicalHouseholds?validSeries(raw.historicalHouseholds,'households'):new Map();
  if(!Number.isInteger(raw.baseYear)||!prices.has(raw.baseYear)||!Array.isArray(raw.construction)||!raw.construction.length)throw Error('Vivienda: falta la base o la construcción');
  const rows=raw.construction.map(row=>{
    if(!Number.isInteger(row.year)||row.year<=raw.baseYear)throw Error('Vivienda: año inválido');
    const quarterly=Array.isArray(row.quarters);
    if(quarterly?(row.completed!=null||row.quarters.length!==4||row.quarters.some(v=>!Number.isInteger(v)||v<0)):(!Number.isInteger(row.completed)||row.completed<0))throw Error('Vivienda: se necesitan cuatro trimestres completos o un total anual oficial');
    const historic=historical.has(row.year);
    if((historic?!historical.has(row.year-1):(!households.has(row.year)||!households.has(row.year+1)))||!prices.has(row.year)||!prices.has(row.year-1))throw Error('Vivienda: años de hogares y precios incompatibles');
    const newHouseholds=historic?historical.get(row.year)-historical.get(row.year-1):households.get(row.year+1)-households.get(row.year),completed=quarterly?row.quarters.reduce((a,b)=>a+b,0):row.completed;
    return {year:row.year,householdBasis:historic?'ECH · medias anuales':'ECP · enero a enero',newHouseholds,completed,gap:newHouseholds-completed,priceGrowth:(prices.get(row.year)/prices.get(row.year-1)-1)*100,priceAccumulated:(prices.get(row.year)/prices.get(raw.baseYear)-1)*100};
  }).sort((a,b)=>a.year-b.year);
  if(new Set(rows.map(r=>r.year)).size!==rows.length||rows.some((r,i)=>i&&r.year!==rows[i-1].year+1))throw Error('Vivienda: años duplicados o discontinuos');
  let cumulativeGap=0,cumulativeHouseholds=0,cumulativeCompleted=0;
  const blocked=new Map();
  if(emancipation){
    if(emancipation.estimated!==true||emancipation.unit!=='hogares'||!Number.isInteger(emancipation.baseYear)||!Array.isArray(emancipation.series)||!emancipation.series.length)throw Error('Vivienda: falta la metodología de emancipación');
    for(const row of emancipation.series){if(!Number.isInteger(row.year)||!Number.isInteger(row.households)||row.households<0||blocked.has(row.year))throw Error('Vivienda: estimación de emancipación inválida');blocked.set(row.year,row.households);}
  }
  for(const row of rows){cumulativeHouseholds+=row.newHouseholds;cumulativeCompleted+=row.completed;cumulativeGap=cumulativeHouseholds-cumulativeCompleted;row.cumulativeHouseholds=cumulativeHouseholds;row.cumulativeCompleted=cumulativeCompleted;row.cumulativeGap=cumulativeGap;row.blockedHouseholds=blocked.get(row.year)??null;}
  const blockedLatest=emancipation?[...emancipation.series].sort((a,b)=>a.year-b.year).at(-1):null;
  return {...raw,rows,latest:rows.at(-1),emancipation,blockedLatest};
}
