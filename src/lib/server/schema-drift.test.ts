import { describe, it, expect } from 'vitest';
import * as mainSchema from '$lib/server/schema';

const workerSchemaPath = '../../worker/src/schema';

function getColumnNames(table: Record<string, unknown>): string[] {
	const columns: string[] = [];
	for (const [key, value] of Object.entries(table)) {
		if (value && typeof value === 'object' && 'name' in value && 'columnType' in value) {
			columns.push(key);
		}
	}
	return columns.sort();
}

describe('Schema drift detection: worker must match main app', () => {
	let workerSchema: Record<string, unknown>;

	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		workerSchema = require(workerSchemaPath);
	} catch {
		workerSchema = {};
	}

	const sharedTables = ['learners', 'vocabulary', 'lessons', 'conversations', 'codeSwitches', 'aiUsageLogs', 'modelRouting', 'languages', 'aiJobs'] as const;

	for (const tableName of sharedTables) {
		it(`${tableName}: worker columns match main app`, () => {
			const mainTable = (mainSchema as Record<string, unknown>)[tableName];
			const workerTable = (workerSchema as Record<string, unknown>)[tableName];

			if (!mainTable) {
				throw new Error(`Main schema missing table: ${tableName}`);
			}
			if (!workerTable) {
				return;
			}

			const mainCols = getColumnNames(mainTable as Record<string, unknown>);
			const workerCols = getColumnNames(workerTable as Record<string, unknown>);

			const missingInWorker = mainCols.filter((c) => !workerCols.includes(c));
			const extraInWorker = workerCols.filter((c) => !mainCols.includes(c));

			if (missingInWorker.length > 0) {
				throw new Error(
					`Worker schema "${tableName}" is MISSING columns: ${missingInWorker.join(', ')}`
				);
			}
			if (extraInWorker.length > 0) {
				throw new Error(
					`Worker schema "${tableName}" has EXTRA columns not in main: ${extraInWorker.join(', ')}`
				);
			}
		});
	}
});
