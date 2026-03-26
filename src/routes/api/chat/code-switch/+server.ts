import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAIService } from '$lib/server/ai-service';
import { upsertCodeSwitch } from '$lib/server/data/code-switches';
import { getLanguageNames } from '$lib/server/data/languages';

interface CodeSwitchRequest {
	message?: string;
	targetLanguage?: string;
	lessonLanguage?: string;
	conversationId?: string;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const learnerId = locals.learnerId;
	if (!learnerId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const body = (await request.json()) as CodeSwitchRequest;

	const message = body.message?.trim();
	const targetLanguage = body.targetLanguage?.trim();
	const lessonLanguage = body.lessonLanguage?.trim();
	const conversationId = body.conversationId?.trim();

	if (!message || !targetLanguage || !lessonLanguage) {
		return json(
			{
				error: 'message, targetLanguage, and lessonLanguage are required'
			},
			{ status: 400 }
		);
	}

	const languageNames = await getLanguageNames();
	const targetLanguageExists = Boolean(languageNames[targetLanguage]);
	const lessonLanguageExists = Boolean(languageNames[lessonLanguage]);

	if (!targetLanguageExists || !lessonLanguageExists) {
		return json(
			{ error: 'targetLanguage and lessonLanguage must be configured languages' },
			{ status: 400 }
		);
	}

	try {
		const switches = await getAIService().detectCodeSwitches({
			message,
			targetLanguage,
			lessonLanguage,
			learnerId
		});

		await Promise.all(
			switches.map((item) =>
				upsertCodeSwitch({
					learnerId,
					conversationId,
					gapWord: item.gapWord,
					targetEquiv: item.targetEquiv
				})
			)
		);

		return json({ switches });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Code-switch detection failed';
		return json({ error: msg }, { status: 500 });
	}
};
