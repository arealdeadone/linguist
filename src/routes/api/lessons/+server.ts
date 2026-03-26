import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLessonsByLearnerId, createLesson } from '$lib/server/data/lessons';
import { upsertVocab } from '$lib/server/data/vocabulary';
import { getLearnerById } from '$lib/server/data/learners';
import { getAIService } from '$lib/server/ai-service';
import { generateBatchTTS } from '$lib/server/tts-storage';
import { selectQuizTypeByCefr } from '$lib/quiz-utils';
import type { CefrLevel } from '$lib/types';

export const GET: RequestHandler = async ({ locals }) => {
	const learnerId = locals.learnerId;
	if (!learnerId) return json({ error: 'Not authenticated' }, { status: 401 });

	const lessons = await getLessonsByLearnerId(learnerId);
	return json(lessons);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const learnerId = locals.learnerId;
		if (!learnerId) return json({ error: 'Not authenticated' }, { status: 401 });

		const body = await request.json();
		const { week, day, theme } = body;

		const learner = await getLearnerById(learnerId);
		if (!learner) return json({ error: 'Learner not found' }, { status: 404 });

		const plan = await getAIService().generateLesson({
			learnerId,
			week: week ?? 1,
			day: day ?? 1,
			theme
		});

		const ttsItems = [
			...plan.vocabulary_targets.map((vocab) => ({
				text: vocab.word,
				language: learner.targetLanguage
			})),
			...(plan.colloquial_phrase
				? [{ text: plan.colloquial_phrase, language: learner.targetLanguage }]
				: [])
		];
		const ttsUrls = await generateBatchTTS(ttsItems);

		for (const vocab of plan.vocabulary_targets) {
			const url = ttsUrls.get(vocab.word);
			if (url) {
				vocab.audioUrl = url;
			}
		}

		if (plan.colloquial_phrase) {
			const phraseUrl = ttsUrls.get(plan.colloquial_phrase);
			if (phraseUrl) {
				plan.colloquial_phrase_audio_url = phraseUrl;
			}
		}

		try {
			const quizType = selectQuizTypeByCefr(plan.cefr_level as CefrLevel);
			const quizResult = await getAIService().generateQuiz({
				learnerId,
				lessonId: plan.id,
				quizType,
				cefrLevel: plan.cefr_level as CefrLevel
			});
			plan.preGeneratedQuiz = {
				quizType,
				words: plan.vocabulary_targets.map((vocab) => vocab.word),
				questions: (quizResult as { questions?: unknown[] }).questions ?? []
			};
		} catch (error) {
			console.error('Quiz pre-generation failed:', error instanceof Error ? error.message : error);
		}

		const lesson = await createLesson({
			learnerId,
			cefrLevel: plan.cefr_level,
			week: plan.week,
			day: plan.day,
			theme: plan.theme,
			plan: plan as unknown as Record<string, unknown>
		});

		for (const vocab of plan.vocabulary_targets) {
			await upsertVocab({
				learnerId,
				word: vocab.word,
				romanization: vocab.romanization,
				meaning: vocab.meaning,
				sceneDescription: vocab.scene_description,
				cefrLevel: plan.cefr_level,
				audioUrl: vocab.audioUrl
			});
		}

		return json(lesson, { status: 201 });
	} catch (error) {
		console.error('Lesson generation failed:', error);
		const message = error instanceof Error ? error.message : 'Failed to generate lesson';
		return json({ error: message }, { status: 500 });
	}
};
