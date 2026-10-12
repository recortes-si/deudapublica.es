import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { createDataStore } from './sources.mjs';
import { browserModules } from './assets.mjs';

const repoFile = (root, file) => {
  const path = resolve(root, file), rel = relative(root, path);
  if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Registro: ruta fuera del repositorio ${file}`);
  return path;
};

export async function loadChartRegistry(root, { data, template } = {}) {
  const store = await createDataStore(root);
  const registry = await store.json('charts.json');
  if (registry.schemaVersion !== 1 || !Array.isArray(registry.charts) || !registry.charts.length) throw new Error('Registro: esquema no válido');
  const ids = new Set(), selectors = new Set();
  for (const chart of registry.charts) {
    if (!/^[a-z][a-z0-9-]*$/.test(chart.id || '') || ids.has(chart.id)) throw new Error('Registro: ID duplicado o inválido');
    ids.add(chart.id);
    if (!chart.title || !/^[#.][a-z][a-z0-9-]*$/.test(chart.selector || '') || selectors.has(chart.selector) || !chart.unit || !chart.calculation || !chart.limitations) throw new Error(`Registro: descripción incompleta ${chart.id}`);
    selectors.add(chart.selector);
    const renderer = await readFile(repoFile(root, chart.renderer), 'utf8');
    if (chart.renderer.startsWith('src/js/') && !browserModules.includes(chart.renderer.split('/').at(-1).replace('.js',''))) throw new Error(`Registro: módulo no empaquetado ${chart.renderer}`);
    if (!renderer.length || !Array.isArray(chart.inputs) || !chart.inputs.length || !Array.isArray(chart.models) || !chart.models.length) throw new Error(`Registro: faltan entradas/modelos ${chart.id}`);
    for (const input of chart.inputs) {
      if (Object.keys(input).filter(key => ['configKey','configFileKey','sourceId','file'].includes(key)).length !== 1) throw new Error(`Registro: entrada ambigua ${chart.id}`);
      const sourceId = input.configKey ? store.config[input.configKey] : input.sourceId;
      const source = sourceId ? store.byId.get(sourceId) : null;
      if (sourceId && !source) throw new Error(`Registro: fuente desconocida ${sourceId}`);
      const file = input.file || (input.configFileKey ? store.config[input.configFileKey] : source?.file);
      if (input.sourceId && !file) continue; // Published reference for a curated observation.
      if (!file || !/\.(csv|json)$/.test(file)) throw new Error(`Registro: entrada sin CSV/JSON ${chart.id}`);
      await store.text(file);
    }
    if (data) for (const model of chart.models) {
      const value = model.split('.').reduce((object, key) => object?.[key], data);
      if (value == null) throw new Error(`Registro: modelo inexistente ${chart.id}/${model}`);
    }
    if (template) {
      const present = chart.selector.startsWith('#')
        ? template.includes(`id="${chart.selector.slice(1)}"`)
        : [...template.matchAll(/class="([^"]+)"/g)].some(match => match[1].split(/\s+/).includes(chart.selector.slice(1)));
      if (!present) throw new Error(`Registro: visualización ausente ${chart.selector}`);
    }
  }
  // Every ECharts container in the shipped runtime must have a provenance entry.
  for (const module of browserModules) {
    const script = await readFile(repoFile(root, `src/js/${module}.js`), 'utf8');
    for (const match of script.matchAll(/charts\.init\(document\.querySelector\(['"]([^'"]+)['"]\)/g)) {
      if (!selectors.has(match[1])) throw new Error(`Registro: gráfico sin documentar ${match[1]}`);
    }
  }
  return { registry, store };
}

export function chartDocumentation({ registry, store }) {
  const link = file => `[${file}](../${file})`;
  const lines = [
    '# Datos de cada gráfico', '',
    '<!-- Generado por npm run docs:data. Editar data/charts.json, no este fichero. -->', '',
    'Contrato verificable de las visualizaciones publicadas. `npm run check` comprueba que fuentes, CSV/JSON, modelos, módulos y contenedores existen, que cada gráfico ECharts tiene ficha y que este documento está actualizado.', '',
    'Los ficheros se leen durante la construcción. El navegador recibe `window.APP_DATA` y dibuja desde ese modelo; no descarga datos ni usa APIs. Los ceros de referencia, bases de 100, unidades, colores y límites de controles son constantes de presentación o supuestos, no observaciones históricas.', '',
    'Para formatos, extracción, validaciones y actualización: [guía de datos](data.md). Para composición y publicación: [arquitectura](architecture.md).', '',
    '| Visualización | Contenedor | Código que representa |', '| --- | --- | --- |',
    ...registry.charts.map(chart => `| [${chart.title}](#${chart.id}) | \`${chart.selector}\` | ${link(chart.renderer)} |`), ''
  ];
  for (const chart of registry.charts) {
    lines.push(`<a id="${chart.id}"></a>`, '', `## ${chart.title}`, '', `- Contenedor: \`${chart.selector}\`. Código: ${link(chart.renderer)}.`, `- Modelo: ${chart.models.map(model => `\`APP_DATA.${model}\``).join(', ')}.`, `- Unidades: ${chart.unit}.`, '', '### Entradas', '');
    for (const input of chart.inputs) {
      const id = input.configKey ? store.config[input.configKey] : input.sourceId;
      const source = store.byId.get(id);
      const file = input.file || (input.configFileKey ? store.config[input.configFileKey] : source?.file);
      lines.push(`- ${file ? link('data/' + file) : 'Referencia publicada'}${input.configKey ? ` · \`site.json → ${input.configKey}\`` : input.configFileKey ? ` · \`site.json → ${input.configFileKey}\`` : ''}${input.role ? ` · ${input.role}` : ''}.${source ? ` Fuente: [${source.publisher} · ${source.title}](${source.url}), ${source.period}.` : ''}`);
    }
    lines.push('', '### Cálculo', '', chart.calculation, '', '### Alcance y límites', '', chart.limitations, '');
  }
  return lines.join('\n');
}

export async function checkChartDocumentation(root, result) {
  const existing = await readFile(resolve(root, 'docs/charts.md'), 'utf8');
  if (existing !== chartDocumentation(result)) throw new Error('Documentación de gráficos desactualizada: ejecuta npm run docs:data');
}
