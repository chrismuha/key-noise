const { spawn } = require('node:child_process');
const path = require('node:path');
const args = process.argv.slice(2);
const web = args[0] === 'web';
const child = web
  ? spawn(process.execPath, [path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js'), '--host', '127.0.0.1', '--port', '5199', '--strictPort', '--open', '/dev-preview.html', ...args.slice(1)], { stdio: 'inherit' })
  : spawn(process.execPath, [path.join(__dirname, 'run-shared-if-present.cjs'), '../_shared/vite-electron-dev.mjs', '--port', '5199', ...args], { stdio: 'inherit' });
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code) => { process.exitCode = code ?? 0; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
