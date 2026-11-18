import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';

const arg = process.argv[2];
const modes = { '--device':'device', '--hybrid':'hybrid' };
if (arg && !modes[arg]) throw new Error('Choose --device, --hybrid or no flag.');
const mode = modes[arg] || 'offline';
const bundle = await build({
  entryPoints: ['src/app.js'], bundle: true, write: false, format: 'iife',
  platform: 'browser', target: 'chrome139', minify: true, legalComments: 'inline',
  define: { FIELDNOTES_BUILD_MODE: JSON.stringify(mode) },
});
const template = await readFile('index.template.html', 'utf8');
const css = await readFile('src/style.css','utf8');
const policy = mode==='hybrid' ? '' : '<meta http-equiv="Content-Security-Policy" content="connect-src \'none\'; frame-src \'none\'; object-src \'none\'">';
const page = template.replace('<head>', '<head>'+policy).replace('/* APP_STYLES */', () => css)
  .replace('/* APP_CONFIG */', mode==='offline' ? '' : '/* SERVED_PRIVATE_CONFIG */')
  .replace('/* APP_CODE */', () => bundle.outputFiles[0].text.replace(/<\/script/gi,'<\\/script'));
const output = mode==='offline' ? 'index.html' : 'private-'+mode+'.html';
await writeFile(output, page);
console.log('Built ' + output + ' with Firebase AI Logic and App Check (' + Buffer.byteLength(page) + ' bytes).');
