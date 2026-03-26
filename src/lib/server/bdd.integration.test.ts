import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'http://localhost:5173';

interface Learner {
	id: string;
	name: string;
	targetLanguage: string;
	lessonLanguage: string;
	cefrLevel: string;
}

interface LangPair {
	learner: Learner;
	lessonId: string;
	targetScript: RegExp;
	lessonScript: RegExp;
	sampleWord: string;
	sampleTranscript: string;
}

const pairs: Record<string, LangPair> = {};

function buildHeaders(learnerId?: string, isAdmin = false, optionsHeaders?: HeadersInit): Headers {
	const headers = new Headers({ 'Content-Type': 'application/json' });
	if (learnerId) headers.set('X-Test-Learner-Id', learnerId);
	if (isAdmin) headers.set('X-Test-Admin', 'true');
	if (optionsHeaders) {
		const extra = new Headers(optionsHeaders);
		extra.forEach((value, key) => headers.set(key, value));
	}
	return headers;
}

async function api(path: string, learnerId?: string, options?: RequestInit, isAdmin = false) {
	const res = await fetch(`${BASE}${path}`, {
		...options,
		headers: buildHeaders(learnerId, isAdmin, options?.headers)
	});
	let data: unknown;
	try {
		data = await res.json();
	} catch (e) {
		console.error('Failed to parse API response JSON:', e);
		throw e;
	}
	return { status: res.status, data, ok: res.ok, headers: res.headers };
}

async function post(path: string, body: Record<string, unknown>, learnerId?: string) {
	return api(
		path,
		learnerId,
		{
			method: 'POST',
			body: JSON.stringify(body)
		},
		false
	);
}

async function patch(path: string, body: Record<string, unknown>, learnerId?: string) {
	return api(
		path,
		learnerId,
		{
			method: 'PATCH',
			body: JSON.stringify(body)
		},
		false
	);
}

beforeAll(async () => {
	const { status, data } = await api('/admin/api/users', undefined, undefined, true);
	expect(status).toBe(200);
	const learners = data as Learner[];

	for (const l of learners) {
		const lessons = await api('/api/lessons', l.id);
		const lessonList = lessons.data as Array<{ id: string }>;
		const lessonId = lessonList.length > 0 ? lessonList[0].id : '';

		if (l.targetLanguage === 'zh') {
			pairs.zh = {
				learner: l,
				lessonId,
				targetScript: /[\u4e00-\u9fff]/,
				lessonScript: /[\u0900-\u097f]/,
				sampleWord: '你好',
				sampleTranscript: '你好'
			};
		} else if (l.targetLanguage === 'te') {
			pairs.te = {
				learner: l,
				lessonId,
				targetScript: /[\u0c00-\u0c7f]/,
				lessonScript: /[\u0e00-\u0e7f]/,
				sampleWord: 'నమస్కారం',
				sampleTranscript: 'నమస్కారం'
			};
		}
	}
});

const langConfigs = [
	{ key: 'zh', label: 'Chinese/Hindi', target: 'Chinese Mandarin', lesson: 'Hindi' },
	{ key: 'te', label: 'Telugu/Thai', target: 'Telugu', lesson: 'Thai' }
];

