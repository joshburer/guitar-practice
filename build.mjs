// `npm run build` writes dist/: a static site you can put on any HTTPS host
// (GitHub Pages, Netlify, Cloudflare Pages). HTTPS is what lets the browser offer the microphone.
//
// Caching: hosts like GitHub Pages let browsers keep files for a while, and a phone's home-screen app often resumes
// the old page instead of reloading. So every build puts its files under a folder named after a hash of their
// content (dist/<build>/...), and writes dist/version.json. The page checks that file whenever it opens or comes
// back to the foreground, and reloads itself onto the new build when there is one.
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { wrap } from './shell.mjs';

const at = (path) => new URL(path, import.meta.url);

async function files(dir) {
  const out = [];
  for (const entry of await readdir(at(dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    out.push(...(entry.isDirectory() ? await files(path) : [path]));
  }
  return out;
}

const sources = ['index.html', 'styles.css', 'shell.mjs', ...(await files('src'))].sort();
const hash = createHash('sha256');
for (const path of sources) hash.update(path).update(await readFile(at(path)));
const build = hash.digest('hex').slice(0, 10);

await rm(at('dist'), { recursive: true, force: true });
await mkdir(at(`dist/${build}`), { recursive: true });
await cp(at('styles.css'), at(`dist/${build}/styles.css`));
await cp(at('src'), at(`dist/${build}/src`), { recursive: true }); // relative imports inside stay in the folder

const page = (await readFile(at('index.html'), 'utf8'))
  .replace('href="styles.css"', `href="${build}/styles.css"`)
  .replace('src="src/app.js"', `src="${build}/src/app.js"`);
if (!page.includes(`${build}/src/app.js`) || !page.includes(`${build}/styles.css`)) throw new Error('index.html: asset paths not found');

const check = `<script>
(() => {
  const build = '${build}';
  const look = () => fetch('version.json', { cache: 'no-store' })
    .then((r) => r.json())
    .then((v) => { if (v.build && v.build !== build) location.replace(location.pathname + '?v=' + v.build + location.hash); })
    .catch(() => {});
  look();
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && look());
})();
</script>`;
await writeFile(at('dist/index.html'), wrap(page, check));
await writeFile(at('dist/version.json'), JSON.stringify({ build }) + '\n');
console.log(`Built dist/ (build ${build})`);
