import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAIService } from '$lib/server/ai-service';
import { getLanguageNames } from '$lib/server/data/languages';
import { MODEL_ROUTING } from '$lib/constants';

interface EvaluateSpeechRequest {
	transcript?: string;
	expected?: string;
	language?: string;
	lessonLanguage?: string;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const learnerId = locals.learnerId;
	if (!learnerId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const body = (await request.json()) as EvaluateSpeechRequest;
	const transcript = body.transcript?.trim();
	const expected = body.expected?.trim();
	const language = body.language;
	const lessonLanguage = body.lessonLanguage?.trim();

	if (!transcript || !expected || !language || !lessonLanguage) {
		return json(
			{ error: 'transcript, expected, language, and lessonLanguage are required' },
			{ status: 400 }
		);
	}

	const languageNames = await getLanguageNames();
	if (!languageNames[language]) {
		return json({ error: `Unsupported language: ${language}` }, { status: 400 });
	}
	if (!(language in MODEL_ROUTING.lesson_generation)) {
		return json({ error: `Unsupported language: ${language}` }, { status: 400 });
	}

	try {
		const result = await getAIService().evaluatePronunciation({
			transcript,
			expected,
			language,
			lessonLanguage,
			learnerId
		});
		return json(result);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Evaluation failed';
		console.error('Pronunciation evaluation error:', msg);
		return json({ error: msg }, { status: 500 });
	}
};
