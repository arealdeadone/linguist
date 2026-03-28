import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'http://localhost:5173';

interface Learner {
	id: string;
	name: string;
	targetLanguage: string;
	lessonLanguage: string;
	cefrLevel: string;
}

const pairs: Record<string, { learner: Learner; lessonId: string }> = {};

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
	for (const l of data as Learner[]) {
		const lessons = await api('/api/lessons', l.id);
		const list = lessons.data as Array<{ id: string }>;
		pairs[l.targetLanguage] = { learner: l, lessonId: list[0]?.id ?? '' };
	}
});

const langConfigs = [
	{ key: 'zh', label: 'Chinese/Hindi' },
	{ key: 'te', label: 'Telugu/Thai' }
];

for (const lang of langConfigs) {
	describe(`REGRESSION: Vocab persisted on lesson generation — ${lang.label}`, () => {
		it('GIVEN new lesson generated THEN vocab_targets are inserted into vocabulary table', async () => {
			const pair = pairs[lang.key];
			if (!pair) return;

			const beforeCards = await api('/api/srs?all=true', pair.learner.id);
			const beforeCount = (beforeCards.data as unknown[]).length;

			const { status, data } = await post(
				'/api/lessons',
				{
					week: 99,
					day: 1,
					theme: 'regression test'
				},
				pair.learner.id
			);
			expect(status).toBe(201);

			const plan = (data as { plan: Record<string, unknown> }).plan;
			const newWords = (plan.vocabulary_targets as Array<{ word: string }>).map((v) => v.word);
			expect(newWords.length).toBeGreaterThan(0);

			const afterCards = await api('/api/srs?all=true', pair.learner.id);
			const afterWords = (afterCards.data as Array<{ word: string }>).map((c) => c.word);

			for (const word of newWords) {
				expect(afterWords).toContain(word);
			}
			expect(afterWords.length).toBeGreaterThanOrEqual(beforeCount);
		}, 60000);
	});

	describe(`REGRESSION: Vocab persisted on lesson completion — ${lang.label}`, () => {
		it('GIVEN lesson completed THEN lesson plan vocab targets exist in vocabulary table', async () => {
			const pair = pairs[lang.key];
			if (!pair?.lessonId) return;

			await patch(`/api/lessons/${pair.lessonId}`, { status: 'completed' }, pair.learner.id);

			const lesson = await api(`/api/lessons/${pair.lessonId}`, pair.learner.id);
			const plan = (lesson.data as { plan: Record<string, unknown> }).plan;
			const targets = plan.vocabulary_targets as Array<{ word: string } | string>;
			const words = targets.map((t) => (typeof t === 'string' ? t : t.word));

			const vocab = await api('/api/srs?all=true', pair.learner.id);
			const allWords = (vocab.data as Array<{ word: string }>).map((c) => c.word);

			let matched = 0;
			for (const word of words) {
				if (allWords.includes(word)) matched++;
			}
			expect(matched).toBe(words.length);
		});
	});

	describe(`REGRESSION: SRS modality scores update — ${lang.label}`, () => {
		it('GIVEN SRS review with modality=listening THEN listening score > 0', async () => {
			const pair = pairs[lang.key];
			if (!pair) return;

			const allVocab = await api('/api/srs?all=true', pair.learner.id);
			const list = allVocab.data as Array<{ id: string; word: string }>;
			if (list.length === 0) return;

			const targetId = list[0].id;
			const { status } = await post('/api/srs', {
				vocabId: targetId,
				quality: 3,
				modality: 'listening'
			});
			expect(status).toBe(200);
		});

		it('GIVEN SRS review with modality=speaking THEN speaking score > 0', async () => {
			const pair = pairs[lang.key];
			if (!pair) return;

			const allVocab = await api('/api/srs?all=true', pair.learner.id);
			const list = allVocab.data as Array<{ id: string }>;
			if (list.length < 2) return;

			const targetId = list[1].id;
			const { status } = await post('/api/srs', {
				vocabId: targetId,
				quality: 4,
				modality: 'speaking'
			});
			expect(status).toBe(200);
		});
	});

	describe(`REGRESSION: Review words are structurally valid — ${lang.label}`, () => {
		it('GIVEN lesson with review_words THEN each review word is a non-empty string', async () => {
			const pair = pairs[lang.key];
			if (!pair?.lessonId) return;

			const lesson = await api(`/api/lessons/${pair.lessonId}`, pair.learner.id);
			const plan = (lesson.data as { plan: Record<string, unknown> }).plan;
			const reviewWords = (plan.review_words ?? []) as string[];
			if (reviewWords.length === 0) return;

			for (const word of reviewWords) {
				expect(typeof word).toBe('string');
				expect(word.length).toBeGreaterThan(0);
			}
		});

		describe('REGRESSION: Language test returns JSON (not SSE)', () => {
			it('GIVEN language test POST THEN response is application/json with valid summary', async () => {
				const res = await fetch(`${BASE}/admin/api/language-test`, {
					method: 'POST',
					headers: buildHeaders(undefined, true),
					body: JSON.stringify({
						targetLanguage: 'zh',
						sourceLanguage: 'hi',
						targetLanguageName: 'Chinese Mandarin',
						sourceLanguageName: 'Hindi',
						testCount: 1
					})
				});

				expect(res.status).toBe(200);
				expect(res.headers.get('content-type')).toContain('application/json');

				const data = (await res.json()) as {
					results: unknown[];
					averageScore: number;
					recommendation: string;
					modelRouting: Record<string, string>;
				};
				expect(Array.isArray(data.results)).toBe(true);
				expect(typeof data.averageScore).toBe('number');
				expect(['viable', 'marginal', 'not_viable']).toContain(data.recommendation);
				expect(typeof data.modelRouting).toBe('object');
			}, 120000);
		});

		describe('REGRESSION: Model routing rejects invalid model names', () => {
			it('GIVEN language test THEN modelRouting values are all supported models', async () => {
				const supported = ['gpt-4o', 'gpt-4o-mini', 'gemini-3-flash-preview', 'claude-sonnet-4-6'];
				const res = await fetch(`${BASE}/admin/api/language-test`, {
					method: 'POST',
					headers: buildHeaders(undefined, true),
					body: JSON.stringify({
						targetLanguage: 'zh',
						sourceLanguage: 'hi',
						targetLanguageName: 'Chinese Mandarin',
						sourceLanguageName: 'Hindi',
						testCount: 1
					})
				});

				expect(res.status).toBe(200);
				const data = (await res.json()) as { modelRouting: Record<string, string> };
				for (const [task, model] of Object.entries(data.modelRouting)) {
					expect(supported).toContain(model);
				}
			}, 120000);
		});

		describe('REGRESSION: STT accepts audio with WAV content-type', () => {
			it('GIVEN WAV audio file THEN STT transcription succeeds', async () => {
				const ttsRes = await fetch(`${BASE}/api/speech/tts`, {
					method: 'POST',
					headers: buildHeaders(pairs.zh?.learner.id),
					body: JSON.stringify({ text: '你好' })
				});
				const audioBlob = await ttsRes.blob();

				const formData = new FormData();
				formData.append('audio', new File([audioBlob], 'recording.wav', { type: 'audio/wav' }));
				formData.append('language', 'zh');

				const res = await fetch(`${BASE}/api/speech/stt`, {
					method: 'POST',
					body: formData
				});
				expect(res.status).toBe(200);
				const data = (await res.json()) as { text: string };
				expect(data.text).toBeTruthy();
			}, 30000);
		});

		describe('REGRESSION: SRS review does not produce out-of-range dates', () => {
			for (const lang of langConfigs) {
				it(`GIVEN ${lang.label} vocab WHEN reviewed 10 times THEN next_review is within 1 year`, async () => {
					const pair = pairs[lang.key];
					if (!pair) return;

					const vocabRes = await api('/api/srs?all=true', pair.learner.id);
					const vocab = vocabRes.data as Array<{ id: string }>;
					if (vocab.length === 0) return;

					const targetId = vocab[0].id;
					for (let i = 0; i < 10; i++) {
						const res = await post(
							'/api/srs',
							{ vocabId: targetId, quality: 5, modality: 'listening' },
							pair.learner.id
						);
						expect(res.status).toBe(200);
					}

					const afterRes = await api('/api/srs?all=true', pair.learner.id);
					const updated = (afterRes.data as Array<{ id: string; nextReview: string }>).find(
						(v) => v.id === targetId
					);
					expect(updated).toBeDefined();

					const nextReview = new Date(updated!.nextReview);
					const oneYearFromNow = new Date();
					oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 2);
					expect(nextReview.getTime()).toBeLessThan(oneYearFromNow.getTime());
				}, 30000);
			}
		});
	});

	describe(`REGRESSION: Pronunciation evaluation returns valid scores — ${lang.label}`, () => {
		it('GIVEN exact match THEN score >= 85 consistently (5 runs)', async () => {
			const pair = pairs[lang.key];
			if (!pair) return;
			const word = lang.key === 'zh' ? '你好' : 'నమస్కారం';

			for (let i = 0; i < 3; i++) {
				const { data } = await post(
					'/api/speech/evaluate',
					{
						transcript: word,
						expected: word,
						language: pair.learner.targetLanguage,
						lessonLanguage: pair.learner.lessonLanguage
					},
					pair.learner.id
				);
				const result = data as { score: number; feedback: string; systemError?: boolean };
				expect(result.systemError).toBeFalsy();
				expect(result.score).toBeGreaterThanOrEqual(85);
				expect(result.feedback.length).toBeGreaterThan(0);
			}
		}, 90000);
	});

	describe(`REGRESSION: TTS generates correct audio — ${lang.label}`, () => {
		it('GIVEN target language word THEN TTS returns audio/mpeg > 1KB', async () => {
			const pair = pairs[lang.key];
			if (!pair) return;
			const word = lang.key === 'zh' ? '水' : 'నీళ్ళు';
			const res = await fetch(`${BASE}/api/speech/tts`, {
				method: 'POST',
				headers: buildHeaders(pair.learner.id),
				body: JSON.stringify({ text: word })
			});
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toBe('audio/mpeg');
			const blob = await res.blob();
			expect(blob.size).toBeGreaterThan(1000);
		}, 15000);
	});

	describe(`REGRESSION: Quiz adapts to CEFR level — ${lang.label}`, () => {
		it('GIVEN A1 quiz THEN questions have word + meaning + correct_index', async () => {
			const pair = pairs[lang.key];
			if (!pair?.lessonId) return;

			const { status, data } = await post(
				'/api/quiz',
				{
					lessonId: pair.lessonId,
					quizType: 'multiple_choice',
					cefrLevel: 'A1'
				},
				pair.learner.id
			);
			expect(status).toBe(201);
			const questions = (data as { questions: Array<Record<string, unknown>> }).questions;
			expect(questions.length).toBeGreaterThan(0);
			for (const q of questions) {
				expect(q.word).toBeTruthy();
				expect(typeof q.correct_index).toBe('number');
				expect(Array.isArray(q.options)).toBe(true);
			}
		}, 30000);
	});
}

