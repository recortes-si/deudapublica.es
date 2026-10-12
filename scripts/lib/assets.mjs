import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Dependency order of the standalone runtime; app is always the entry point.
export const sharedModules = ['inflation','debt-timeline','debt-history','repayment','fiscal'];
export const browserModules = ['helpers','chart-theme','indicators','debt-chart','interest','repayment','fiscal-timeline','finances','spending','budget','growth-chart','housing','sharing','app'];

export async function loadAssets(root) {
  const text = file => readFile(resolve(root, file), 'utf8');
  const [css, vendor, license, shared, browser] = await Promise.all([
    text('src/styles/main.css'), text('src/vendor/echarts.min.js'), text('src/vendor/echarts.LICENSE.txt'),
    Promise.all(sharedModules.map(name => text(`src/shared/${name}.mjs`))),
    Promise.all(browserModules.map(name => text(`src/js/${name}.js`)))
  ]);
  // Shared files are pure functions with named exports and no runtime imports.
  if (shared.some(script => /^import /m.test(script))) throw new Error('Runtime compartido: no admite imports sin empaquetar');
  return { css, vendor, license, modules: [...shared.map(script => script.replace(/^export /gm, '')), ...browser] };
}
