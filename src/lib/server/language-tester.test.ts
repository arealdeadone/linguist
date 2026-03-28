import { describe, it, expect } from 'vitest';
import { getValidatedModelRouting } from './language-tester';

describe('getValidatedModelRouting', () => {
	it('returns defaults when candidate is null', () => {
		const result = getValidatedModelRouting('zh', null);
		expect(result.lesson_generation).toBeDefined();
		expect(result.conversation).toBeDefined();
	});

	it('returns defaults when candidate is not an object', () => {
		const result = getValidatedModelRouting('zh', 'invalid');
		expect(result.lesson_generation).toBeDefined();
	});

	it('accepts valid model names', () => {
		const result = getValidatedModelRouting('zh', {
			lesson_generation: 'gpt-4o',
			conversation: 'gemini-3-flash-preview',
			grammar_evaluation: 'claude-sonnet-4-6',
			flashcard: 'gpt-4o-mini',
			quiz: 'gpt-4o-mini',
			summary: 'gpt-4o-mini',
			code_switch: 'gpt-4o'
		});
		expect(result.lesson_generation).toBe('gpt-4o');
		expect(result.conversation).toBe('gemini-3-flash-preview');
		expect(result.grammar_evaluation).toBe('claude-sonnet-4-6');
		expect(result.flashcard).toBe('gpt-4o-mini');
	});

	it('rejects hallucinated model names and falls back to default', () => {
		const result = getValidatedModelRouting('zh', {
			lesson_generation: 'Japanese_LessonGen_v2',
			conversation: 'my-custom-model',
			grammar_evaluation: 'claude-sonnet-4-6'
		});
		expect(result.lesson_generation).not.toBe('Japanese_LessonGen_v2');
		expect(result.conversation).not.toBe('my-custom-model');
		expect(result.grammar_evaluation).toBe('claude-sonnet-4-6');
	});

	it('rejects empty strings and falls back to default', () => {
		const result = getValidatedModelRouting('zh', {
			lesson_generation: '',
			conversation: '   '
		});
		expect(result.lesson_generation).toBeTruthy();
		expect(result.conversation).toBeTruthy();
	});

	it('rejects non-string values and falls back to default', () => {
		const result = getValidatedModelRouting('zh', {
			lesson_generation: 42,
			conversation: true,
			grammar_evaluation: null
		});
		expect(typeof result.lesson_generation).toBe('string');
		expect(typeof result.conversation).toBe('string');
		expect(typeof result.grammar_evaluation).toBe('string');
	});

	it('all returned models are in the supported set', () => {
		const supported = new Set([
			'gpt-4o',
			'gpt-4o-mini',
			'gemini-3-flash-preview',
			'claude-sonnet-4-6'
		]);
		const result = getValidatedModelRouting('zh', {
			lesson_generation: 'FAKE_MODEL_v9',
			conversation: 'another-fake'
		});
		for (const model of Object.values(result)) {
			expect(supported.has(model)).toBe(true);
		}
	});
});