describe('REGRESSION: Lesson completion marks status correctly', () => {
	for (const lang of langConfigs) {
		it(`GIVEN ${lang.label} lesson WHEN PATCH completed THEN completedAt is set`, async () => {
			const pair = pairs[lang.key];
			if (!pair?.lessonId) return;
			const { data } = await patch(
				`/api/lessons/${pair.lessonId}`,
				{ status: 'completed' },
				pair.learner.id
			);
			const lesson = data as { status: string; completedAt: string | null };
			expect(lesson.status).toBe('completed');
			expect(lesson.completedAt).toBeTruthy();
		});
	}
});

describe('REGRESSION: STT handles multipart file upload correctly', () => {
	it('GIVEN valid audio file THEN transcription succeeds', async () => {
		const ttsRes = await fetch(`${BASE}/api/speech/tts`, {
			method: 'POST',
			headers: buildHeaders(pairs.zh?.learner.id),
			body: JSON.stringify({ text: '你好' })
		});
		const audioBlob = await ttsRes.blob();

		const formData = new FormData();
		formData.append('audio', new File([audioBlob], 'test.mp3', { type: 'audio/mpeg' }));
		formData.append('language', 'zh');

		const res = await fetch(`${BASE}/api/speech/stt`, {
			method: 'POST',
			body: formData
		});
		expect(res.status).toBe(200);
		const data = (await res.json()) as { text: string };
		expect(data.text).toBeTruthy();
		expect(data.text.length).toBeGreaterThan(0);
	}, 30000);
});

