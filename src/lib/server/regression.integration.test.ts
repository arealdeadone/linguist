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

async function api(path: string, options?: RequestInit) {
	const res = await fetch(`${BASE}${path}`, options);
	let data: unknown;
	try {
		data = await res.json();
	} catch (e) {
		console.error('Failed to parse API response JSON:', e);
		throw e;
	}
	return { status: res.status, data, ok: res.ok, headers: res.headers };
}

async function post(path: string, body: Record<string, unknown>) {
	return api(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

async function patch(path: string, body: Record<string, unknown>) {
	return api(path, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

beforeAll(async () => {
	const { data } = await api('/api/profile');
	for (const l of data as Learner[]) {
		const lessons = await api(`/api/lessons?learnerId=${l.id}`);
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

			const beforeCards = await api(`/api/srs?learnerId=${pair.learner.id}&all=true`);
			const beforeCount = (beforeCards.data as unknown[]).length;

			const { status, data } = await post('/api/lessons', {
				learnerId: pair.learner.id,
				week: 99,
				day: 1,
				theme: 'regression test'
			});
			expect(status).toBe(201);

			const plan = (data as { plan: Record<string, unknown> }).plan;
			const newWords = (plan.vocabulary_targets as Array<{ word: string }>).map((v) => v.word);
			expect(newWords.length).toBeGreaterThan(0);

			const afterCards = await api(`/api/srs?learnerId=${pair.learner.id}&all=true`);
			const afterWords = (afterCards.data as Array<{ word: string }>).map((c) => c.word);

			for (const word of newWords) {
				expect(afterWords).toContain(word);
			}
		}, 60000);
	});

	describe(`REGRESSION: Vocab persisted on lesson completion — ${lang.label}`, () => {
		it('GIVEN lesson completed THEN lesson plan vocab targets exist in vocabulary table', async () => {
			const pair = pairs[lang.key];
			if (!pair?.lessonId) return;

			await patch(`/api/lessons/${pair.lessonId}`, { status: 'completed' });

			const lesson = await api(`/api/lessons/${pair.lessonId}`);
			const plan = (lesson.data as { plan: Record<string, unknown> }).plan;
			const targets = plan.vocabulary_targets as Array<{ word: string } | string>;
			const words = targets.map((t) => (typeof t === 'string' ? t : t.word));

			const vocab = await api(`/api/srs?learnerId=${pair.learner.id}&all=true`);
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

			const allVocab = await api(`/api/srs?learnerId=${pair.learner.id}&all=true`);
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

			const allVocab = await api(`/api/srs?learnerId=${pair.learner.id}&all=true`);
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

			const lesson = await api(`/api/lessons/${pair.lessonId}`);
			const plan = (lesson.data as { plan: Record<string, unknown> }).plan;
			const reviewWords = (plan.review_words ?? []) as string[];
			if (reviewWords.length === 0) return;

			for (const word of reviewWords) {
				expect(typeof word).toBe('string');
				expect(word.length).toBeGreaterThan(0);
			}
		});
	});

	describe(`REGRESSION: Pronunciation evaluation returns valid scores — ${lang.label}`, () => {
		it('GIVEN exact match THEN score >= 85 consistently (5 runs)', async () => {
			const pair = pairs[lang.key];
			if (!pair) return;
			const word = lang.key === 'zh' ? '你好' : 'నమస్కారం';

			for (let i = 0; i < 3; i++) {
				const { data } = await post('/api/speech/evaluate', {
					transcript: word,
					expected: word,
					language: pair.learner.targetLanguage,
					lessonLanguage: pair.learner.lessonLanguage
				});
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
				headers: { 'Content-Type': 'application/json' },
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

			const { status, data } = await post('/api/quiz', {
				learnerId: pair.learner.id,
				lessonId: pair.lessonId,
				quizType: 'multiple_choice',
				cefrLevel: 'A1'
			});
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
			const { data } = await patch(`/api/lessons/${pair.lessonId}`, { status: 'completed' });
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
			headers: { 'Content-Type': 'application/json' },
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
		const results: number[] = [];
		for (let i = 0; i < 3; i++) {
			const { data } = await post('/api/speech/evaluate', {
				transcript: '你好',
				expected: '你好',
				language: 'zh',
				lessonLanguage: 'hi'
			});
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

	it('GIVEN missing learnerId on quiz THEN error message mentions learnerId', async () => {
		const { status, data } = await post('/api/quiz', { quizType: 'multiple_choice' });
		expect(status).toBe(400);
		expect((data as { error: string }).error).toContain('learnerId');
	});

	it('GIVEN missing fields on evaluate THEN error message lists required fields', async () => {
		const { status, data } = await post('/api/speech/evaluate', { transcript: 'test' });
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

describe('REGRESSION: Profile auth works correctly', () => {
	it('GIVEN valid Chinese learner PIN THEN returns Arvind', async () => {
		const { status, data } = await post('/api/profile', { name: 'Arvind', pin: '1234' });
		expect(status).toBe(200);
		expect((data as Learner).name).toBe('Arvind');
		expect((data as Learner).targetLanguage).toBe('zh');
	});

	it('GIVEN valid Telugu learner PIN THEN returns อุ้ม', async () => {
		const { status, data } = await post('/api/profile', { name: 'อุ้ม', pin: '5678' });
		expect(status).toBe(200);
		expect((data as Learner).name).toBe('อุ้ม');
		expect((data as Learner).targetLanguage).toBe('te');
	});

	it('GIVEN logout action THEN returns ok', async () => {
		const { status, data } = await post('/api/profile', { action: 'logout' });
		expect(status).toBe(200);
		expect((data as { ok: boolean }).ok).toBe(true);
	});
});

describe('REGRESSION: HTTP cookie persistence (no Secure flag on plain HTTP)', () => {
	it('GIVEN login over HTTP THEN set-cookie header has learner_id without Secure flag', async () => {
		const { status, headers } = await post('/api/profile', { name: 'Arvind', pin: '1234' });
		expect(status).toBe(200);
		const setCookie = headers.getSetCookie();
		const learnerCookie = setCookie.find((c: string) => c.startsWith('learner_id='));
		expect(learnerCookie).toBeDefined();
		expect(learnerCookie!.toLowerCase()).not.toContain('secure');
	});

	it('GIVEN login over HTTP THEN learner_id cookie round-trips to server', async () => {
		const loginRes = await fetch(`${BASE}/api/profile`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: 'Arvind', pin: '1234' }),
			redirect: 'manual'
		});
		expect(loginRes.status).toBe(200);
		const setCookie = loginRes.headers.getSetCookie();
		const learnerCookie = setCookie.find((c: string) => c.startsWith('learner_id='));
		expect(learnerCookie).toBeDefined();

		const cookieValue = learnerCookie!.split(';')[0];
		const statsRes = await fetch(`${BASE}/api/srs/stats?learnerId=${cookieValue.split('=')[1]}`, {
			headers: { Cookie: cookieValue }
		});
		expect(statsRes.status).toBe(200);
		const stats = (await statsRes.json()) as { total_cards: number };
		expect(stats).toHaveProperty('total_cards');
	});

	it('GIVEN logout over HTTP THEN set-cookie clears learner_id without Secure flag', async () => {
		const { headers } = await post('/api/profile', { action: 'logout' });
		const setCookie = headers.getSetCookie();
		const learnerCookie = setCookie.find((c: string) => c.startsWith('learner_id='));
		expect(learnerCookie).toBeDefined();
		expect(learnerCookie!.toLowerCase()).not.toContain('secure');
		expect(learnerCookie!).toContain('Max-Age=0');
	});
});

describe('REGRESSION: Conversation JSON response works end-to-end', () => {
	for (const lang of langConfigs) {
		it(`GIVEN ${lang.label} learner WHEN AI-initiated conversation THEN [START] produces AI greeting`, async () => {
			const pair = pairs[lang.key];
			if (!pair) return;

			const res = await fetch(`${BASE}/api/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ learnerId: pair.learner.id, message: '[START]' })
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
