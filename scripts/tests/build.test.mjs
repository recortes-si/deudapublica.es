import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSite } from '../build.mjs';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { Script } from 'node:vm';
const root = resolve(import.meta.dirname, '../..');

test('build produces one standalone HTML with valid scripts and no unresolved template', async () => {
  const output = await mkdtemp(resolve(tmpdir(),'deudapublica-build-'));
  try {
    await buildSite(output);
    assert.deepEqual(await readdir(output),['index.html']);
    const html = await readFile(resolve(output,'index.html'),'utf8');
    assert.doesNotMatch(html, /<script\b[^>]*\bsrc=|<link\b[^>]*rel="stylesheet"|<!-- COMPONENT:|\{\{[A-Z_]+\}\}/);
    assert.match(html,/Apache ECharts license/);
    assert.match(html,/Serie anual de deuda pública/);
    assert.match(html,/Ocio, cultura y religión/);
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length,3);
    for (const [,script] of scripts) new Script(script);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
    assert.equal(new Set(ids).size,ids.length);
    for (const [,target] of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(target),`Missing anchor ${target}`);
  } finally { await rm(output,{recursive:true,force:true}); }
});

test('build refuses to overwrite source directories', async () => {
  await assert.rejects(buildSite(root), /sobrescribir/);
  await assert.rejects(buildSite(resolve(root,'src/generated')), /sobrescribir/);
});
