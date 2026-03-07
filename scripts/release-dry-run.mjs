import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const spec = `${pkg.name}@${pkg.version}`;

function run(command) {
  execSync(command, { stdio: 'inherit' });
}

function json(command) {
  return JSON.parse(execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
}

let publishedVersions = [];
try {
  const result = json(`npm view ${pkg.name} versions --json`);
  publishedVersions = Array.isArray(result) ? result : result ? [result] : [];
} catch {
  publishedVersions = [];
}

if (publishedVersions.includes(pkg.version)) {
  console.log(`Version ${spec} is already published. Running pack preview instead of npm publish --dry-run.`);
  run('npm pack --dry-run');
} else {
  console.log(`Version ${spec} is not published yet. Running npm publish --dry-run.`);
  run('npm publish --dry-run');
}
