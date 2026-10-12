import { readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';

// One catalog and path policy for every build-time data reader.
export async function createDataStore(root) {
  const dataRoot = resolve(root, 'data');
  const pathFor = file => {
    const path = resolve(dataRoot, file), rel = relative(dataRoot, path);
    if (rel.startsWith('..') || isAbsolute(rel)) throw new Error(`Ruta fuera de data/: ${file}`);
    return path;
  };
  const text = file => readFile(pathFor(file), 'utf8');
  const json = async file => JSON.parse(await text(file));
  const [config, catalog] = await Promise.all([json('site.json'), json('sources.json')]);
  const allSources = catalog.datasets;
  if (!Array.isArray(allSources)) throw new Error('sources.json: datasets debe ser una lista');
  const byId = new Map();
  for (const source of allSources) {
    if (!source.id || byId.has(source.id)) throw new Error(`Fuente duplicada o sin id: ${source.id}`);
    if (!source.title || !source.publisher || !source.period || !/^\d{4}-\d{2}-\d{2}$/.test(source.updated)) throw new Error(`Metadatos incompletos: ${source.id}`);
    if (!/^https?:$/.test(new URL(source.url).protocol)) throw new Error(`URL de fuente no válida: ${source.id}`);
    if (source.file) pathFor(source.file);
    byId.set(source.id, source);
  }
  const sourceFor = key => {
    const source = byId.get(config[key]);
    if (!source?.file) throw new Error(`site.json: ${key} debe referenciar una fuente con file`);
    return { source, path: pathFor(source.file) };
  };
  return {
    config, catalog, allSources, sources: allSources.filter(source => !source.archived),
    byId, pathFor, text, json, sourceFor,
    read: key => readFile(sourceFor(key).path, 'utf8')
  };
}