for (const lang of langConfigs) {
	describe(`FEATURE: Lesson Language Enforcement — ${lang.label} (01-project-vision)`, () => {
		it(`GIVEN ${lang.target} learner WHEN lesson exists THEN vocabulary meanings are in ${lang.lesson}`, async () => {
			const pair = pairs[lang.key];
			if (!pair?.lessonId) return;
			const { data } = await api(`/api/lessons/${pair.lessonId}`, pair.learner.id);
			const plan = (data as { plan: Record<string, unknown> }).plan;
			const targets = plan.vocabulary_targets as Array<{ meaning?: string }>;

			for (const vocab of targets) {
				if (vocab.meaning) {
					const hasLessonScript = pair.lessonScript.test(vocab.meaning);
					const isOnlyLatin = /^[a-zA-Z\s]+$/.test(vocab.meaning);
					expect(isOnlyLatin).toBe(false);
					expect(hasLessonScript).toBe(true);
				}
			}
		});

		it(`GIVEN ${lang.target} learner WHEN lesson exists THEN cultural notes contain ${lang.lesson} script`, async () => {
			const pair = pairs[lang.key];
			if (!pair?.lessonId) return;
			const { data } = await api(`/api/lessons/${pair.lessonId}`, pair.learner.id);
			const plan = (data as { plan: { cultural_note?: string } }).plan;
			if (plan.cultural_note) {
				expect(pair.lessonScript.test(plan.cultural_note)).toBe(true);
			}
		});

		it(`GIVEN ${lang.target} learner WHEN pronunciation is evaluated THEN feedback is in ${lang.lesson}`, async () => {
			const pair = pairs[lang.key];
			if (!pair) return;
			const { data } = await post('/api/speech/evaluate', {
				transcript: pair.sampleTranscript,
				expected: pair.sampleWord,
				language: pair.learner.targetLanguage,
				lessonLanguage: pair.learner.lessonLanguage
			}, pair.learner.id);
			const feedback = (data as { feedback: string }).feedback;
			expect(pair.lessonScript.test(feedback)).toBe(true);
		}, 30000);
	});

	describe(`FEATURE: TPR Vocabulary — ${lang.label} (03-pedagogy)`, () => {
		it(`GIVEN ${lang.target} lesson WHEN vocab loaded THEN each word has scene_description + romanization + meaning`, async () => {
			const pair = pairs[lang.key];
			if (!pair?.lessonId) return;
			const { data } = await api(`/api/lessons/${pair.lessonId}`, pair.learner.id);
			const plan = (data as { plan: Record<string, unknown> }).plan;
			const targets = plan.vocabulary_targets as Array<{
				word: string;
				scene_description?: string;
				meaning?: string;
				romanization?: string;
			}>;

			expect(targets.length).toBeGreaterThan(0);
			for (const vocab of targets) {
				expect(vocab.word).toBeTruthy();
				expect(vocab.scene_description).toBeTruthy();
				expect(vocab.scene_description!.length).toBeGreaterThan(20);
				expect(vocab.romanization).toBeTruthy();
				expect(vocab.meaning).toBeTruthy();
			}
		});
	});

	describe(`FEATURE: Multi-Modal SRS — ${lang.label} (03-pedagogy)`, () => {
		it(`GIVEN ${lang.target} vocab card WHEN reviewed as listening THEN listening modality updates`, async () => {
			const pair = pairs[lang.key];
			if (!pair) return;
			const cards = await api('/api/srs?all=true', pair.learner.id);
			const allCards = cards.data as Array<{ id: string }>;
			if (allCards.length === 0) return;

			await post('/api/srs', { vocabId: allCards[0].id, quality: 4, modality: 'listening' });

			const after = await api('/api/srs?all=true', pair.learner.id);
			const updated = (
				after.data as Array<{ id: string; modalityScores: Record<string, number> }>
			).find((c) => c.id === allCards[0].id);
			expect(updated).toBeDefined();
			expect(updated!.modalityScores.listening).toBeGreaterThan(0);
		});

		it(`GIVEN ${lang.target} vocab card WHEN reviewed as speaking THEN speaking modality updates`, async () => {
			const pair = pairs[lang.key];
			if (!pair) return;
			const cards = await api('/api/srs?all=true', pair.learner.id);
			const allCards = cards.data as Array<{ id: string }>;
			if (allCards.length < 2) return;

			await post('/api/srs', { vocabId: allCards[1].id, quality: 4, modality: 'speaking' });

			const after = await api('/api/srs?all=true', pair.learner.id);
			const updated = (
				after.data as Array<{ id: string; modalityScores: Record<string, number> }>
			).find((c) => c.id === allCards[1].id);
			expect(updated).toBeDefined();
			expect(updated!.modalityScores.speaking).toBeGreaterThan(0);
		});
	});

	describe(`FEATURE: Lesson Sequencing — ${lang.label} (03-pedagogy)`, () => {
		it(`GIVEN ${lang.target} A1 lesson THEN vocabulary_targets ≤ 7 words`, async () => {
			const pair = pairs[lang.key];
			if (!pair?.lessonId) return;
			const { data } = await api(`/api/lessons/${pair.lessonId}`, pair.learner.id);
			const targets = (data as { plan: Record<string, unknown> }).plan
				.vocabulary_targets as unknown[];
			expect(targets.length).toBeLessThanOrEqual(7);
			expect(targets.length).toBeGreaterThanOrEqual(1);
		});

		it(`GIVEN ${lang.target} A1 lesson THEN it has colloquial phrase + cultural note`, async () => {
			const pair = pairs[lang.key];
			if (!pair?.lessonId) return;
			const { data } = await api(`/api/lessons/${pair.lessonId}`, pair.learner.id);
			const plan = (data as { plan: { colloquial_phrase?: string; cultural_note?: string } }).plan;
			expect(plan.colloquial_phrase).toBeTruthy();
			expect(plan.cultural_note).toBeTruthy();
		});

		it(`GIVEN ${lang.target} A1 lesson THEN activities include listening + vocab/speaking practice`, async () => {
			const pair = pairs[lang.key];
			if (!pair?.lessonId) return;
			const { data } = await api(`/api/lessons/${pair.lessonId}`, pair.learner.id);
			const types = (data as { plan: { activities: Array<{ type: string }> } }).plan.activities.map(
				(a) => a.type
			);
			expect(types).toContain('listening');
			const hasVocabActivity = types.includes('vocabulary_tpr') || types.includes('speaking');
			expect(hasVocabActivity).toBe(true);
		});
	});

	describe(`FEATURE: Pronunciation Scoring — ${lang.label} (04-speech-pipeline)`, () => {
		it(`GIVEN exact ${lang.target} match THEN score ≥ 85`, async () => {
			const pair = pairs[lang.key];
			if (!pair) return;
			const { data } = await post('/api/speech/evaluate', {
				transcript: pair.sampleTranscript,
				expected: pair.sampleWord,
				language: pair.learner.targetLanguage,
				lessonLanguage: pair.learner.lessonLanguage
			}, pair.learner.id);
			expect((data as { score: number }).score).toBeGreaterThanOrEqual(85);
		}, 30000);

		it(`GIVEN wrong ${lang.target} transcript THEN score < 50`, async () => {
			const pair = pairs[lang.key];
			if (!pair) return;
			const wrongText =
				pair.learner.targetLanguage === 'zh' ? '我不知道这是什么' : 'ఇది ఏమిటో నాకు తెలియదు';
			const { data } = await post('/api/speech/evaluate', {
				transcript: wrongText,
				expected: pair.sampleWord,
				language: pair.learner.targetLanguage,
				lessonLanguage: pair.learner.lessonLanguage
			}, pair.learner.id);
			expect((data as { score: number }).score).toBeLessThan(50);
		}, 30000);
	});

	describe(`FEATURE: TTS Audio — ${lang.label} (04-speech-pipeline)`, () => {
		it(`GIVEN ${lang.target} word WHEN TTS requested THEN returns audio/mpeg`, async () => {
			const pair = pairs[lang.key];
			if (!pair) return;
			const res = await fetch(`${BASE}/api/speech/tts`, {
				method: 'POST',
				headers: buildHeaders(pair.learner.id),
				body: JSON.stringify({ text: pair.sampleWord })
			});
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toBe('audio/mpeg');
			const blob = await res.blob();
			expect(blob.size).toBeGreaterThan(1000);
		}, 15000);

		it(`GIVEN ${lang.target} word WHEN TTS requested twice THEN second is cached`, async () => {
			const pair = pairs[lang.key];
			if (!pair) return;
			const word = pair.learner.targetLanguage === 'zh' ? '谢谢' : 'ధన్యవాదాలు';
			await fetch(`${BASE}/api/speech/tts`, {
				method: 'POST',
				headers: buildHeaders(pair.learner.id),
				body: JSON.stringify({ text: word })
			});
			const res2 = await fetch(`${BASE}/api/speech/tts`, {
				method: 'POST',
				headers: buildHeaders(pair.learner.id),
				body: JSON.stringify({ text: word })
			});
			expect(res2.headers.get('x-cache')).toBe('HIT');
		}, 15000);
	});

	describe(`FEATURE: Conversation — ${lang.label} (03-pedagogy)`, () => {
		it(`GIVEN ${lang.target} learner WHEN message sent THEN AI responds with JSON payload`, async () => {
			const pair = pairs[lang.key];
			if (!pair) return;
			const res = await fetch(`${BASE}/api/chat`, {
				method: 'POST',
				headers: buildHeaders(pair.learner.id),
				body: JSON.stringify({ message: pair.sampleWord })
			});
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('application/json');
			const data = (await res.json()) as { response: string; conversationId: string };
			expect(typeof data.response).toBe('string');
			expect(data.response.length).toBeGreaterThan(0);
			expect(typeof data.conversationId).toBe('string');
			expect(data.conversationId.length).toBeGreaterThan(0);
		}, 30000);
	});

	describe(`FEATURE: Quiz Generation — ${lang.label} (03-pedagogy)`, () => {
		it(`GIVEN ${lang.target} A1 learner WHEN quiz generated THEN questions have correct schema`, async () => {
			const pair = pairs[lang.key];
			if (!pair?.lessonId) return;
			const { status, data } = await post('/api/quiz', {
				lessonId: pair.lessonId,
				quizType: 'multiple_choice',
				cefrLevel: 'A1'
			}, pair.learner.id);
			expect(status).toBe(201);
			const questions = (data as { questions: Array<Record<string, unknown>> }).questions;
			expect(questions.length).toBeGreaterThan(0);
			for (const q of questions) {
				expect(q).toHaveProperty('word');
				expect(q).toHaveProperty('correct_index');
				expect(q).toHaveProperty('options');
			}
		}, 30000);
	});

	describe(`FEATURE: CEFR Progression — ${lang.label} (03-pedagogy)`, () => {
		it(`GIVEN ${lang.target} A1 learner THEN progression check returns valid data`, async () => {
			const pair = pairs[lang.key];
			if (!pair) return;
			const { status, data } = await api('/api/progression', pair.learner.id);
			expect(status).toBe(200);
			const result = data as {
				ready: boolean;
				currentLevel: string;
				nextLevel: string | null;
				progressPercent: number;
				vocabRequired: number;
			};
			expect(result.currentLevel).toBe('A1');
			expect(result.nextLevel).toBe('A2');
			expect(result.progressPercent).toBeGreaterThanOrEqual(0);
			expect(result.vocabRequired).toBeGreaterThan(0);
		});
	});
}

