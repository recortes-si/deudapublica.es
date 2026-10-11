import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { parseCsv } from '../lib/csv.mjs';
import { loadData } from '../lib/data.mjs';
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
