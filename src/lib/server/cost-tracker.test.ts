import { describe, expect, it } from 'vitest';
import { calculateCost } from './cost-tracker';

describe('calculateCost', () => {
	it('calculates gpt-4o cost', () => {
		expect(calculateCost('gpt-4o', 1000, 2000)).toBeCloseTo(0.0225, 10);
	});

	it('calculates gpt-4o-mini cost', () => {
		expect(calculateCost('gpt-4o-mini', 1000, 2000)).toBeCloseTo(0.00135, 10);
	});

	it('calculates gpt-4o-mini-tts cost', () => {
		expect(calculateCost('gpt-4o-mini-tts', 1000, 2000)).toBeCloseTo(0.0246, 10);
	});

	it('calculates gpt-4o-transcribe cost', () => {
		expect(calculateCost('gpt-4o-transcribe', 1000, 2000)).toBeCloseTo(0.0225, 10);
	});

	it('calculates claude-sonnet-4-6 cost', () => {
		expect(calculateCost('claude-sonnet-4-6', 1000, 2000)).toBeCloseTo(0.033, 10);
	});

	it('calculates gemini-3-flash-preview cost', () => {
		expect(calculateCost('gemini-3-flash-preview', 1000, 2000)).toBeCloseTo(0.0065, 10);
	});

	it('uses fallback pricing for unknown model', () => {
		expect(calculateCost('unknown-model', 1000, 2000)).toBeCloseTo(0.003, 10);
	});

	it('returns zero for zero tokens', () => {
		expect(calculateCost('gpt-4o', 0, 0)).toBe(0);
	});
});
