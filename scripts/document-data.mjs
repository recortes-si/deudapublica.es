import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadChartRegistry, chartDocumentation, checkChartDocumentation } from './lib/chart-registry.mjs';

const root = resolve(import.meta.dirname, '..');
const result = await loadChartRegistry(root);
if (process.argv.includes('--check')) {
  await checkChartDocumentation(root, result);
  console.log('Documentación de gráficos actualizada.');
} else {
  await mkdir(resolve(root, 'docs'), { recursive: true });
  await writeFile(resolve(root, 'docs/charts.md'), chartDocumentation(result));
  console.log('Generado docs/charts.md desde data/charts.json y data/sources.json.');
}
