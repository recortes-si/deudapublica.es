import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadData} from '../lib/data.mjs';
import {repaymentModel} from '../lib/repayment.mjs';
import {repaymentMeasures,repaymentProjection,requiredPrimary,repaymentRevenue,requiredSpendingAdjustment} from '../../src/shared/repayment.mjs';
const root=resolve(import.meta.dirname,'../..');
test('repayment separates primary balance, interest and principal without counting savings twice',()=>{
 const result=repaymentProjection({debt:1000,primary:150,rate:.05,years:2});
 assert.equal(result.rows[1].interest,50);assert.equal(result.rows[1].principal,100);assert.equal(result.rows[1].debt,900);
 assert.equal(result.rows[2].interest,45);assert.equal(result.rows[2].principal,105);assert.equal(result.totalInterest,95);
 const increasing=repaymentProjection({debt:1000,primary:20,rate:.05,years:2});assert.equal(increasing.rows[1].debt,1030);
});
test('target payment clears the debt at its horizon, including zero interest and final partial payments',()=>{
 for(const rate of [0,.0239,.08])for(const years of [10,40,80]){
  const result=repaymentProjection({debt:1620573.31,primary:requiredPrimary(1620573.31,rate,years),rate,years:80});
  assert.equal(result.paidAfter,years);assert.equal(result.rows[years].debt,0);assert.equal(result.rows.at(-1).interest,years===80?result.rows[80].interest:0);
 }
 const early=repaymentProjection({debt:100,primary:200,rate:.05,years:2});assert.equal(early.paidAfter,1);assert.equal(early.totalInterest,5);assert.equal(early.rows[1].principal,100);
 assert.throws(()=>requiredPrimary(100,.01,0),/rango/);assert.throws(()=>repaymentProjection({debt:100,primary:1,rate:-1,years:10}),/rango/);
});
test('repayment bases share a year and remove interest from general spending',async()=>{
 const d=await loadData(root),p=d.repayment;
 d.benefits=JSON.parse(await readFile(resolve(root,'data/official/social-benefits-2024.json'),'utf8'));
 assert.equal(p.year,2024);assert.equal(p.primary,-12474);assert.equal(p.pensionBase,172666.48);
 assert.equal(p.cuts.find(row=>row.id==='general').base,92551-38793);
 assert.ok(Math.abs(p.debt-1620573.31)<1e-6);
 assert.throws(()=>repaymentModel({...p,year:2025},d),/compartir año/);
 assert.throws(()=>repaymentModel({...p,cuts:[p.cuts[0],p.cuts[0]]},d),/duplicadas/);
 assert.throws(()=>repaymentModel({...p,cuts:[{...p.cuts[0],code:'10'}]},d),/solapada/);
});
test('pension freeze savings expose purchasing-power losses and do not alone close the deficit',async()=>{
 const p=(await loadData(root)).repayment;
 const frozen=repaymentMeasures(p,{inflation:2,pensionMode:'freeze',reductions:{}});
 assert.ok(Math.abs(frozen.total-3385.61725490196)<1e-8);assert.ok(Math.abs(frozen.pensionPurchasingChange-(1/1.02-1))<1e-10);
 const initial=repaymentProjection({debt:p.debt,primary:p.primary+frozen.total,rate:p.rate,years:40});assert.equal(initial.paidAfter,null);assert.ok(initial.rows[1].debt>p.debt);
 assert.equal(repaymentMeasures(p,{inflation:2,pensionMode:'ipc',reductions:{}}).total,0);
 assert.equal(repaymentMeasures(p,{inflation:0,pensionMode:'freeze',reductions:{}}).total,0);
 assert.ok(repaymentMeasures(p,{inflation:0,pensionMode:'floor',reductions:{}}).total<0);
 assert.throws(()=>repaymentMeasures(p,{inflation:2,pensionMode:'freeze',reductions:{health:101}}),/rango/);
});

