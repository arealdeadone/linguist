import { describe, it, expect } from 'vitest';
import { review, newCard, nextReviewDate, isDue, modalityToQuality } from './srs';
import type { SM2Card, ReviewQuality } from './srs';

describe('SM-2 Algorithm', () => {
	describe('review()', () => {
		it('first correct review: interval=1, repetition=1', () => {
			const card = newCard();
			const result = review(card, 5);
			expect(result.repetition).toBe(1);
			expect(result.interval).toBe(1);
			expect(result.ef).toBeGreaterThan(2.5);
		});

		it('second correct review: interval=6', () => {
			const card: SM2Card = { repetition: 1, interval: 1, ef: 2.5 };
			const result = review(card, 5);
			expect(result.repetition).toBe(2);
			expect(result.interval).toBe(6);
		});

		it('third correct review: interval = round(6 * ef)', () => {
			const card: SM2Card = { repetition: 2, interval: 6, ef: 2.5 };
			const result = review(card, 5);
			expect(result.repetition).toBe(3);
			expect(result.interval).toBeGreaterThan(6);
		});

		it('interval is capped at 365 days', () => {
			const card: SM2Card = { repetition: 10, interval: 300, ef: 2.5 };
			const result = review(card, 5);
			expect(result.interval).toBeLessThanOrEqual(365);
		});

		it('repeated reviews never exceed 365-day cap', () => {
			let card: SM2Card = { repetition: 2, interval: 6, ef: 2.6 };
			for (let i = 0; i < 50; i++) {
				card = review(card, 5);
			}
			expect(card.interval).toBeLessThanOrEqual(365);
		});

		it('failed review (quality < 3) resets repetition and interval', () => {
			const card: SM2Card = { repetition: 5, interval: 90, ef: 2.5 };
			const result = review(card, 2);
			expect(result.repetition).toBe(0);
			expect(result.interval).toBe(1);
		});

		it('quality=0 resets card', () => {
			const card: SM2Card = { repetition: 3, interval: 15, ef: 2.5 };
			const result = review(card, 0);
			expect(result.repetition).toBe(0);
			expect(result.interval).toBe(1);
		});

		it('quality=1 resets card', () => {
			const card: SM2Card = { repetition: 3, interval: 15, ef: 2.5 };
			const result = review(card, 1);
			expect(result.repetition).toBe(0);
			expect(result.interval).toBe(1);
		});

		it('ef never drops below 1.3', () => {
			let card = newCard();
			for (let i = 0; i < 10; i++) {
				card = review(card, 0);
			}
			expect(card.ef).toBeGreaterThanOrEqual(1.3);
		});

		it('quality=5 increases ef', () => {
			const card = newCard();
			const result = review(card, 5);
			expect(result.ef).toBeGreaterThan(card.ef);
		});

		it('quality=3 decreases ef', () => {
			const card: SM2Card = { repetition: 0, interval: 0, ef: 2.5 };
			const result = review(card, 3);
			expect(result.ef).toBeLessThan(2.5);
		});

		it('typical progression: 1 → 6 → 15 → 37 → 92 (approx)', () => {
			let card = newCard();
			const intervals: number[] = [];

			for (let i = 0; i < 5; i++) {
				card = review(card, 5);
				intervals.push(card.interval);
			}

			expect(intervals[0]).toBe(1);
			expect(intervals[1]).toBe(6);
			expect(intervals[2]).toBeGreaterThanOrEqual(14);
			expect(intervals[2]).toBeLessThanOrEqual(17);
			expect(intervals[3]).toBeGreaterThan(30);
			expect(intervals[4]).toBeGreaterThan(70);
		});

		it('does not mutate input card', () => {
			const card: SM2Card = { repetition: 1, interval: 1, ef: 2.5 };
			const original = { ...card };
			review(card, 5);
			expect(card).toEqual(original);
		});

		it('all quality values 0-5 produce valid results', () => {
			const card = newCard();
			for (let q = 0; q <= 5; q++) {
				const result = review(card, q as ReviewQuality);
				expect(result.ef).toBeGreaterThanOrEqual(1.3);
				expect(result.interval).toBeGreaterThanOrEqual(0);
				expect(result.repetition).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe('nextReviewDate()', () => {
		it('adds interval days to current date', () => {
			const from = new Date('2026-03-23');
			const result = nextReviewDate(6, from);
			expect(result.toISOString().startsWith('2026-03-29')).toBe(true);
		});

		it('interval=1 means tomorrow', () => {
			const from = new Date('2026-03-23');
			const result = nextReviewDate(1, from);
			expect(result.toISOString().startsWith('2026-03-24')).toBe(true);
		});
	});

	describe('isDue()', () => {
		it('returns true if next_review is in the past', () => {
			const past = new Date('2026-03-20');
			expect(isDue(past, new Date('2026-03-23'))).toBe(true);
		});

		it('returns false if next_review is in the future', () => {
			const future = new Date('2026-03-30');
			expect(isDue(future, new Date('2026-03-23'))).toBe(false);
		});

		it('returns true if next_review is now', () => {
			const now = new Date('2026-03-23T12:00:00Z');
			expect(isDue(now, now)).toBe(true);
		});
	});

	describe('modalityToQuality()', () => {
		it('contextual + correct = 5', () => {
			expect(modalityToQuality('contextual', true, false)).toBe(5);
		});

		it('speaking + correct + no hesitation = 4', () => {
			expect(modalityToQuality('speaking', true, false)).toBe(4);
		});

		it('speaking + correct + hesitation = 3', () => {
			expect(modalityToQuality('speaking', true, true)).toBe(3);
		});

		it('listening + correct = 3 (passive recognition per spec)', () => {
			expect(modalityToQuality('listening', true, false)).toBe(3);
			expect(modalityToQuality('listening', true, true)).toBe(3);
		});

		it('incorrect + hesitation = 1', () => {
			expect(modalityToQuality('listening', false, true)).toBe(1);
		});

		it('incorrect + no hesitation = 0', () => {
			expect(modalityToQuality('listening', false, false)).toBe(0);
		});
	});

	describe('newCard()', () => {
		it('returns default SM-2 parameters', () => {
			const card = newCard();
			expect(card.repetition).toBe(0);
			expect(card.interval).toBe(0);
			expect(card.ef).toBe(2.5);
		});
	});
});