describe('FEATURE: Learner Profiles (01-project-vision)', () => {
	it('WHEN listing profiles THEN Chinese/Hindi and Telugu/Thai learners both exist', async () => {
		const { status: adminStatus, data: adminData } = await api('/admin/api/users', undefined, undefined, true);
		expect(adminStatus).toBe(200);
		const learners = adminData as Learner[];
		const zh = learners.find((l) => l.targetLanguage === 'zh');
		const te = learners.find((l) => l.targetLanguage === 'te');
		expect(zh).toBeTruthy();
		expect(te).toBeTruthy();
		expect(zh!.lessonLanguage).toBe('hi');
		expect(te!.lessonLanguage).toBe('th');
	});

	it('WHEN fetching Chinese learner profile THEN returns zh learner', async () => {
		const zhLearner = pairs.zh?.learner;
		if (!zhLearner) return;
		const { status, data } = await api('/api/profile', zhLearner.id);
		expect(status).toBe(200);
		expect((data as Learner).targetLanguage).toBe('zh');
	});

	it('WHEN fetching Telugu learner profile THEN returns te learner', async () => {
		const teLearner = pairs.te?.learner;
		if (!teLearner) return;
		const { status, data } = await api('/api/profile', teLearner.id);
		expect(status).toBe(200);
		expect((data as Learner).targetLanguage).toBe('te');
	});

	it('WHEN fetching profile without authentication THEN returns 401', async () => {
		const { status } = await api('/api/profile');
		expect(status).toBe(401);
	});
});