test('direct pension reductions can create a surplus and combine with indexation without double counting',async()=>{
 const p=(await loadData(root)).repayment;
 const reduced=repaymentMeasures(p,{inflation:2,pensionMode:'ipc',reductions:{pensions:40}});
 assert.ok(Math.abs(reduced.total-69066.592)<1e-8);assert.ok(Math.abs(reduced.pensionPurchasingChange+.4)<1e-10);
 const result=repaymentProjection({debt:p.debt,primary:p.primary+reduced.total,rate:p.rate,years:80});assert.ok(result.rows[1].principal>0);assert.ok(result.paidAfter!==null);
 const all=repaymentMeasures(p,{inflation:2,pensionMode:'freeze',reductions:{pensions:100}});assert.equal(all.total,p.pensionBase);
 const combined=repaymentMeasures(p,{inflation:2,pensionMode:'freeze',reductions:{pensions:10,noncontributory:50,minimum:10,imv:100,family:20}});
 assert.ok(Math.abs(combined.items.find(item=>item.id==='pensions').value-20313.70352941177)<1e-7);
 assert.equal(combined.items.find(item=>item.id==='imv').value,3854.67);assert.equal(combined.items.find(item=>item.id==='noncontributory').value,1619.245);
 assert.ok(Math.abs(combined.items.find(item=>item.id==='minimum').value-787.34)<1e-8);
 assert.throws(()=>repaymentMeasures(p,{inflation:2,pensionMode:'ipc',reductions:{imv:101}}),/rango/);
});
test('benefit source totals close and overlap or invalid observations are rejected',async()=>{
 const d=await loadData(root),benefits=JSON.parse(await readFile(resolve(root,'data/official/social-benefits-2024.json'),'utf8'));
 const input={...d,benefits};
 assert.ok(Math.abs(benefits.items.filter(item=>['noncontributory','minimum'].includes(item.id)).reduce((sum,item)=>sum+item.value,0)-11111.89)<1e-8);
 const duplicate=structuredClone(benefits);duplicate.items[1].id='pensions';assert.throws(()=>repaymentModel(d.repayment,{...input,benefits:duplicate}),/duplicadas/);
 const wrong=structuredClone(benefits);wrong.items[3].value=5574.72;assert.throws(()=>repaymentModel(d.repayment,{...input,benefits:wrong}),/no cuadra/);
});

test('all spending functions cover primary expenditure and nested social changes are sequential',async()=>{
 const p=(await loadData(root)).repayment;
 assert.equal(p.cuts.length,10);assert.ok(Math.abs(p.cuts.reduce((sum,item)=>sum+item.base,0)-(p.expenditure-p.interest))<1e-8);
 const cut=repaymentMeasures(p,{inflation:2,pensionMode:'ipc',reductions:{pensions:50,social:50}});
 const social=p.cuts.find(item=>item.id==='social').base;
 assert.ok(Math.abs(cut.total-(p.pensionBase*.5+(social-p.pensionBase*.5)*.5))<1e-8);
 assert.ok(Math.abs(cut.pensionPurchasingChange+.75)<1e-10);
 const all=repaymentMeasures(p,{inflation:2,pensionMode:'ipc',reductions:{pensions:100,social:100}});assert.equal(all.total,social);
 const increase=repaymentMeasures(p,{inflation:2,pensionMode:'ipc',reductions:{health:-10}});assert.ok(Math.abs(increase.total+10294.2)<1e-8);
});
test('tax changes and compound nominal growth do not count the same receipts twice',()=>{
 const revenue=repaymentRevenue({fiscalRevenue:100},{taxChange:10,growth:2,years:2});
 assert.ok(Math.abs(revenue.rows[0].total-12.2)<1e-10);assert.ok(Math.abs(revenue.rows[1].total-14.444)<1e-10);
 assert.equal(repaymentRevenue({fiscalRevenue:100},{taxChange:-20,growth:0,years:2}).rows[1].total,-20);
 assert.throws(()=>repaymentRevenue({fiscalRevenue:100},{taxChange:0,growth:-1,years:10}),/rango/);
});
test('repayment targets account for later growth receipts and zero interest',async()=>{
 const p=(await loadData(root)).repayment,years=40;
 for(const rate of [0,p.rate]){
  const income=repaymentRevenue(p,{taxChange:5,growth:1,years});
  const adjustment=requiredSpendingAdjustment({debt:p.debt,primary:p.primary,rate,years,extraRevenue:income.rows.map(row=>row.total)});
  const result=repaymentProjection({debt:p.debt,primary:p.primary+adjustment,primaryByYear:income.rows.map(row=>p.primary+adjustment+row.total),rate,years});
  assert.equal(result.paidAfter,years);assert.equal(result.rows.at(-1).debt,0);
  const unchanged=requiredSpendingAdjustment({debt:p.debt,primary:p.primary,rate,years,extraRevenue:Array(years).fill(0)});
  assert.ok(unchanged>adjustment);
 }
 assert.throws(()=>repaymentProjection({debt:100,primary:0,primaryByYear:[1],rate:.01,years:2}),/saldos/);
});
