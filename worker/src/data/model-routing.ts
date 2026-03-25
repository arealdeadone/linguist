import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { modelRouting } from '../schema';

function normalizeLanguage(language: string): string {
	return language.trim().toLowerCase();
}

function normalizeTask(task: string): string {
	return task.trim().toLowerCase();
}

export async function getModelForTask(language: string, task: string): Promise<string | null> {
	const normalizedLanguage = normalizeLanguage(language);
	const normalizedTask = normalizeTask(task);

	const rows = await db
		.select({ model: modelRouting.model })
		.from(modelRouting)
		.where(and(eq(modelRouting.language, normalizedLanguage), eq(modelRouting.task, normalizedTask)))
		.limit(1);

	return rows[0]?.model ?? null;
}

export async function getAllRoutesForLanguage(language: string): Promise<Record<string, string>> {
	const normalizedLanguage = normalizeLanguage(language);
	const rows = await db
		.select({ task: modelRouting.task, model: modelRouting.model })
		.from(modelRouting)
		.where(eq(modelRouting.language, normalizedLanguage));

	const routes: Record<string, string> = {};
	for (const row of rows) {
		routes[row.task] = row.model;
	}

	return routes;
}

export async function upsertRouting(language: string, task: string, model: string): Promise<void> {
	const normalizedLanguage = normalizeLanguage(language);
	const normalizedTask = normalizeTask(task);
	const normalizedModel = model.trim();

	await db
		.insert(modelRouting)
		.values({
			language: normalizedLanguage,
			task: normalizedTask,
			model: normalizedModel
		})
		.onConflictDoUpdate({
			target: [modelRouting.language, modelRouting.task],
			set: {
				model: normalizedModel
			}
		});
}

export async function upsertRoutingBatch(language: string, routes: Record<string, string>): Promise<void> {
	const entries = Object.entries(routes);
	for (const [task, model] of entries) {
		await upsertRouting(language, task, model);
	}
}
