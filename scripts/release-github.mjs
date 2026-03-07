import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const version = pkg.version;
const tag = `v${version}`;
const repo = resolveGithubRepository(pkg.repository);

ensureCommand('git');
ensureCommand('gh');
ensureCleanWorktree();
ensureGitHubAuth();

const headSha = output('git', ['rev-parse', 'HEAD']);

console.log(`Preparing GitHub release ${tag} for ${repo}`);

const localTagSha = optionalOutput('git', ['rev-list', '-n', '1', tag]);
if (localTagSha && localTagSha !== headSha) {
  throw new Error(`Local tag ${tag} already exists but does not point at HEAD (${headSha}).`);
}

const remoteTagSha = getRemoteTagSha(tag);
if (remoteTagSha && remoteTagSha !== headSha) {
  throw new Error(`Remote tag ${tag} already exists on origin but does not point at HEAD (${headSha}).`);
}

if (!localTagSha) {
  console.log(`Creating local tag ${tag}`);
  run('git', ['tag', '-a', tag, '-m', tag]);
} else {
  console.log(`Local tag ${tag} already exists at HEAD`);
}

if (!remoteTagSha) {
  console.log(`Pushing tag ${tag} to origin`);
  run('git', ['push', 'origin', tag]);
} else {
  console.log(`Remote tag ${tag} already exists on origin`);
}

const releaseUrl = getReleaseUrl(tag, repo);
if (releaseUrl) {
  console.log(`GitHub release ${tag} already exists: ${releaseUrl}`);
  process.exit(0);
}

const createArgs = ['release', 'create', tag, '--repo', repo, '--verify-tag', '--generate-notes'];
if (version.includes('-')) {
  createArgs.push('--prerelease');
}

console.log(`Creating GitHub release ${tag}`);
run('gh', createArgs);

function ensureCommand(command) {
  const result = spawnSync('which', [command], { stdio: 'ignore' });
  if (result.status !== 0) {
    throw new Error(`Required command not found: ${command}`);
  }
}

function ensureCleanWorktree() {
  const status = output('git', ['status', '--short']);
  if (status) {
    throw new Error('Working tree is not clean. Commit or stash changes before creating a release.');
  }
}

function ensureGitHubAuth() {
  try {
    execFileSync('gh', ['auth', 'status'], { stdio: 'ignore' });
  } catch {
    throw new Error('GitHub CLI is not authenticated. Run `gh auth login` first.');
  }
}

function resolveGithubRepository(repository) {
  const envRepo = process.env.GITHUB_REPOSITORY?.trim();
  if (envRepo) {
    return envRepo;
  }

  const repositoryUrl = typeof repository === 'string' ? repository : repository?.url;
  if (!repositoryUrl) {
    throw new Error('Could not determine GitHub repository from package.json.');
  }

  const match = repositoryUrl
    .replace(/^git\+/, '')
    .match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/u);

  if (!match) {
    throw new Error(`Unsupported repository URL: ${repositoryUrl}`);
  }

  return match[1];
}

function getRemoteTagSha(tagName) {
  const result = output('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tagName}`]);
  return result ? result.split(/\s+/u)[0] : null;
}

function getReleaseUrl(tagName, repository) {
  return optionalOutput('gh', ['release', 'view', tagName, '--repo', repository, '--json', 'url', '--jq', '.url']);
}

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' });
}

function output(command, args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  }).trim();
}

function optionalOutput(command, args) {
  try {
    return execFileSync(command, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}
