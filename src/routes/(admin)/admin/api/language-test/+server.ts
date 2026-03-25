import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAIService } from '$lib/server/ai-service';

interface LanguageTestRequest {
	targetLanguage?: string;
	sourceLanguage?: string;
	targetLanguageName?: string;
	sourceLanguageName?: string;
	testCount?: number;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as LanguageTestRequest;

		if (!body.targetLanguage?.trim()) {
			return json({ error: 'targetLanguage code is required' }, { status: 400 });
		}
		if (!body.sourceLanguage?.trim()) {
			return json({ error: 'sourceLanguage code is required' }, { status: 400 });
		}

		const targetLanguage = body.targetLanguage.trim();
		const sourceLanguage = body.sourceLanguage.trim();
		const testCount = Math.floor(Math.min(Math.max(body.testCount ?? 5, 1), 10));

		const result = await getAIService().testLanguagePair({
			targetLanguage,
			sourceLanguage,
			targetLanguageName: body.targetLanguageName?.trim() || targetLanguage,
			sourceLanguageName: body.sourceLanguageName?.trim() || sourceLanguage,
			testCount
		});

		return json(result);
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Test failed';
		return json({ error: msg }, { status: 500 });
	}
};
