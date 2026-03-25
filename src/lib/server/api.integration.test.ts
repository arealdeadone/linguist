import { describe, it, expect, beforeAll } from 'vitest';

const BASE = 'http://localhost:5173';
let learnerId: string;
let lessonId: string;

async function api(path: string, options?: RequestInit) {
	const res = await fetch(`${BASE}${path}`, options);
	return { status: res.status, data: await res.json(), ok: res.ok };
}

async function post(path: string, body: Record<string, unknown>) {
	return api(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body)
	});
}

describe('API Integration Tests', () => {
	describe('Profile API', () => {
		it('GET /api/profile returns learner list', async () => {
			const { status, data } = await api('/api/profile');
			expect(status).toBe(200);
			expect(Array.isArray(data)).toBe(true);
			expect(data.length).toBeGreaterThan(0);
			learnerId = data[0].id;
		});

		it('GET /api/profile/[id] returns single learner', async () => {
			const { status, data } = await api(`/api/profile/${learnerId}`);
			expect(status).toBe(200);
			expect(data.id).toBe(learnerId);
			expect(data.targetLanguage).toMatch(/^(zh|te)$/);
			expect(data.lessonLanguage).toMatch(/^(hi|th|en)$/);
		});

		it('GET /api/profile/[id] returns 404 for invalid id', async () => {
			const { status } = await api('/api/profile/00000000-0000-0000-0000-000000000000');
			expect(status).toBe(404);
		});

	it('POST /api/profile with invalid pin returns 401', async () => {
		const { status } = await post('/api/profile', { name: 'Arvind', pin: '9999' });
		expect(status).toBe(401);
	});

		it('POST /api/profile requires name for creation', async () => {
			const { status } = await post('/api/profile', { targetLanguage: 'zh' });
			expect(status).toBe(400);
		});
	});

	describe('Lessons API', () => {
		it('GET /api/lessons requires learnerId', async () => {
			const { status } = await api('/api/lessons');
			expect(status).toBe(400);
		});

		it('GET /api/lessons returns lessons for learner', async () => {
			const { status, data } = await api(`/api/lessons?learnerId=${learnerId}`);
			expect(status).toBe(200);
			expect(Array.isArray(data)).toBe(true);
			if (data.length > 0) {
				lessonId = data[0].id;
				expect(data[0]).toHaveProperty('plan');
				expect(data[0]).toHaveProperty('status');
			}
		});

		it('GET /api/lessons/[id] returns single lesson', async () => {
			if (!lessonId) return;
			const { status, data } = await api(`/api/lessons/${lessonId}`);
			expect(status).toBe(200);
			expect(data.id).toBe(lessonId);
			expect(data.plan).toBeDefined();
		});

		it('GET /api/lessons/[id] returns 404 for invalid id', async () => {
			const { status } = await api('/api/lessons/00000000-0000-0000-0000-000000000000');
			expect(status).toBe(404);
		});
	});

	describe('SRS API', () => {
		it('GET /api/srs requires learnerId', async () => {
			const { status } = await api('/api/srs');
			expect(status).toBe(400);
		});

		it('GET /api/srs returns due vocabulary cards', async () => {
			const { status, data } = await api(`/api/srs?learnerId=${learnerId}`);
			expect(status).toBe(200);
			expect(Array.isArray(data)).toBe(true);
			if (data.length > 0) {
				expect(data[0]).toHaveProperty('word');
				expect(data[0]).toHaveProperty('romanization');
				expect(data[0]).toHaveProperty('meaning');
				expect(data[0]).toHaveProperty('sm2Ef');
				expect(data[0]).toHaveProperty('nextReview');
			}
		});

		it('GET /api/srs/stats returns card counts', async () => {
			const { status, data } = await api(`/api/srs/stats?learnerId=${learnerId}`);
			expect(status).toBe(200);
			expect(data).toHaveProperty('total_cards');
			expect(data).toHaveProperty('due_today');
			expect(typeof data.total_cards).toBe('number');
		});

		it('POST /api/srs requires vocabId and quality', async () => {
			const { status } = await post('/api/srs', {});
			expect(status).toBe(400);
		});

		it('POST /api/srs rejects quality outside 0-5', async () => {
			const { status } = await post('/api/srs', { vocabId: 'fake', quality: 6 });
			expect(status).toBe(400);
		});

		it('POST /api/srs updates vocabulary SM-2 state', async () => {
			const cards = await api(`/api/srs?learnerId=${learnerId}&all=true`);
			if (cards.data.length === 0) return;

			const vocabId = cards.data[0].id;
			const { status, data } = await post('/api/srs', { vocabId, quality: 4 });
			expect(status).toBe(200);
			expect(data.sm2Repetition).toBeGreaterThanOrEqual(1);
			expect(data.sm2Interval).toBeGreaterThanOrEqual(1);
		});
	});

	describe('Quiz API', () => {
		it('POST /api/quiz requires learnerId and quizType', async () => {
			const { status } = await post('/api/quiz', {});
			expect(status).toBe(400);
		});

		it('POST /api/quiz generates a multiple choice quiz', async () => {
			const { status, data } = await post('/api/quiz', {
				learnerId,
				lessonId,
				quizType: 'multiple_choice'
			});
			expect(status).toBe(201);
			expect(data).toHaveProperty('questions');
			expect(Array.isArray(data.questions)).toBe(true);
			expect(data.questions.length).toBeGreaterThan(0);

			const q = data.questions[0];
			expect(q).toHaveProperty('word');
			expect(q).toHaveProperty('correct_index');
			expect(typeof q.correct_index).toBe('number');
		}, 30000);

		it('POST /api/quiz/submit requires all fields', async () => {
			const { status } = await post('/api/quiz/submit', { learnerId });
			expect(status).toBe(400);
		});
	});

	describe('Speech API', () => {
		it('POST /api/speech/tts requires text', async () => {
			const { status } = await post('/api/speech/tts', {});
			expect(status).toBe(400);
		});

		it('POST /api/speech/tts generates audio', async () => {
			const res = await fetch(`${BASE}/api/speech/tts`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
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
				body: formData
			});
			expect(res.status).toBe(400);
		});

		it('POST /api/speech/evaluate requires all fields', async () => {
			const { status } = await post('/api/speech/evaluate', { transcript: '你好' });
			expect(status).toBe(400);
		});

		it('POST /api/speech/evaluate returns pronunciation score', async () => {
			const { status, data } = await post('/api/speech/evaluate', {
				transcript: '你好',
				expected: '你好',
				language: 'zh',
				lessonLanguage: 'hi'
			});
			expect(status).toBe(200);
			expect(data).toHaveProperty('score');
			expect(data).toHaveProperty('correct');
			expect(data).toHaveProperty('feedback');
			expect(data.score).toBeGreaterThanOrEqual(0);
			expect(data.score).toBeLessThanOrEqual(100);
			expect(typeof data.feedback).toBe('string');
			expect(data.feedback.length).toBeGreaterThan(0);
		}, 30000);

		it('POST /api/speech/evaluate rejects invalid language', async () => {
			const { status } = await post('/api/speech/evaluate', {
				transcript: 'hello',
				expected: 'hello',
				language: 'en',
				lessonLanguage: 'hi'
			});
			expect(status).toBe(400);
		});
	});

	describe('Chat API', () => {
		it('POST /api/chat requires learnerId and message', async () => {
			const res = await fetch(`${BASE}/api/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({})
			});
			expect(res.status).toBe(400);
		});

		it('POST /api/chat returns JSON response payload', async () => {
			const res = await fetch(`${BASE}/api/chat`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ learnerId, message: '你好' })
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
		it('GET /api/progression requires learnerId', async () => {
			const { status } = await api('/api/progression');
			expect(status).toBe(400);
		});

		it('GET /api/progression returns progression check', async () => {
			const { status, data } = await api(`/api/progression?learnerId=${learnerId}`);
			expect(status).toBe(200);
			expect(data).toHaveProperty('ready');
			expect(data).toHaveProperty('currentLevel');
			expect(data).toHaveProperty('progressPercent');
			expect(typeof data.progressPercent).toBe('number');
		});
	});
});
