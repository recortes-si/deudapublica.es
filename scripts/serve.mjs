import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const file = resolve(import.meta.dirname, '../public/index.html');
const port = Number(process.env.PORT || 8080);
createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (!['/', '/index.html'].includes(path)) { response.writeHead(404); response.end('No encontrado'); return; }
  try {
    const page = await readFile(file);
    response.writeHead(200, { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-cache' }); response.end(page);
  } catch { response.writeHead(503); response.end('Ejecuta npm run build antes de abrir la web.'); }
}).listen(port, '127.0.0.1', () => console.log(`deudapublica.es: http://localhost:${port}`));
