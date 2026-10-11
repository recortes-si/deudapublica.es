import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadData} from '../lib/data.mjs';
import {earningsModel,commonTaxesModel} from '../lib/economy.mjs';
import {workerScenario} from '../../src/shared/worker.mjs';
const root=resolve(import.meta.dirname,'../..');

test('earnings, taxes and inflation share the OECD profile and reconcile for every year',async()=>{
 const {earnings:e,fiscalContext:p}=await loadData(root);
 assert.equal(e.rows.length,26);assert.equal(e.first.year,2000);assert.equal(e.latest.year,2025);
 assert.ok(Math.abs(e.latest.gross-32678.398389)<1e-6);
 assert.ok(Math.abs(e.realNetGrowth-1.2120083569190143)<1e-8);
 for(const row of e.rows){
  assert.ok(Math.abs(row.gross-row.incomeTax-row.employeeSSC-row.net)<.01);
  assert.ok(Math.abs(row.cost-row.gross-row.employerSSC)<.01);
  assert.ok(Math.abs(row.realNet-row.net/(row.priceIndex/e.first.priceIndex))<1e-8);
  for(const spend of [0,50,100]) for(const extra of [0,10]) {
   const consumption=workerScenario({year:row.year,taxWedgePercent:row.taxShare},p,spend,extra);
   const sum=(row.incomeTax+row.employeeSSC+row.employerSSC)/row.cost*100+consumption.vat+consumption.other+consumption.retained;
   assert.ok(Math.abs(sum-100)<1e-7);
  }
 }
});

test('historical tax rates retain temporary housing reductions and years with lower IRPF',async()=>{
 const {commonTaxes:t,earnings:e}=await loadData(root);
 const byId=id=>t.items.find(item=>item.id===id),at=(id,year)=>byId(id).rows.find(row=>row.year===year).rate;
 assert.equal(at('vat',2000),16);assert.equal(at('vat',2010),18);assert.equal(at('vat',2012),21);
 assert.equal(at('housing',2000),7);assert.equal(at('housing',2010),8);assert.equal(at('housing',2011),4);assert.equal(at('housing',2012),4);assert.equal(at('housing',2013),10);
 assert.ok(at('irpf',2015)<at('irpf',2014));
 assert.ok(Math.abs(at('irpf',2025)-e.latest.incomeTax/e.latest.gross*100)<1e-10);
 assert.ok(Math.abs(at('ssc',2025)-(e.latest.employerSSC+e.latest.employeeSSC)/e.latest.gross*100)<1e-10);
 assert.equal(t.housing.deductionRate*t.housing.deductionBase/100,1356);
 const raw=JSON.parse(await readFile(resolve(root,'data/official/common-taxes.json'),'utf8'));raw.items[0].changes.reverse();assert.throws(()=>commonTaxesModel(raw,e),/calendario/);
});

test('earnings model rejects mismatched profiles, incomplete prices and inconsistent accounts',async()=>{
 const csv=await readFile(resolve(root,'data/raw/oecd-salarios-impuestos-2000-2025.csv'),'utf8');
 const prices=JSON.parse(await readFile(resolve(root,'data/raw/eurostat-inflacion-2000-2025.json'),'utf8'));
 const {worker}=await loadData(root);
 assert.throws(()=>earningsModel(csv.replaceAll(',AW100,',',AW67,'),prices,worker),/perfil/);
 const missing=structuredClone(prices);delete missing.value[0];assert.throws(()=>earningsModel(csv,missing,worker),/índice válido/);
 const wrong=structuredClone(prices);wrong.dimension.geo.category.index={FR:0};assert.throws(()=>earningsModel(csv,wrong,worker),/geo=ES/);
 assert.throws(()=>earningsModel(csv.replace('GEBT,XDC,S_C0,AW100,_Z,A,2000,17319.06','GEBT,XDC,S_C0,AW100,_Z,A,2000,99999'),prices,worker),/partidas incoherentes/);
});
