import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { parseCsv } from '../lib/csv.mjs';
import { loadData } from '../lib/data.mjs';
import { taxComparison } from '../lib/interest.mjs';
import { escapeHtml, fillTemplate } from '../lib/render.mjs';
const root = resolve(import.meta.dirname, '../..');

async function fixture(run) {
  const directory = await mkdtemp(resolve(tmpdir(), 'deudapublica-test-'));
  try { await cp(resolve(root, 'data'), resolve(directory, 'data'), { recursive:true }); await run(directory); }
  finally { await rm(directory, { recursive:true, force:true }); }
}

test('CSV: commas, multiline fields, escaped quotes, BOM and CRLF', () => {
  assert.deepEqual(parseCsv('\uFEFFcode,name,value\r\n08,"Ocio, cultura y religión",19193\r\n09,"Una ""cita""\ny otra línea",42'), [
    ['code','name','value'],['08','Ocio, cultura y religión','19193'],['09','Una "cita"\ny otra línea','42']
  ]);
  assert.throws(() => parseCsv('01,"sin cerrar'), /comillas/);
});

test('stored datasets: correct cultural spending and totals for every year', async () => {
  const data = await loadData(root);
  assert.equal(data.spending.find(item => item.code === '08').value, 19193);
  assert.equal(data.spendingYear, 2024);
  assert.equal(data.spendingHistory.length, 5);
  for (const year of data.spendingHistory) assert.ok(Math.abs(year.items.reduce((sum,item) => sum+item.share,0)-100) < 0.01);
});

test('a new COFOG year is detected without changing application code', async () => fixture(async directory => {
  const file = resolve(directory, 'data/official/spending-cofog-2020-2024.csv');
  const csv = await readFile(file,'utf8');
  const rows = csv.trim().split('\n');
  // Duplicate the last observation as a synthetic fixture, not a published datum.
  rows[0] += ',2026';
  for (let i=1;i<rows.length;i++) rows[i] += ',' + rows[i].split(',').at(-1);
  await writeFile(file,rows.join('\n')+'\n');
  const data = await loadData(directory);
  assert.equal(data.spendingYear,2026);
  assert.equal(data.spendingGdp,null); // no GDP for this year: do not mix periods.
}));

test('invalid numbers and totals fail with an actionable error', async () => fixture(async directory => {
  const file = resolve(directory,'data/official/spending-cofog-2020-2024.csv');
  const original = await readFile(file,'utf8');
  await writeFile(file,original.replace(',725001',',999999'));
  await assert.rejects(loadData(directory), /no suman TOTAL/);
  await writeFile(file,original.replace(',19193',',no-es-un-numero'));
  await assert.rejects(loadData(directory), /COFOG 08 2024/);
}));

test('budget tree cannot disagree with its total', async () => fixture(async directory => {
  const file = resolve(directory,'data/official/pge-2024-politicas.json');
  const budget = JSON.parse(await readFile(file,'utf8'));
  budget.root.children[0].children[0].value += 100;
  await writeFile(file,JSON.stringify(budget));
  await assert.rejects(loadData(directory), /árbol no suma/);
}));

test('text is escaped and unknown template variables fail', () => {
  assert.equal(escapeHtml('<script>"&'), '&lt;script&gt;&quot;&amp;');
  assert.equal(fillTemplate('{{TEXT}}', { TEXT:'$&' }), '$&');
  assert.throws(() => fillTemplate('{{MISSING}}',{}), /desconocida/);
});


