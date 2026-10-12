import { housingModel } from './housing.mjs';
import { citizenIncomeModel } from './citizen-income.mjs';
import { validateDebtTimeline } from '../../src/shared/debt-timeline.mjs';
import { debtHistoryModel } from './debt-history.mjs';
import { repaymentModel } from './repayment.mjs';
import { createDataStore } from './sources.mjs';
import { editorialModel } from './editorial.mjs';
import { parseCsv, numeric } from './csv.mjs';
import { financesModel } from './finances.mjs';
import { interestModel, taxComparison } from './interest.mjs';

export const nodeTotal = node => node.children ? node.children.reduce((sum, child) => sum + nodeTotal(child), 0) : node.value;

export async function loadData(root) {
  const { config, catalog, sources, sourceFor, read, json, byId } = await createDataStore(root);
  if (!Array.isArray(config.provisionalSpendingYears) || config.provisionalSpendingYears.some(year => !Number.isInteger(year))) throw new Error('site.json: provisionalSpendingYears debe ser una lista de años');
  const [debtText, ratioText, spendingText, budgetText, populationText, interestText, taxText, financesText] = await Promise.all(
    ['debtSourceId','ratioSourceId','spendingSourceId','budgetSourceId','populationSourceId','interestSourceId','taxSourceId','financesSourceId'].map(read)
  );
  const bdeRows = parseCsv(debtText);
  // Find the total debt series by its official identifier, rather than a column position.
  const debtColumn = bdeRows[0].indexOf('DANPDE2010_P00000_PS_APU');
  if (debtColumn < 0) throw new Error('Banco de España: falta la serie de deuda total DANPDE2010_P00000_PS_APU');
  const eurostat = JSON.parse(ratioText);
  if (eurostat.id?.some((id, index) => id !== 'time' && eurostat.size[index] !== 1)) throw new Error('Eurostat: se esperaba una sola serie (España, deuda, % PIB)');
  const ratioByYear = new Map(Object.entries(eurostat.dimension.time.category.index).map(([year, index]) => [Number(year), eurostat.value[index]]));
  const debt = bdeRows.filter(row => /^\d{4}$/.test(row[0]) && row[debtColumn] !== '_' && ratioByYear.get(Number(row[0])) != null).map(row => ({
    year: Number(row[0]),
    euros: numeric(row[debtColumn], `Deuda ${row[0]}`, { positive: true }) / 1e6,
    ratio: numeric(ratioByYear.get(Number(row[0])), `Deuda/PIB ${row[0]}`, { positive: true })
  })).sort((a, b) => a.year - b.year);
  if (debt.length < 2 || new Set(debt.map(row => row.year)).size !== debt.length) throw new Error('Deuda: hacen falta al menos dos años distintos, sin duplicados');
  const latest = debt.at(-1), previous = debt.at(-2);
  if (latest.year - previous.year !== 1) throw new Error('Deuda: los dos últimos años deben ser consecutivos para calcular la variación anual');
  const csv = parseCsv(spendingText), header = csv.shift();
  if (header[0] !== 'code' || header[1] !== 'function') throw new Error('COFOG: cabecera esperada code,function,AAAA,…');
  const years = header.map((value, column) => ({ year: Number(value), column })).filter(({ year, column }) => column >= 2 && Number.isInteger(year) && year >= 1900);
  if (!years.length || years.length !== header.length - 2 || new Set(years.map(row => row.year)).size !== years.length) throw new Error('COFOG: años no válidos o duplicados');
  if (csv.some(row => row.length !== header.length) || new Set(csv.map(row => row[0])).size !== csv.length) throw new Error('COFOG: columnas inconsistentes o códigos duplicados');
  const totalRow = csv.find(row => row[0] === 'TOTAL');
  if (!totalRow) throw new Error('COFOG: falta la fila TOTAL');
  const spendingHistory = years.sort((a,b) => a.year-b.year).map(({ year, column }) => {
    const total = numeric(totalRow[column], `COFOG TOTAL ${year}`, { positive: true });
    const items = csv.filter(row => row[0] !== 'TOTAL').map(row => {
      if (!row[0] || !row[1]) throw new Error('COFOG: categoría sin código o nombre');
      const value = numeric(row[column], `COFOG ${row[0]} ${year}`);
      return { code: row[0], name: row[1], value, share: value / total * 100 };
    });
    const sum = items.reduce((sum, item) => sum + item.value, 0);
    if (Math.abs(sum - total) > items.length) throw new Error(`COFOG ${year}: las categorías (${sum}) no suman TOTAL (${total})`);
    const observation = debt.find(row => row.year === year);
    return { year, total, items, provisional: config.provisionalSpendingYears.includes(year), gdp: observation ? total * 1e6 / (observation.euros * 1e12 / (observation.ratio / 100)) * 100 : null };
  });
  const budget = JSON.parse(budgetText), population = JSON.parse(populationText);
  const validateNode = (node, path = 'PGE') => {
    if (!node?.name || typeof node.name !== 'string') throw new Error(`${path}: nodo sin nombre`);
    if (node.children != null) {
      if (!Array.isArray(node.children) || !node.children.length || node.value != null) throw new Error(`${path}/${node.name}: usar children o value, no ambos`);
      node.children.forEach(child => validateNode(child, `${path}/${node.name}`));
    } else numeric(node.value, `${path}/${node.name}`);
  };
  validateNode(budget.root);
  numeric(budget.total, 'PGE total', { positive: true });
  if (Math.abs(nodeTotal(budget.root) - budget.total) > 1) throw new Error('PGE: el árbol no suma el total declarado');
  if (budget.sourceId !== config.budgetSourceId || population.sourceId !== config.populationSourceId) throw new Error('PGE/población: sourceId no coincide con site.json');
  if (!Number.isInteger(budget.year) || !budget.dataset || !budget.status) throw new Error('PGE: faltan year, dataset o status');
  numeric(population.value, 'Población', { positive: true });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(population.date)) throw new Error('Población: date debe tener formato AAAA-MM-DD');
  if (!Array.isArray(config.featuredSpendingCodes) || config.featuredSpendingCodes.length !== 4 || new Set(config.featuredSpendingCodes).size !== 4) throw new Error('site.json: indicar cuatro códigos COFOG distintos');
  if (spendingHistory.some(row => config.featuredSpendingCodes.some(code => !row.items.some(item => item.code === code))) || !spendingHistory.at(-1).items.some(item => item.code === '10')) throw new Error('COFOG: faltan categorías configuradas o protección social (10)');
  const taxes = JSON.parse(taxText);
  if (taxes.sourceId !== config.taxSourceId) throw new Error('Impuestos: sourceId no coincide con site.json');
  const interest = interestModel(JSON.parse(interestText), taxes, config.taxExampleIds);
  const spendingLatest = spendingHistory.at(-1);
  interest.taxOnlyExample = taxComparison(interest.value, interest.taxes.items, config.taxOnlyExampleIds);
  if (!interest.taxOnlyExample.count || !interest.taxOnlyExample.covered || config.taxOnlyExampleIds.some(id => interest.taxes.items.find(item => item.id === id).control || ['autonomous','contributions'].includes(id))) throw new Error('El ejemplo de supresión debe contener solo impuestos completos y cubrirse con los intereses');
  const finances = financesModel(JSON.parse(financesText));
  const benefits = JSON.parse(await read('benefitsSourceId'));
  if (benefits.sourceId !== config.benefitsSourceId) throw new Error('Prestaciones: sourceId no coincide');
  const gdpPerCapita = JSON.parse(await read('gdpPerCapitaSourceId'));
  if (gdpPerCapita.sourceId !== config.gdpPerCapitaSourceId) throw new Error('PIB per cápita: sourceId no coincide');
  if (!Number.isInteger(gdpPerCapita.baseYear) || !Array.isArray(gdpPerCapita.series) || gdpPerCapita.series.length < 2) throw new Error('PIB per cápita: serie o año base inválidos');
  for (const row of gdpPerCapita.series) {
    if (!Number.isInteger(row.year) || !(row.gdp > 0) || !(row.pcap > 0) || !(row.pcapReal > 0)) throw new Error(`PIB per cápita: fila inválida ${row.year}`);
  }
  const populationSeries = JSON.parse(await read('populationSeriesSourceId'));
  if (populationSeries.sourceId !== config.populationSeriesSourceId) throw new Error('Población: sourceId no coincide');
  if (!Array.isArray(populationSeries.series) || populationSeries.series.length < 2) throw new Error('Población: serie inválida');
  const populationByYear = new Map();
  for (const row of populationSeries.series) {
    if (!Number.isInteger(row.year) || !(row.population > 0)) throw new Error(`Población: fila inválida ${row.year}`);
    populationByYear.set(row.year, row.population);
  }
  for (const row of debt) {
    const population = populationByYear.get(row.year);
    row.population = population ?? null;
    row.perCapita = population ? row.euros * 1e12 / population : null;
  }
  const citizenIncome=citizenIncomeModel(await read('citizenIncomeSourceId'),sourceFor('citizenIncomeSourceId').source);
  const debtTimeline = validateDebtTimeline(JSON.parse(await read('debtTimelineSourceId')), finances.rows.map(row=>row.year));
  if (debtTimeline.sourceId !== config.debtTimelineSourceId) throw new Error('Cronología: sourceId no coincide');
  const debtHistory = debtHistoryModel(JSON.parse(await read('inflationSourceId')), { debt, finances, sourceId: config.inflationSourceId });
  const repayment = repaymentModel(await json('official/repayment-plan.json'), {debt,finances,interest,benefits,spendingHistory});
  const emancipationHousing=JSON.parse(await read('emancipationHousingSourceId'));
  if(emancipationHousing.sourceId!==config.emancipationHousingSourceId)throw Error('Vivienda: sourceId de emancipación no coincide');
  const housing=housingModel(JSON.parse(await read('housingSourceId')),emancipationHousing);
  if(housing.sourceId!==config.housingSourceId)throw Error('Vivienda: sourceId no coincide');
  const editorial = editorialModel(await json(config.editorialDataFile), byId);
  return { editorial, housing, citizenIncome, debtTimeline, debtHistory, repayment, finances, interest, gdpPerCapita, generatedAt: catalog.generatedAt, config, sources, debt, latest, previous, budget, population, spendingHistory, spendingYear: spendingLatest.year, spending: spendingLatest.items, spendingTotal: spendingLatest.total, spendingGdp: spendingLatest.gdp };
}
