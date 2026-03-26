import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'http://localhost:5173';
let zhLearnerId = '';
let teLearnerId = '';
let lessonId = '';

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
	} catch {
		data = null;
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

	const learners = data as Array<{ id: string; targetLanguage: string }>;
	const zh = learners.find((l) => l.targetLanguage === 'zh');
	const te = learners.find((l) => l.targetLanguage === 'te');

	expect(zh?.id).toBeTruthy();
	expect(te?.id).toBeTruthy();

	zhLearnerId = zh!.id;
	teLearnerId = te!.id;

	const lessons = await api('/api/lessons', zhLearnerId);
	if (lessons.status === 200) {
		const list = lessons.data as Array<{ id: string }>;
		lessonId = list[0]?.id ?? '';
	}
});

describe('API Integration Tests', () => {
	describe('Profile API', () => {
		it('GET /api/profile returns current learner', async () => {
			const { status, data } = await api('/api/profile', zhLearnerId);
			expect(status).toBe(200);
			expect((data as { id: string }).id).toBe(zhLearnerId);
		});

		it('GET /api/profile/[id] returns single learner', async () => {
			const { status, data } = await api(`/api/profile/${zhLearnerId}`, undefined, undefined, true);
			expect(status).toBe(200);
			expect((data as { id: string }).id).toBe(zhLearnerId);
			expect((data as { targetLanguage: string }).targetLanguage).toMatch(/^(zh|te)$/);
			expect((data as { lessonLanguage: string }).lessonLanguage).toMatch(/^(hi|th|en)$/);
		});

		it('GET /api/profile/[id] returns 404 for invalid id', async () => {
			const { status } = await api(
				'/api/profile/00000000-0000-0000-0000-000000000000',
				undefined,
				undefined,
				true
			);
			expect(status).toBe(404);
		});
	});

	describe('Lessons API', () => {
		it('GET /api/lessons requires authentication', async () => {
			const { status } = await api('/api/lessons');
			expect(status).toBe(401);
		});

		it('GET /api/lessons returns lessons for learner', async () => {
			const { status, data } = await api('/api/lessons', zhLearnerId);
			expect(status).toBe(200);
			expect(Array.isArray(data)).toBe(true);
			if ((data as Array<{ id: string }>).length > 0) {
				lessonId = (data as Array<{ id: string }>)[0].id;
				expect((data as Array<{ plan: unknown }>)[0]).toHaveProperty('plan');
				expect((data as Array<{ status: unknown }>)[0]).toHaveProperty('status');
			}
		});

		it('GET /api/lessons/[id] returns single lesson', async () => {
			if (!lessonId) return;
			const { status, data } = await api(`/api/lessons/${lessonId}`, zhLearnerId);
			expect(status).toBe(200);
			expect((data as { id: string }).id).toBe(lessonId);
			expect((data as { plan: unknown }).plan).toBeDefined();
		});

		it('GET /api/lessons/[id] returns 404 for invalid id', async () => {
			const { status } = await api('/api/lessons/00000000-0000-0000-0000-000000000000', zhLearnerId);
			expect(status).toBe(404);
		});
	});

	describe('SRS API', () => {
		it('GET /api/srs requires authentication', async () => {
			const { status } = await api('/api/srs');
			expect(status).toBe(401);
		});

		it('GET /api/srs returns due vocabulary cards', async () => {
			const { status, data } = await api('/api/srs', zhLearnerId);
			expect(status).toBe(200);
			expect(Array.isArray(data)).toBe(true);
			if ((data as Array<Record<string, unknown>>).length > 0) {
				expect((data as Array<Record<string, unknown>>)[0]).toHaveProperty('word');
				expect((data as Array<Record<string, unknown>>)[0]).toHaveProperty('romanization');
				expect((data as Array<Record<string, unknown>>)[0]).toHaveProperty('meaning');
				expect((data as Array<Record<string, unknown>>)[0]).toHaveProperty('sm2Ef');
				expect((data as Array<Record<string, unknown>>)[0]).toHaveProperty('nextReview');
			}
		});

		it('GET /api/srs/stats returns card counts', async () => {
			const { status, data } = await api('/api/srs/stats', zhLearnerId);
			expect(status).toBe(200);
			expect(data).toHaveProperty('total_cards');
			expect(data).toHaveProperty('due_today');
			expect(typeof (data as { total_cards: number }).total_cards).toBe('number');
		});

		it('POST /api/srs requires vocabId and quality', async () => {
			const { status } = await post('/api/srs', {}, zhLearnerId);
			expect(status).toBe(400);
		});

		it('POST /api/srs rejects quality outside 0-5', async () => {
			const { status } = await post('/api/srs', { vocabId: 'fake', quality: 6 }, zhLearnerId);
			expect(status).toBe(400);
		});

		it('POST /api/srs updates vocabulary SM-2 state', async () => {
			const cards = await api('/api/srs?all=true', zhLearnerId);
			if ((cards.data as Array<{ id: string }>).length === 0) return;

			const vocabId = (cards.data as Array<{ id: string }>)[0].id;
			const { status, data } = await post('/api/srs', { vocabId, quality: 4 }, zhLearnerId);
			expect(status).toBe(200);
			expect((data as { sm2Repetition: number }).sm2Repetition).toBeGreaterThanOrEqual(1);
			expect((data as { sm2Interval: number }).sm2Interval).toBeGreaterThanOrEqual(1);
		});
	});

	describe('Quiz API', () => {
		it('POST /api/quiz requires authentication', async () => {
			const { status } = await post('/api/quiz', {});
			expect(status).toBe(401);
		});

		it('POST /api/quiz requires quizType', async () => {
			const { status } = await post('/api/quiz', {}, zhLearnerId);
			expect(status).toBe(400);
		});

		it('POST /api/quiz generates a multiple choice quiz', async () => {
			const { status, data } = await post(
				'/api/quiz',
				{
					lessonId,
					quizType: 'multiple_choice'
				},
				zhLearnerId
			);
			expect(status).toBe(201);
			expect(data).toHaveProperty('questions');
			expect(Array.isArray((data as { questions: unknown[] }).questions)).toBe(true);
			expect((data as { questions: unknown[] }).questions.length).toBeGreaterThan(0);

			const q = (data as { questions: Array<Record<string, unknown>> }).questions[0];
			expect(q).toHaveProperty('word');
			expect(q).toHaveProperty('correct_index');
			expect(typeof q.correct_index).toBe('number');
		}, 30000);

		it('POST /api/quiz/submit requires all fields', async () => {
			const { status } = await post('/api/quiz/submit', {}, zhLearnerId);
			expect(status).toBe(400);
		});
	});

	describe('Speech API', () => {
		it('POST /api/speech/tts requires text', async () => {
			const { status } = await post('/api/speech/tts', {}, zhLearnerId);
			expect(status).toBe(400);
		});

		it('POST /api/speech/tts generates audio', async () => {
			const res = await fetch(`${BASE}/api/speech/tts`, {
				method: 'POST',
				headers: buildHeaders(zhLearnerId),
				body: JSON.stringify({ text: '你好' })
			});
			expect(res.status).toBe(200);
			expect(res.headers.get('content-type')).toBe('audio/mpeg');
			const blob = await res.blob();
			expect(blob.size).toBeGreaterThan(1000);
		}, 15000);

		it('POST /api/speech/stt rejects empty form', async () => {
			const formData = new FormData();
			const res = await fetch(`${BASE}/api/speech/stt`, {
				method: 'POST',
				headers: new Headers({ 'X-Test-Learner-Id': zhLearnerId }),
				body: formData
			});
			expect(res.status).toBe(400);
		});

		it('POST /api/speech/evaluate requires all fields', async () => {
			const { status } = await post('/api/speech/evaluate', { transcript: '你好' }, zhLearnerId);
			expect(status).toBe(400);
		});

		it('POST /api/speech/evaluate returns pronunciation score', async () => {
			const { status, data } = await post(
				'/api/speech/evaluate',
				{
					transcript: '你好',
					expected: '你好',
					language: 'zh',
					lessonLanguage: 'hi'
				},
				zhLearnerId
			);
			expect(status).toBe(200);
			expect(data).toHaveProperty('score');
			expect(data).toHaveProperty('correct');
			expect(data).toHaveProperty('feedback');
			expect((data as { score: number }).score).toBeGreaterThanOrEqual(0);
			expect((data as { score: number }).score).toBeLessThanOrEqual(100);
			expect(typeof (data as { feedback: string }).feedback).toBe('string');
			expect((data as { feedback: string }).feedback.length).toBeGreaterThan(0);
		}, 30000);

		it('POST /api/speech/evaluate rejects invalid language', async () => {
			const { status } = await post(
				'/api/speech/evaluate',
				{
					transcript: 'hello',
					expected: 'hello',
					language: 'en',
					lessonLanguage: 'hi'
				},
				zhLearnerId
			);
			expect(status).toBe(400);
		});
	});

	describe('Chat API', () => {
		it('POST /api/chat requires authentication', async () => {
			const res = await fetch(`${BASE}/api/chat`, {
				method: 'POST',
				headers: buildHeaders(undefined),
				body: JSON.stringify({})
			});
			expect(res.status).toBe(401);
		});

		it('POST /api/chat returns JSON response payload', async () => {
			const res = await fetch(`${BASE}/api/chat`, {
				method: 'POST',
				headers: buildHeaders(zhLearnerId),
				body: JSON.stringify({ message: '你好' })
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

	describe('Progression API', () => {
		it('GET /api/progression requires authentication', async () => {
			const { status } = await api('/api/progression');
			expect(status).toBe(401);
		});

		it('GET /api/progression returns progression check', async () => {
			const { status, data } = await api('/api/progression', teLearnerId);
			expect(status).toBe(200);
			expect(data).toHaveProperty('ready');
			expect(data).toHaveProperty('currentLevel');
			expect(data).toHaveProperty('progressPercent');
			expect(typeof (data as { progressPercent: number }).progressPercent).toBe('number');
		});
	});

	describe('Profile PATCH API', () => {
		it('PATCH /api/profile updates preferences for authenticated learner', async () => {
			const { status, data } = await patch('/api/profile', { preferences: { theme: 'dark' } }, teLearnerId);
			expect(status).toBe(200);
			expect((data as { preferences: Record<string, unknown> }).preferences.theme).toBe('dark');
		});
	});
});
