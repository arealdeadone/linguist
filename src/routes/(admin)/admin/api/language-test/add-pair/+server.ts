import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAIService } from '$lib/server/ai-service';
import { invalidateLanguageCache, upsertLanguage } from '$lib/server/data/languages';
import { upsertPrompt } from '$lib/server/data/tutor-prompts';
import { upsertRoutingBatch } from '$lib/server/data/model-routing';
import { getDefaultRoutingForLanguage, invalidateRoutingCache } from '$lib/server/ai';
import type { TaskType } from '$lib/types';

interface AddLanguagePairRequest {
	targetLanguageCode?: unknown;
	targetLanguageName?: unknown;
	sourceLanguageCode?: unknown;
	sourceLanguageName?: unknown;
	modelRouting?: unknown;
}

function normalizeCode(value: string): string {
	return value.trim().toLowerCase();
}

function normalizeName(value: string): string {
	return value.trim();
}

function resolveRoutingForLanguage(
	targetLanguageCode: string,
	candidate: unknown
): Record<TaskType, string> {
	const defaults = getDefaultRoutingForLanguage(targetLanguageCode);
	if (!candidate || typeof candidate !== 'object') return defaults;

	const candidateRecord = candidate as Record<string, unknown>;
	const resolved = {} as Record<TaskType, string>;
	for (const [task, defaultModel] of Object.entries(defaults) as [TaskType, string][]) {
		const maybeModel = candidateRecord[task];
		resolved[task] =
			typeof maybeModel === 'string' && maybeModel.trim() ? maybeModel.trim() : defaultModel;
	}

	return resolved;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as AddLanguagePairRequest;

		if (
			typeof body.targetLanguageCode !== 'string' ||
			typeof body.targetLanguageName !== 'string' ||
			typeof body.sourceLanguageCode !== 'string' ||
			typeof body.sourceLanguageName !== 'string'
		) {
			return json({ error: 'target/source language code and name are required' }, { status: 400 });
		}

		const targetLanguageCode = normalizeCode(body.targetLanguageCode);
		const targetLanguageName = normalizeName(body.targetLanguageName);
		const sourceLanguageCode = normalizeCode(body.sourceLanguageCode);
		const sourceLanguageName = normalizeName(body.sourceLanguageName);

		if (!targetLanguageCode || !targetLanguageName || !sourceLanguageCode || !sourceLanguageName) {
			return json({ error: 'Language code and name cannot be empty' }, { status: 400 });
		}

		await Promise.all([
			upsertLanguage(targetLanguageCode, targetLanguageName),
			upsertLanguage(sourceLanguageCode, sourceLanguageName)
		]);
		invalidateLanguageCache();

		const [targetPrompt, sourcePrompt] = await Promise.all([
			getAIService().translatePromptSections({
				targetLanguageCode,
				targetLanguageName
			}),
			getAIService().translatePromptSections({
				targetLanguageCode: sourceLanguageCode,
				targetLanguageName: sourceLanguageName
			})
		]);

		await Promise.all([
			upsertPrompt(targetLanguageCode, targetPrompt),
			upsertPrompt(sourceLanguageCode, sourcePrompt)
		]);

		const routing = resolveRoutingForLanguage(targetLanguageCode, body.modelRouting);
		await upsertRoutingBatch(targetLanguageCode, routing);
		invalidateRoutingCache();

		return json({
			ok: true,
			targetLanguageCode,
			sourceLanguageCode,
			modelRouting: routing,
			message: 'Languages, tutor prompts, and model routing updated'
		});
	} catch (error) {
		console.error('Failed to add language pair:', error);
		const errorMessage = error instanceof Error ? error.message : 'Failed to add language pair';
		return json({ error: errorMessage }, { status: 500 });
	}
};
