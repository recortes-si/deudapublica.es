import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadData} from '../lib/data.mjs';
import {financesModel,workerModel} from '../lib/finances.mjs';
import {loadArchivedWorker,loadArchivedEconomy} from './archived-economy.mjs';
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
 const w=await loadArchivedWorker();assert.equal(w.year,2025);assert.equal(w.net,58.6);assert.equal(w.netGrossPercent,76.5);
 const shares=workerEuro(41.4,21);assert.ok(Math.abs(shares.purchasing-58.6/1.21)<1e-10);assert.ok(Math.abs(shares.labourTaxes+shares.purchasing+shares.vat-100)<1e-10);
 assert.equal(workerEuro(41.4).vat,0);assert.throws(()=>workerEuro(101),/rango/);assert.throws(()=>workerEuro(41.4,-1),/rango/);
 const wrong=structuredClone(w);wrong.history.at(-1).taxWedgePercent=40;assert.throws(()=>workerModel(wrong,w.sourceId),/último dato/);
});

test('the revenue breakdown closes without counting capital taxes twice',async()=>{
 const {finances:f}=await loadData(root);
 const w=await loadArchivedWorker();
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
 const {fiscalContext:p}=await loadArchivedEconomy();
 const w=await loadArchivedWorker();
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

test('debt views preserve nominal obligations, purchasing power and GDP units',async()=>{
 const {debtHistory:h}=await loadData(root);
 const {debtHistoryValues:view}=await import('../../src/shared/debt-history.mjs');
 const base=h.rows.find(row=>row.year===h.baseYear),first=h.rows[0];
 assert.deepEqual(view(base,'real'),view(base,'euros'));
 assert.equal(h.baseYear,2025);assert.equal(h.baseIndex,126.65);
 assert.ok(Math.abs(view(first,'real').debt/view(first,'euros').debt-126.65/71.22)<1e-12);
 for(const row of h.rows) {
  assert.equal(view(row,'pib').debt,row.ratio);
  assert.ok(Math.abs(view(row,'pib').balance-row.balanceM/row.gdpM*100)<1e-12);
  assert.equal(Math.sign(view(row,'real').balance),Math.sign(row.balanceM));
  assert.ok(Math.abs(view(row,'percapita').debt*row.population-row.debtM*1e6)<.001);
 }
 assert.equal(view({...first,debtM:null,ratio:null,gdpM:null},'pib').debt,null);
 assert.equal(view({...first,population:null},'percapita').debt,null);
});

test('constant-euro history rejects missing base prices and incorrect inflation dimensions',async()=>{
 const {debtHistoryModel:model}=await import('../lib/debt-history.mjs');
 const data=await loadData(root),raw=JSON.parse(await readFile(resolve(root,'data/raw/eurostat-inflacion-2000-2025.json'),'utf8'));
 const context={debt:data.debt,finances:data.finances,sourceId:data.config.inflationSourceId};
 const missing=structuredClone(raw);delete missing.value[missing.dimension.time.category.index['2025']];
 assert.throws(()=>model(missing,context),/año base 2025/);
 const wrong=structuredClone(raw);wrong.dimension.unit.category.index={RCH_A_AVG:0};
 assert.throws(()=>model(wrong,context),/INX_A_AVG/);
});


test('annual government attribution handles transition years and filtered periods',async()=>{
 const {debtTimeline:t}=await loadData(root);
 const {governmentForYear:gov,governmentSegments:segments}=await import('../../src/shared/debt-timeline.mjs');
 assert.equal(gov(t,2003).id,'aznar');assert.equal(gov(t,2004).id,'zapatero');
 assert.equal(gov(t,2011).id,'zapatero');assert.equal(gov(t,2012).id,'rajoy');
 assert.equal(gov(t,2017).id,'rajoy');assert.equal(gov(t,2018).id,'sanchez');
 assert.deepEqual(segments(t,[2016,2017,2018,2019]).map(s=>[s.government.id,s.startIndex,s.endIndex]),[['rajoy',0,1],['sanchez',2,3]]);
});

test('historical context rejects missing coverage, duplicate events and invalid dates',async()=>{
 const {debtTimeline:t}=await loadData(root);
 const {validateDebtTimeline:validate}=await import('../../src/shared/debt-timeline.mjs');
 const stale=structuredClone(t);stale.observedThrough=2024;assert.throws(()=>validate(stale,[2025]),/observedThrough/);
 const duplicate=structuredClone(t);duplicate.events.push(duplicate.events[0]);assert.throws(()=>validate(duplicate,[2000,2025]),/duplicado/);
 const invalid=structuredClone(t);invalid.governments[0].start='1996-02-30';assert.throws(()=>validate(invalid,[2000,2025]),/fecha inválida/);
});