test('official interest and tax comparison: matching year, correct sum and leap-year daily cost', async () => {
  const { interest } = await loadData(root);
  assert.equal(interest.year, 2024);
  assert.equal(interest.value, 38793);
  assert.equal(interest.days, 366);
  assert.equal(interest.perDay, 38793 / 366);
  assert.equal(interest.example.count, 4);
  assert.ok(Math.abs(interest.example.total - 36375.42857142857) < 1e-6);
  assert.ok(Math.abs(interest.example.remaining - 2417.57142857143) < 1e-6);
  assert.equal(interest.example.covered, true);
  assert.equal(interest.taxOnlyExample.count, 5);
  assert.ok(Math.abs(interest.taxOnlyExample.total - 20108.089) < 1e-6);
  assert.ok(!interest.taxes.items.some(item => item.id === 'tobacco'));
  const oversized = taxComparison(interest.value, interest.taxes.items, ['iva'], {iva:0});
  assert.equal(oversized.covered, false);
  assert.equal(oversized.remaining, 38793 - 90541);
  const empty = taxComparison(interest.value, interest.taxes.items, []);
  assert.equal(empty.total, 0);
  assert.equal(empty.remaining, 38793);
  const exact = taxComparison(100, [{ id:'one', value:100 }], ['one']);
  assert.equal(exact.covered, true);
  assert.equal(exact.remaining, 0);
  assert.throws(() => taxComparison(100, [{ id:'one',value:100 }], ['one','one']), /duplicados/);
  assert.throws(() => taxComparison(100, [], ['missing']), /no encontrado/);
});

test('interest comparison rejects mixed years, wrong national-account series and an unaffordable default example', async () => fixture(async directory => {
  const file = resolve(directory,'data/official/fiscal-scenarios-2024.json');
  const original = JSON.parse(await readFile(file,'utf8'));
  await writeFile(file, JSON.stringify({ ...original, year:2025 }));
  await assert.rejects(loadData(directory), /mismo año/);
  await writeFile(file, JSON.stringify(original));
  const rawFile = resolve(directory,'data/raw/eurostat-intereses-2024.json');
  const raw = JSON.parse(await readFile(rawFile,'utf8'));
  const wrong = structuredClone(raw);
  wrong.dimension.na_item.category.index = { D41REC:0 };
  await writeFile(rawFile,JSON.stringify(wrong));
  await assert.rejects(loadData(directory), /D41PAY/);
  const lower = structuredClone(raw);
  lower.value[0] = 100;
  await writeFile(rawFile,JSON.stringify(lower));
  await assert.rejects(loadData(directory), /no superar/);
}));


test('fiscal parameters: VAT endpoints, zero reductions and no RETA double counting', async () => {
  const { interest } = await loadData(root), items = interest.taxes.items;
  assert.equal(taxComparison(38793,items,['iva'],{iva:21}).total,0);
  assert.equal(taxComparison(38793,items,['iva'],{iva:21}).count,0);
  assert.equal(taxComparison(38793,items,['contributions'],{contributions:0}).total,0);
  assert.ok(Math.abs(taxComparison(38793,items,['contributions','autonomous'],{contributions:100}).total - 162870.99) < 1e-6);
  assert.throws(() => taxComparison(38793,items,['iva'],{iva:-1}), /rango/);
  assert.throws(() => taxComparison(38793,items,['contributions'],{contributions:101}), /rango/);
});


test('contribution exclusions follow an updated RETA value and reject invalid components', async () => fixture(async directory => {
  const file = resolve(directory,'data/official/fiscal-scenarios-2024.json');
  const dataset = JSON.parse(await readFile(file,'utf8'));
  dataset.items.find(item => item.id === 'autonomous').value += 100;
  await writeFile(file,JSON.stringify(dataset));
  const { interest } = await loadData(directory);
  assert.ok(Math.abs(taxComparison(38793,interest.taxes.items,['contributions','autonomous'],{contributions:100}).total - 162870.99) < 1e-6);
  dataset.items.find(item => item.id === 'contributions').excludeIds = ['missing'];
  await writeFile(file,JSON.stringify(dataset));
  await assert.rejects(loadData(directory), /Exclusiones fiscales/);
}));


test('IRPF supports proportional reductions and the interest budget boundary', async () => {
  const { interest } = await loadData(root), items = interest.taxes.items;
  assert.equal(taxComparison(interest.value,items,['irpf'],{irpf:0}).total,0);
  assert.equal(taxComparison(interest.value,items,['irpf'],{irpf:100}).total,129408);
  assert.ok(Math.abs(taxComparison(interest.value,items,['irpf'],{irpf:10}).total-12940.8) < 1e-6);
  assert.equal(taxComparison(interest.value,items,['irpf'],{irpf:29}).covered,true);
  assert.equal(taxComparison(interest.value,items,['irpf'],{irpf:30}).covered,false);
});
