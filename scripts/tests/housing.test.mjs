import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {housingModel} from '../lib/housing.mjs';
const raw=JSON.parse(await readFile(new URL('../../data/official/housing.json',import.meta.url),'utf8'));
test('housing flows align January household stocks with full-year construction and closing prices',()=>{
 const model=housingModel(raw);
 assert.equal(model.rows.find(r=>r.year===2021).newHouseholds,282880);
 assert.equal(model.latest.newHouseholds,241013);
 assert.equal(model.latest.completed,91896);
 assert.equal(model.latest.gap,149117);
 assert.ok(Math.abs(model.latest.priceGrowth-12.885577848434107)<.001);
 assert.ok(Math.abs(model.latest.priceAccumulated-95.52516961219533)<.001);
 for(const row of model.rows)assert.equal(row.gap,row.newHouseholds-row.completed);
});
test('housing rejects partial construction years, duplicate years and incompatible reference dates',()=>{
 for(const mutate of [r=>r.construction.at(-1).quarters.pop(),r=>r.households.pop(),r=>r.prices.splice(0,1),r=>r.construction.push(r.construction[0])]){
  const copy=structuredClone(raw);mutate(copy);assert.throws(()=>housingModel(copy),/Vivienda/);
 }
});
test('emancipation estimates remain independent stocks and are not extrapolated beyond the study',async()=>{
 const emancipation=JSON.parse(await readFile(new URL('../../data/official/housing-emancipation.json',import.meta.url),'utf8'));
 const model=housingModel(raw,emancipation);
 assert.equal(model.rows.find(r=>r.year===2024).blockedHouseholds,311403);
 assert.equal(model.latest.blockedHouseholds,null);
 assert.equal(model.latest.cumulativeGap,model.rows.reduce((sum,r)=>sum+r.gap,0));
 const without=housingModel(raw);
 assert.equal(model.latest.gap,without.latest.gap);
 assert.equal(model.latest.cumulativeGap,without.latest.cumulativeGap);
 const invalid=structuredClone(emancipation);invalid.series.push(invalid.series[0]);assert.throws(()=>housingModel(raw,invalid),/Vivienda/);
});

test('cumulative housing gap carries deficits forward and offsets years with excess construction',()=>{
 const model=housingModel(raw);
 assert.equal(model.rows[0].year,2014);assert.equal(model.rows.length,12);
 assert.equal(model.rows.find(r=>r.year===2014).cumulativeGap,35372);
 assert.equal(model.rows.find(r=>r.year===2015).cumulativeGap,29000);
 assert.equal(model.latest.cumulativeHouseholds,1760336);
 assert.equal(model.latest.cumulativeCompleted,894063);
 assert.equal(model.latest.cumulativeGap,866273);
 for(const row of model.rows)assert.equal(row.cumulativeGap,row.cumulativeHouseholds-row.cumulativeCompleted);
});
test('historical household source levels are not spliced into artificial 2021 growth',()=>{
 const shifted=structuredClone(raw);for(const row of shifted.historicalHouseholds)row.households+=1000000;
 const original=housingModel(raw),adjusted=housingModel(shifted);
 assert.deepEqual(adjusted.rows,original.rows);
 assert.equal(original.rows.find(r=>r.year===2020).newHouseholds,129100);
 assert.equal(original.rows.find(r=>r.year===2021).newHouseholds,282880);
});
