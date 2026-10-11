// Retained historical datasets are tested independently of the published site.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { workerModel } from '../lib/finances.mjs';
import { earningsModel, commonTaxesModel } from '../lib/economy.mjs';
const root = resolve(import.meta.dirname, '../..');
const text = file => readFile(resolve(root, 'data', file), 'utf8');
const json = async file => JSON.parse(await text(file));
export async function loadArchivedWorker() {
  const raw = await json('official/oecd-trabajador-2025.json');
  return workerModel(raw, raw.sourceId);
}
export async function loadArchivedEconomy() {
  const [worker, csv, prices, taxes, fiscalContext, catalog] = await Promise.all([
    loadArchivedWorker(), text('raw/oecd-salarios-impuestos-2000-2025.csv'),
    json('raw/eurostat-inflacion-2000-2025.json'), json('official/common-taxes.json'),
    json('official/fiscal-context.json'), json('sources.json')
  ]);
  const source = catalog.datasets.find(item => item.id === 'oecd-salarios-impuestos');
  const earnings = earningsModel(csv, prices, worker, source.estimatedYears);
  return { worker, earnings, commonTaxes: commonTaxesModel(taxes, earnings), fiscalContext };
}
