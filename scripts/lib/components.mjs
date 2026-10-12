import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function assembleComponents(root, template, parents = []) {
  for (const match of template.matchAll(/<!-- COMPONENT:([a-z-]+) -->/g)) {
    const name = match[1];
    if (parents.includes(name)) throw new Error('Componentes con referencia circular: ' + [...parents, name].join(' → '));
    const file = resolve(root, `src/components/${name}.html`);
    const component = await assembleComponents(root, await readFile(file, 'utf8'), [...parents, name]);
    template = template.replace(match[0], () => component);
  }
  return template;
}
