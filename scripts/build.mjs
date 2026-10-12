import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadData } from './lib/data.mjs';
import { fillTemplate, templateValues } from './lib/render.mjs';
import { assembleComponents } from './lib/components.mjs';
import { loadAssets } from './lib/assets.mjs';
import { loadChartRegistry, checkChartDocumentation } from './lib/chart-registry.mjs';

const root = resolve(import.meta.dirname, '..');
export async function buildSite(directory = 'public') {
  const output = resolve(root, directory);
  const rel = relative(output, root);
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)) || ['src','data','scripts','docs','.git','.github'].some(dir => {
    const path = relative(resolve(root, dir), output);
    return path === '' || (!path.startsWith('..') && !isAbsolute(path));
  })) throw new Error('El directorio de salida no puede sobrescribir el repositorio ni sus fuentes');

  // Fully validate and assemble before touching the published page.
  const data = await loadData(root);
  const template = await assembleComponents(root, await readFile(resolve(root, 'src/index.html'), 'utf8'));
  const registry = await loadChartRegistry(root, { data, template });
  await checkChartDocumentation(root, registry);
  const { css, vendor, license, modules } = await loadAssets(root);
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const inline = script => script.replace(/<\/script/gi, '<\\/script');
  const imageUri = async name => 'data:image/png;base64,' + (await readFile(resolve(root, 'src/assets', name))).toString('base64');
  const [logo, favicon, touchIcon] = await Promise.all(['logo-es.png','favicon-es.png','apple-touch-icon-es.png'].map(imageUri));
  const page = fillTemplate(template, { ...templateValues(data), BRAND_LOGO: logo })
    .replace('<!-- BRAND_ICONS -->', () => `<link rel="icon" type="image/png" sizes="64x64" href="${favicon}" />\n    <link rel="apple-touch-icon" sizes="180x180" href="${touchIcon}" />\n    <meta name="theme-color" content="#10243e" />`)
    .replace('<!-- STYLES -->', () => `<style>\n${css}\n</style>`)
    .replace('<!-- DATA_INJECTION -->', () => `<script>window.APP_DATA = ${json};</script>`)
    .replace('<!-- SCRIPTS -->', () => `<!-- Apache ECharts license\n${license.replace(/--/g, '—')}\n-->\n<script>${inline(vendor)}</script>\n<script>\n(() => {\n${inline(modules.join('\n'))}\n})();\n</script>`);
  if (/<!-- (COMPONENT:|STYLES|BRAND_ICONS|DATA_INJECTION|SCRIPTS)|\{\{[A-Z_]+\}\}/.test(page)) throw new Error('Quedan marcadores sin resolver');
  await mkdir(output, { recursive: true });
  const temporary = resolve(output, 'index.html.tmp');
  await writeFile(temporary, page);
  await rename(temporary, resolve(output, 'index.html'));
  // Retire only the old known vendor artifacts; never remove an arbitrary output directory.
  await Promise.all(['echarts.min.js','echarts.LICENSE.txt'].map(file => rm(resolve(output, 'vendor', file), { force: true })));
  console.log(`Generado ${resolve(output, 'index.html')}: ${data.debt.length} años de deuda, ${data.spendingHistory.length} años de gasto. Un único HTML autónomo.`);
  return { page, data, output };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await buildSite(process.argv[2] || 'public');
}
