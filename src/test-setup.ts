import { execSync } from 'child_process';

export function setup(): void {
	if (process.env.VITEST_GLOBAL_SETUP === 'skip') return;
	execSync('bash scripts/test-env.sh setup', { stdio: 'inherit' });
}

export function teardown(): void {
	if (process.env.VITEST_GLOBAL_SETUP === 'skip') return;
	execSync('bash scripts/test-env.sh teardown', { stdio: 'inherit' });
}
