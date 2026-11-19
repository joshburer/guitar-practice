// `npm run build` writes dist/: a static site you can put on any HTTPS host
// (GitHub Pages, Netlify, Cloudflare Pages). HTTPS is what lets the browser offer the microphone.
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { wrap } from './shell.mjs';

const at = (path) => new URL(path, import.meta.url);
await rm(at('dist'), { recursive: true, force: true });
await mkdir(at('dist'));
await writeFile(at('dist/index.html'), wrap(await readFile(at('index.html'), 'utf8')));
await cp(at('styles.css'), at('dist/styles.css'));
await cp(at('src'), at('dist/src'), { recursive: true });
console.log('Built dist/');
