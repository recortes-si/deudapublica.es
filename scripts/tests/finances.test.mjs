import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadData} from '../lib/data.mjs';
import {financesModel,workerModel} from '../lib/finances.mjs';
import {workerEuro} from '../../src/shared/worker.mjs';
const root=resolve(import.meta.dirname,'../..');

test('public finances use the full government sector and reconcile the annual balance',async()=>{
 const {finances:f}=await loadData(root);
 assert.equal(f.rows.length,26);assert.equal(f.first.year,2000);assert.equal(f.latest.year,2025);
 assert.equal(f.latest.taxes,418057);assert.equal(f.latest.expenditure,764884);assert.equal(f.latest.revenue,724554);assert.equal(f.latest.balance,-40330);
 for(const row of f.rows) assert.equal(row.revenue-row.expenditure,row.balance);
 assert.ok(f.rows.some(row=>row.balance>0));
});

test('public finances reject missing observations, wrong dimensions and inconsistent balance',async()=>{
 const raw=JSON.parse(await readFile(resolve(root,'data/raw/eurostat-finanzas-publicas.json'),'utf8'));
 const wrong=structuredClone(raw);wrong.dimension.geo.category.index={FR:0};assert.throws(()=>financesModel(wrong),/geo=ES/);
 const missing=structuredClone(raw);delete missing.value[missing.dimension.na_item.category.index.TE*missing.size[5]];assert.throws(()=>financesModel(missing),/dato inválido/);
 const inconsistent=structuredClone(raw);inconsistent.value[inconsistent.dimension.na_item.category.index.B9*inconsistent.size[5]]+=100;assert.throws(()=>financesModel(inconsistent),/saldo incoherente/);
});

test('worker euro distinguishes labour cost, gross pay and VAT-inclusive spending',async()=>{
 const {worker:w}=await loadData(root);assert.equal(w.year,2025);assert.equal(w.net,58.6);assert.equal(w.netGrossPercent,76.5);
 const shares=workerEuro(41.4,21);assert.ok(Math.abs(shares.purchasing-58.6/1.21)<1e-10);assert.ok(Math.abs(shares.labourTaxes+shares.purchasing+shares.vat-100)<1e-10);
 assert.equal(workerEuro(41.4).vat,0);assert.throws(()=>workerEuro(101),/rango/);assert.throws(()=>workerEuro(41.4,-1),/rango/);
 const wrong=structuredClone(w);wrong.history.at(-1).taxWedgePercent=40;assert.throws(()=>workerModel(wrong,w.sourceId),/último dato/);
});

test('the revenue breakdown closes without counting capital taxes twice',async()=>{
 const {finances:f,worker:w}=await loadData(root);
 for(const row of f.rows) assert.equal(row.incomeParts.reduce((sum,part)=>sum+part.value,0),row.revenue);
 const last=f.latest;assert.equal(last.incomeParts.find(part=>part.id==='social').value,223612);
 assert.equal(last.incomeParts.find(part=>part.id==='capital').value,17842);
 assert.ok(Math.abs(w.netLoss-2.8)<1e-10);assert.ok(Math.abs(w.relativeNetLoss-(2.8/61.4*100))<1e-10);
});

test('fiscal revenue includes contributions without adding them to total revenue twice',async()=>{
 const {finances:f}=await loadData(root);
 assert.equal(f.latest.fiscalRevenue,641669);
 for(const row of f.rows) assert.equal(row.fiscalRevenue,row.taxes+row.social);
 assert.ok(Math.abs(f.taxGrowth-(641669/218817-1)*100)<1e-8);
});

test('consumption scenarios reconcile taxes, purchases and savings across historical VAT changes',async()=>{
 const {workerScenario,validateFiscalContext}=await import('../../src/shared/worker.mjs');
 const {fiscalContext:p,worker:w}=await loadData(root);
 const first=workerScenario(w.history[0],p),last=workerScenario(w.history.at(-1),p);
 assert.ok(Math.abs(first.retained-61.4/1.16)<1e-10);
 assert.ok(Math.abs(last.retained-58.6/1.21)<1e-10);
 const mixed2010=workerScenario({year:2010,taxWedgePercent:40},p);
 assert.ok(Math.abs(mixed2010.retained-(60/1.16+60/1.18)/2)<1e-10);
 const mixed2012=workerScenario({year:2012,taxWedgePercent:40},p);
 assert.ok(Math.abs(mixed2012.retained-(60/1.18*8+60/1.21*4)/12)<1e-10);
 for(const spend of [0,50,100]) for(const other of [0,10,30]) for(const mode of ['historic','0','4','10','21']){
  const x=workerScenario(w.history.at(-1),p,spend,other,mode);
  assert.ok(Math.abs(x.labourTaxes+x.vat+x.other+x.purchasing+x.savings-100)<1e-9);
  assert.ok(Math.abs(x.retained+x.labourTaxes+x.vat+x.other-100)<1e-9);
 }
 assert.ok(Math.abs(workerScenario(w.history.at(-1),p,0).retained-58.6)<1e-10);
 assert.throws(()=>workerScenario(w.history.at(-1),p,101),/rango/);
 const wrong=structuredClone(p);wrong.mei.at(-1).employee=1;assert.throws(()=>validateFiscalContext(wrong),/MEI/);
 const unordered=structuredClone(p);unordered.vat.reverse();assert.throws(()=>validateFiscalContext(unordered),/IVA/);
 assert.equal(p.mei.at(-1).total,2*p.mei[0].total);
});
