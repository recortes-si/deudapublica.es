import { earningsModel, commonTaxesModel } from './economy.mjs';
import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { parseCsv, numeric } from './csv.mjs';
import { financesModel, workerModel } from './finances.mjs';
import { validateFiscalContext } from '../../src/shared/worker.mjs';
import { interestModel, taxComparison } from './interest.mjs';

export const nodeTotal = node => node.children ? node.children.reduce((sum, child) => sum + nodeTotal(child), 0) : node.value;

export async function loadData(root) {
  const dataRoot = resolve(root, 'data');
  const json = async file => JSON.parse(await readFile(resolve(dataRoot, file), 'utf8'));
  const [config, catalog] = await Promise.all([json('site.json'), json('sources.json')]);
  if (!Array.isArray(config.provisionalSpendingYears) || config.provisionalSpendingYears.some(year => !Number.isInteger(year))) throw new Error('site.json: provisionalSpendingYears debe ser una lista de años');
  const sources = catalog.datasets;
  if (!Array.isArray(sources)) throw new Error('sources.json: datasets debe ser una lista');
  const byId = new Map();
  for (const source of sources) {
    if (!source.id || byId.has(source.id)) throw new Error(`Fuente duplicada o sin id: ${source.id}`);
    if (!source.title || !source.publisher || !source.period || !/^\d{4}-\d{2}-\d{2}$/.test(source.updated)) throw new Error(`Metadatos incompletos: ${source.id}`);
    if (!/^https?:$/.test(new URL(source.url).protocol)) throw new Error(`URL de fuente no válida: ${source.id}`);
    byId.set(source.id, source);
  }
  const sourceFor = key => {
    const source = byId.get(config[key]);
    if (!source?.file) throw new Error(`site.json: ${key} debe referenciar una fuente con file`);
    const path = resolve(dataRoot, source.file), rel = relative(dataRoot, path);
    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Ruta fuera de data/: ${source.file}`);
    return { source, path };
  };
  const read = async key => readFile(sourceFor(key).path, 'utf8');
  const [debtText, ratioText, spendingText, budgetText, populationText, interestText, taxText, financesText, workerText, earningsText, inflationText, commonTaxesText] = await Promise.all(
    ['debtSourceId','ratioSourceId','spendingSourceId','budgetSourceId','populationSourceId','interestSourceId','taxSourceId','financesSourceId','workerSourceId','earningsSourceId','inflationSourceId','commonTaxesSourceId'].map(read)
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
  const worker = workerModel(JSON.parse(workerText), config.workerSourceId);
  const earnings=earningsModel(earningsText,JSON.parse(inflationText),worker,sourceFor('earningsSourceId').source.estimatedYears);
  const commonTaxes=commonTaxesModel(JSON.parse(commonTaxesText),earnings);
  const fiscalContext = await json('official/fiscal-context.json');
  validateFiscalContext(fiscalContext);
  return { earnings,commonTaxes,fiscalContext, finances, worker, interest, generatedAt: catalog.generatedAt, config, sources, debt, latest, previous, budget, population, spendingHistory, spendingYear: spendingLatest.year, spending: spendingLatest.items, spendingTotal: spendingLatest.total, spendingGdp: spendingLatest.gdp };
}
