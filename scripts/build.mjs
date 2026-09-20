import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { build } from 'vite';
const require = createRequire(import.meta.url);
const root = process.cwd();
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'neo-defender-build-'));
try {
  const logPath = path.join(scratch, 'vite.log');
  const log = fs.openSync(logPath, 'w');
  const vite = path.join(path.dirname(require.resolve('vite/package.json')), 'bin/vite.js');
  const result = spawnSync(process.execPath, [vite, 'build'], { cwd: root, stdio: ['ignore', log, log] });
  fs.closeSync(log);
  const output = fs.readFileSync(logPath, 'utf8');
  if (result.status === 0) { process.stdout.write(output); }
  else if (process.platform === 'win32' && /spawn EPERM/.test(output)) {
    // Some managed Windows environments prohibit child-process communication pipes.
    // Keep the normal Vite path everywhere else; here invoke the same compiler as a CLI
    // with inherited handles, then let Vite package its already-transformed output.
    console.log('Windows pipe restriction detected. Building in two stages (esbuild CLI + Vite).');
    const esbuild = require.resolve(`@esbuild/win32-${process.arch}/esbuild.exe`);
    const entry = path.join(scratch, 'app.js');
    const compiled = spawnSync(esbuild, ['src/main.tsx', '--bundle', '--minify', '--jsx=automatic', '--format=esm', '--target=es2022', '--define:process.env.NODE_ENV="production"', `--outfile=${entry}`], { cwd: root, stdio: 'inherit' });
    if (compiled.status !== 0) throw compiled.error ?? new Error('esbuild CLI failed');
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace('<script type="module" src="/src/main.tsx"></script>', '<link rel="stylesheet" href="./app.css" /><script type="module" src="./app.js"></script>');
    fs.writeFileSync(path.join(scratch, 'index.html'), html);
    await build({ configFile: false, root: scratch, base: './', resolve: { preserveSymlinks: true }, publicDir: path.join(root, 'public'), esbuild: false, build: { outDir: path.join(root, 'dist'), emptyOutDir: true, minify: false, target: 'es2022' } });
  } else {
    process.stderr.write(output);
    throw result.error ?? new Error(`Vite exited with code ${result.status}`);
  }
} finally {
  // This directory was created by this invocation under the explicit OS temp root.
  if (path.resolve(scratch).startsWith(path.resolve(os.tmpdir()) + path.sep)) fs.rmSync(scratch, { recursive: true, force: true });
}

