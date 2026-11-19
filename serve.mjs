// Local preview: `npm start`, then open http://localhost:4173
// localhost counts as a secure origin, so the microphone works here.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { wrap } from './shell.mjs';

const ROOT = new URL('.', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  const file = path === '/' ? 'index.html' : path.slice(1);
  try {
    const data = await readFile(join(ROOT, file), 'utf8');
    res.writeHead(200, { 'content-type': `${TYPES[extname(file)] ?? 'text/plain'}; charset=utf-8`, 'cache-control': 'no-store' });
    res.end(file === 'index.html' ? wrap(data) : data);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(4173, () => console.log('Woodshed on http://localhost:4173'));