describe('FEATURE: Lesson Lifecycle (01-project-vision)', () => {
	for (const lang of langConfigs) {
		it(`GIVEN ${lang.target} lesson WHEN PATCH completed THEN status + completedAt updated`, async () => {
			const pair = pairs[lang.key];
			if (!pair?.lessonId) return;
			const { data } = await patch(`/api/lessons/${pair.lessonId}`, { status: 'completed' }, pair.learner.id);
			const lesson = data as { status: string; completedAt: string | null };
			expect(lesson.status).toBe('completed');
			expect(lesson.completedAt).toBeTruthy();
		});
	}
});

describe('FEATURE: Error Handling — System vs User Errors', () => {
	it('WHEN SRS quality=6 THEN 400', async () => {
		const { status, data } = await post('/api/srs', { vocabId: 'x', quality: 6 });
		expect(status).toBe(400);
		expect((data as { error: string }).error).toContain('quality');
	});

	it('WHEN evaluate without language THEN 400', async () => {
		const zhLearner = pairs.zh?.learner;
		if (!zhLearner) return;
		const { status } = await post('/api/speech/evaluate', { transcript: 'x', expected: 'x' }, zhLearner.id);
		expect(status).toBe(400);
	});

	it('WHEN quiz without authentication THEN 401', async () => {
		const { status, data } = await post('/api/quiz', { quizType: 'multiple_choice' });
		expect(status).toBe(401);
		expect((data as { error: string }).error).toContain('Not authenticated');
	});

	it('WHEN chat without message THEN 400', async () => {
		const zhLearner = pairs.zh?.learner;
		if (!zhLearner) return;
		const res = await fetch(`${BASE}/api/chat`, {
			method: 'POST',
			headers: buildHeaders(zhLearner.id),
			body: JSON.stringify({})
		});
		expect(res.status).toBe(400);
	});

	it('WHEN lesson fetched with invalid ID THEN 404', async () => {
		const zhLearner = pairs.zh?.learner;
		if (!zhLearner) return;
		const { status } = await api('/api/lessons/00000000-0000-0000-0000-000000000000', zhLearner.id);
		expect(status).toBe(404);
	});

	it('WHEN SRS targets non-existent vocab THEN 404', async () => {
		const { status } = await post('/api/srs', {
			vocabId: '00000000-0000-0000-0000-000000000000',
			quality: 4
		});
		expect(status).toBe(404);
	});

	it('WHEN evaluate with unsupported language THEN 400', async () => {
		const zhLearner = pairs.zh?.learner;
		if (!zhLearner) return;
		const { status } = await post('/api/speech/evaluate', {
			transcript: 'hello',
			expected: 'hello',
			language: 'en',
			lessonLanguage: 'hi'
		}, zhLearner.id);
		expect(status).toBe(400);
	});
});
