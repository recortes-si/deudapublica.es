// Consumer-price purchasing power, not a GDP or public-spending deflator.
export function inflationComparison(finances, history) {
  const first = finances.first, last = finances.latest;
  const start = history.rows.find(row=>row.year===first.year), end = history.rows.find(row=>row.year===last.year);
  if (!start || !end || !(start.priceIndex>0) || !(end.priceIndex>0) || !(first.fiscalRevenue>0) || !(first.expenditure>0)) throw new Error('Inflación: faltan precios o bases fiscales comparables');
  const priceRatio = end.priceIndex/start.priceIndex;
  return {
    firstYear:first.year,lastYear:last.year,priceRatio,
    priceGrowth:(priceRatio-1)*100,
    purchasingPower:100/priceRatio,
    taxGrowthNominal:(last.fiscalRevenue/first.fiscalRevenue-1)*100,
    taxGrowthReal:(last.fiscalRevenue/first.fiscalRevenue/priceRatio-1)*100,
    spendGrowthNominal:(last.expenditure/first.expenditure-1)*100,
    spendGrowthReal:(last.expenditure/first.expenditure/priceRatio-1)*100
  };
}

export function financeInflationSeries(finances, history, startYear, income = null) {
  const prices=new Map(history.rows.map(row=>[row.year,row]));
  const netByYear=new Map(income?.rows.map(row=>[row.year,row.net])??[]);
  const endYear=income?Math.min(finances.latest.year,income.lastYear):finances.latest.year;
  const first=finances.rows.find(row=>row.year===Number(startYear));
  if (!first || first.year>=endYear) throw new Error('Inflación: año de inicio no disponible o sin periodo comparable');
  const base=prices.get(first.year);
  if (!(base?.priceIndex>0) || !(first.fiscalRevenue>0) || !(first.expenditure>0)) throw new Error('Inflación: faltan precios o bases fiscales comparables');
  const rows=finances.rows.filter(row=>row.year>=first.year&&row.year<=endYear).map(row=>{
    const observation=prices.get(row.year),previous=prices.get(row.year-1);
    if (!(observation?.priceIndex>0)) throw new Error('Inflación: faltan precios del año '+row.year);
    if(income&&(!(netByYear.get(row.year)>0)||!(netByYear.get(first.year)>0)))throw new Error('Inflación: falta salario neto comparable en '+row.year);
    const priceIndex=observation.priceIndex/base.priceIndex*100;
    const purchasingPower=10000/priceIndex;
    return {year:row.year,debtM:observation.debtM??null,debtIndex:base.debtM>0&&observation.debtM!=null?observation.debtM/base.debtM*100:null,taxIndex:row.fiscalRevenue/first.fiscalRevenue*100,spendIndex:row.expenditure/first.expenditure*100,priceIndex,purchasingPower,loss:100-purchasingPower,netIndex:income?netByYear.get(row.year)/netByYear.get(first.year)*100:null,annualInflation:previous?.priceIndex>0?(observation.priceIndex/previous.priceIndex-1)*100:null};
  });
  const last=rows.at(-1),debtStart=prices.get(first.year),debtEnd=prices.get(last.year);
  return {firstYear:first.year,lastYear:last.year,rows,
    netGrowth:income?last.netIndex-100:null,netGrowthReal:income?(last.netIndex/last.priceIndex-1)*100:null,
    taxGrowthReal:(last.taxIndex/last.priceIndex-1)*100,
    spendGrowthReal:(last.spendIndex/last.priceIndex-1)*100,
    debtStartM:debtStart.debtM,debtEndM:debtEnd.debtM,
    debtGrowth:debtStart.debtM>0&&debtEnd.debtM!=null?(debtEnd.debtM/debtStart.debtM-1)*100:null,
    ratioStart:debtStart.ratio,ratioEnd:debtEnd.ratio
  };
}
