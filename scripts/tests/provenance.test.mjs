import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { loadData } from '../lib/data.mjs';
import { templateValues, fillTemplate } from '../lib/render.mjs';
import { createDataStore } from '../lib/sources.mjs';
import { editorialModel } from '../lib/editorial.mjs';
import { assembleComponents } from '../lib/components.mjs';
import { loadChartRegistry, checkChartDocumentation } from '../lib/chart-registry.mjs';
const root = resolve(import.meta.dirname, '../..');

async function fixture(run, files = ['data','src','docs','scripts/lib']) {
  const directory = await mkdtemp(resolve(tmpdir(), 'debt-provenance-'));
  try {
    await Promise.all(files.map(file => cp(resolve(root,file), resolve(directory,file), { recursive:true })));
    await run(directory);
  } finally { await rm(directory, {recursive:true,force:true}); }
}

test('curated source changes drive initial values and bar geometry, without changing templates', async () => fixture(async directory => {
  const file = resolve(directory,'data/official/editorial-indicators.json');
  const raw = JSON.parse(await readFile(file,'utf8'));
  raw.indicators.find(item=>item.id==='convictions-foreign').value = 20;
  raw.indicators.find(item=>item.id==='imv-foreign-holders').value = 100000;
  raw.indicators.find(item=>item.id==='imv-total-holders').value = 400000;
  await writeFile(file,JSON.stringify(raw));
  const data = await loadData(directory);
  const values = templateValues(data);
  const html = fillTemplate(await readFile(resolve(root,'src/components/migration.html'),'utf8'),values);
  assert.equal(data.editorial.imvForeignShare,25);
  assert.match(html,/25,0 %/);
  assert.match(html,/extranjera 20,0; española 6,2/);
  assert.match(html,/--rate-width:31%/);
  assert.doesNotMatch(html,/17,6 %|--rate-width:39.49%/);
}, ['data']));

test('curated observations reject duplicate IDs, unknown sources and inconsistent denominators', async () => {
  const {byId} = await createDataStore(root);
  const raw = JSON.parse(await readFile(resolve(root,'data/official/editorial-indicators.json'),'utf8'));
  const duplicate = structuredClone(raw); duplicate.indicators.push(duplicate.indicators[0]);
  assert.throws(()=>editorialModel(duplicate,byId),/duplicado/);
  const unknown = structuredClone(raw); unknown.indicators[0].sourceId='missing';
  assert.throws(()=>editorialModel(unknown,byId),/fuente desconocida/);
  const mismatch = structuredClone(raw); mismatch.indicators.find(item=>item.id==='imv-total-holders').value=1;
  assert.throws(()=>editorialModel(mismatch,byId),/denominador/);
});

test('every active chart has existing inputs, model and template, and synchronized documentation', async () => {
  const data = await loadData(root);
  const template = await assembleComponents(root,await readFile(resolve(root,'src/index.html'),'utf8'));
  const registry = await loadChartRegistry(root,{data,template});
  await checkChartDocumentation(root,registry);
  assert.equal(registry.registry.charts.filter(chart=>chart.selector==='#housing-chart').length,1);
});

test('chart provenance rejects uncovered charts and references to absent models or files', async () => fixture(async directory => {
  const file = resolve(directory,'data/charts.json');
  const registry = JSON.parse(await readFile(file,'utf8'));
  await writeFile(file,JSON.stringify({...registry,charts:registry.charts.filter(chart=>chart.id!=='housing')}));
  await assert.rejects(loadChartRegistry(directory),/gráfico sin documentar #housing-chart/);
  const broken = structuredClone(registry); broken.charts[0].inputs=[{file:'official/missing.csv'}];
  await writeFile(file,JSON.stringify(broken));
  await assert.rejects(loadChartRegistry(directory),/ENOENT/);
  await writeFile(file,JSON.stringify(registry));
  await assert.rejects(loadChartRegistry(directory,{data:{}}),/modelo inexistente/);
}));

test('stale chart documentation cannot pass the build-time contract', async () => fixture(async directory => {
  await writeFile(resolve(directory,'docs/charts.md'),'outdated');
  await assert.rejects(checkChartDocumentation(directory,await loadChartRegistry(directory)),/desactualizada/);
}));

test('data paths stay inside data and cyclic components are rejected', async () => fixture(async directory => {
  const store = await createDataStore(directory);
  assert.throws(()=>store.pathFor('../package.json'),/fuera de data/);
  const component = resolve(directory,'src/components/hero.html');
  await writeFile(component,'<!-- COMPONENT:hero -->');
  await assert.rejects(assembleComponents(directory,'<!-- COMPONENT:hero -->'),/circular/);
}));
