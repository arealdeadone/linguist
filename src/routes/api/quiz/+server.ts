import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAIService } from '$lib/server/ai-service';
import type { CefrLevel } from '$lib/types/lesson';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { learnerId, lessonId, quizType, cefrLevel } = body as {
			learnerId?: string;
			lessonId?: string;
			quizType?: 'multiple_choice' | 'fill_in_blank' | 'matching';
			cefrLevel?: CefrLevel;
		};

		if (!learnerId || !quizType) {
			return json({ error: 'learnerId and quizType required' }, { status: 400 });
		}

		const result = await getAIService().generateQuiz({
			learnerId,
			lessonId,
			quizType,
			cefrLevel
		});

		return json(result, { status: 201 });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Quiz generation failed';
		if (msg === 'Learner not found') return json({ error: msg }, { status: 404 });
		if (msg === 'No vocabulary available for quiz' || msg === 'Learner CEFR level is invalid') {
			return json({ error: msg }, { status: 400 });
		}
		return json({ error: msg }, { status: 500 });
	}
};
