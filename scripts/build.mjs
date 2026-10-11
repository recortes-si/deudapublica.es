import { mkdir, readFile, writeFile, rename, rm } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadData } from './lib/data.mjs';
import { fillTemplate, templateValues } from './lib/render.mjs';

const root = resolve(import.meta.dirname, '..');
export async function buildSite(directory = 'public') {
  const output = resolve(root, directory);
  const rel = relative(output, root);
  if (rel === '' || (!rel.startsWith('..') && !isAbsolute(rel)) || ['src','data','scripts','.git'].some(dir => {
    const path = relative(resolve(root, dir), output);
    return path === '' || (!path.startsWith('..') && !isAbsolute(path));
  })) throw new Error('El directorio de salida no puede sobrescribir el repositorio ni sus fuentes');

  // Fully validate and assemble before touching the published page.
  const data = await loadData(root);
  const text = file => readFile(resolve(root, file), 'utf8');
  let template = await text('src/index.html');
  for (const match of template.matchAll(/<!-- COMPONENT:([a-z-]+) -->/g)) {
    const component = await text(`src/components/${match[1]}.html`);
    template = template.replace(match[0], () => component);
  }
  const [css, vendor, license, ...modules] = await Promise.all([
    text('src/styles/main.css'), text('src/vendor/echarts.min.js'), text('src/vendor/echarts.LICENSE.txt'),
    ...['helpers','indicators','debt-chart','interest','repayment','fiscal-timeline','finances','spending','budget','app'].map(name => text(`src/js/${name}.js`))
  ]);
  modules.unshift((await text('src/shared/repayment.mjs')).replace(/^export /gm, ''), (await text('src/shared/fiscal.mjs')).replace(/^export /gm, ''));
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  const inline = script => script.replace(/<\/script/gi, '<\\/script');
  const page = fillTemplate(template, templateValues(data))
    .replace('<!-- STYLES -->', () => `<style>\n${css}\n</style>`)
    .replace('<!-- DATA_INJECTION -->', () => `<script>window.APP_DATA = ${json};</script>`)
    .replace('<!-- SCRIPTS -->', () => `<!-- Apache ECharts license\n${license.replace(/--/g, '—')}\n-->\n<script>${inline(vendor)}</script>\n<script>\n(() => {\n${inline(modules.join('\n'))}\n})();\n</script>`);
  if (/<!-- (COMPONENT:|STYLES|DATA_INJECTION|SCRIPTS)|\{\{[A-Z_]+\}\}/.test(page)) throw new Error('Quedan marcadores sin resolver');
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