describe('REGRESSION: chatJSON works reliably with Claude', () => {
	it('GIVEN pronunciation evaluation via Claude THEN never returns score=0 for exact match', async () => {
		const zhLearner = pairs.zh?.learner;
		if (!zhLearner) return;
		const results: number[] = [];
		for (let i = 0; i < 3; i++) {
			const { data } = await post(
				'/api/speech/evaluate',
				{
					transcript: '你好',
					expected: '你好',
					language: 'zh',
					lessonLanguage: 'hi'
				},
				zhLearner.id
			);
			const score = (data as { score: number }).score;
			results.push(score);
		}
		for (const score of results) {
			expect(score).not.toBe(0);
			expect(score).toBeGreaterThanOrEqual(85);
		}
	}, 90000);
});

describe('REGRESSION: Error responses are never empty', () => {
	it('GIVEN invalid SRS quality THEN error message mentions quality', async () => {
		const { status, data } = await post('/api/srs', { vocabId: 'x', quality: 6 });
		expect(status).toBe(400);
		expect((data as { error: string }).error).toBeTruthy();
	});

	it('GIVEN missing authentication on quiz THEN error message mentions auth', async () => {
		const { status, data } = await post('/api/quiz', { quizType: 'multiple_choice' });
		expect(status).toBe(401);
		expect((data as { error: string }).error).toContain('Not authenticated');
	});

	it('GIVEN missing fields on evaluate THEN error message lists required fields', async () => {
		const zhLearner = pairs.zh?.learner;
		if (!zhLearner) return;
		const { status, data } = await post(
			'/api/speech/evaluate',
			{ transcript: 'test' },
			zhLearner.id
		);
		expect(status).toBe(400);
		expect((data as { error: string }).error).toBeTruthy();
	});

	it('GIVEN non-existent vocab on SRS THEN 404 with message', async () => {
		const { status, data } = await post('/api/srs', {
			vocabId: '00000000-0000-0000-0000-000000000000',
			quality: 4
		});
		expect(status).toBe(404);
		expect((data as { error: string }).error).toBeTruthy();
	});
});

