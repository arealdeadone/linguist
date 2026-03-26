import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Schema single source of truth', () => {
	const appSchema = readFileSync(resolve('src/lib/server/schema.ts'), 'utf-8');
	const workerSchema = readFileSync(resolve('worker/src/schema.ts'), 'utf-8');

	it('main app re-exports from @linguist/ai-core/schema', () => {
		expect(appSchema).toContain("from '@linguist/ai-core/schema'");
		expect(appSchema).not.toContain('pgTable');
	});

	it('worker re-exports from @linguist/ai-core/schema', () => {
		expect(workerSchema).toContain("from '@linguist/ai-core/schema'");
		expect(workerSchema).not.toContain('pgTable');
	});

	it('both export identical symbols', () => {
		const extractExports = (src: string) =>
			src
				.match(/export\s*\{([^}]+)\}/s)?.[1]
				?.split(',')
				.map((s) => s.trim())
				.filter(Boolean)
				.sort() ?? [];

		const appExports = extractExports(appSchema);
		const workerExports = extractExports(workerSchema);
		expect(appExports).toEqual(workerExports);
		expect(appExports.length).toBeGreaterThan(0);
	});
});
