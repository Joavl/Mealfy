import { execFileSync } from 'node:child_process';

try {
  const isWorktree = execFileSync('git', ['rev-parse', '--is-inside-work-tree'], { encoding: 'utf8' }).trim();
  if (isWorktree !== 'true') throw new Error('not a Git worktree');
} catch {
  console.error('Cannot configure Git hooks: run this command inside a Git worktree.');
  process.exit(1);
}

try {
  execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks'], { stdio: 'inherit' });
} catch {
  console.error('Cannot configure Git hooks: Git could not update the local configuration.');
  process.exit(1);
}