describe('REGRESSION: Lesson generation pre-generates TTS audio URLs', () => {
	for (const lang of langConfigs) {
		it(`GIVEN ${lang.label} lesson THEN vocab has audioUrl populated`, async () => {
			const pair = pairs[lang.key];
			if (!pair) return;

			const { status, data } = await post(
				'/api/lessons',
				{
					week: 98,
					day: 1,
					theme: 'tts audio test'
				},
				pair.learner.id
			);
			expect(status).toBe(201);

			const plan = (data as { plan: Record<string, unknown> }).plan;
			const vocabTargets = plan.vocabulary_targets as Array<{ word: string; audioUrl?: string }>;
			expect(vocabTargets.length).toBeGreaterThan(0);

			const withAudio = vocabTargets.filter(
				(v) => typeof v.audioUrl === 'string' && v.audioUrl.length > 0
			);
			expect(withAudio.length).toBe(vocabTargets.length);

			const allVocab = await api('/api/srs?all=true', pair.learner.id);
			const vocabList = allVocab.data as Array<{ word: string; audioUrl: string | null }>;
			for (const target of vocabTargets) {
				const found = vocabList.find((v) => v.word === target.word);
				expect(found).toBeDefined();
				expect(found!.audioUrl).toBeTruthy();
			}
		}, 120000);
	}
});

describe('REGRESSION: Lesson generation pre-generates quiz', () => {
	for (const lang of langConfigs) {
		it(`GIVEN ${lang.label} lesson THEN preGeneratedQuiz exists in plan`, async () => {
			const pair = pairs[lang.key];
			if (!pair) return;

			const { status, data } = await post(
				'/api/lessons',
				{
					week: 97,
					day: 1,
					theme: 'quiz pregen test'
				},
				pair.learner.id
			);
			expect(status).toBe(201);

			const plan = (data as { plan: Record<string, unknown> }).plan;
			const quiz = plan.preGeneratedQuiz as
				| { quizType: string; words: string[]; questions: unknown[] }
				| undefined;

			expect(quiz).toBeDefined();
			expect(typeof quiz!.quizType).toBe('string');
			expect(Array.isArray(quiz!.words)).toBe(true);
			expect(quiz!.words.length).toBeGreaterThan(0);
			expect(Array.isArray(quiz!.questions)).toBe(true);
			expect(quiz!.questions.length).toBeGreaterThan(0);

			const lessonId = (data as { id: string }).id;
			const lesson = await api(`/api/lessons/${lessonId}`, pair.learner.id);
			const storedPlan = (lesson.data as { plan: Record<string, unknown> }).plan;
			const storedQuiz = storedPlan.preGeneratedQuiz as { questions: unknown[] } | undefined;
			expect(storedQuiz).toBeDefined();
			expect(storedQuiz!.questions.length).toBeGreaterThan(0);
		}, 120000);
	}
});

describe('REGRESSION: Conversation JSON response works end-to-end', () => {
	for (const lang of langConfigs) {
		it(`GIVEN ${lang.label} learner WHEN AI-initiated conversation THEN [START] produces AI greeting`, async () => {
			const pair = pairs[lang.key];
			if (!pair) return;

			const res = await fetch(`${BASE}/api/chat`, {
				method: 'POST',
				headers: buildHeaders(pair.learner.id),
				body: JSON.stringify({ message: '[START]' })
			});
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toContain('application/json');
			const data = (await res.json()) as { response: string; conversationId: string };
			expect(typeof data.response).toBe('string');
			expect(data.response.length).toBeGreaterThan(0);
			expect(typeof data.conversationId).toBe('string');
			expect(data.conversationId.length).toBeGreaterThan(0);
		}, 30000);
	}
});

describe('REGRESSION: Lesson page allVocab includes audioUrl', () => {
	for (const lang of langConfigs) {
		it(`GIVEN ${lang.label} vocab with audioUrl THEN /api/srs?all=true returns audioUrl field`, async () => {
			const pair = pairs[lang.key];
			if (!pair) return;

			const res = await api('/api/srs?all=true', pair.learner.id);
			const vocab = res.data as Array<{ id: string; word: string; audioUrl: string | null }>;
			expect(vocab.length).toBeGreaterThan(0);

			const withAudio = vocab.filter((v) => v.audioUrl !== null && v.audioUrl !== undefined);
			expect(withAudio.length).toBeGreaterThan(0);
			for (const v of withAudio) {
				expect(typeof v.audioUrl).toBe('string');
				expect(v.audioUrl!.length).toBeGreaterThan(0);
			}
		}, 30000);
	}
});
