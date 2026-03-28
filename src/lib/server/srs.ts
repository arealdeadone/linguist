export interface SM2Card {
	repetition: number;
	interval: number;
	ef: number;
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * SM-2 review function. Pure — no side effects.
 *
 * Quality ratings:
 * 0 - Complete blackout
 * 1 - Incorrect, but upon seeing correct answer, remembered
 * 2 - Incorrect, but correct answer seemed easy to recall
 * 3 - Correct with serious difficulty
 * 4 - Correct after hesitation
 * 5 - Perfect response
 */
const MAX_INTERVAL_DAYS = 365;

export function review(card: SM2Card, quality: ReviewQuality): SM2Card {
	let { repetition, interval, ef } = card;

	if (quality < 3) {
		repetition = 0;
		interval = 1;
	} else {
		if (repetition === 0) {
			interval = 1;
		} else if (repetition === 1) {
			interval = 6;
		} else {
			interval = Math.min(Math.round(interval * ef), MAX_INTERVAL_DAYS);
		}
		repetition += 1;
	}

	ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
	if (ef < 1.3) ef = 1.3;

	return { repetition, interval, ef };
}

export function nextReviewDate(interval: number, from: Date = new Date()): Date {
	const next = new Date(from);
	next.setDate(next.getDate() + interval);
	return next;
}

export function isDue(nextReview: Date, now: Date = new Date()): boolean {
	return nextReview <= now;
}

export function newCard(): SM2Card {
	return { repetition: 0, interval: 0, ef: 2.5 };
}

export function modalityToQuality(
	modality: 'listening' | 'speaking' | 'contextual',
	correct: boolean,
	hesitation: boolean
): ReviewQuality {
	if (!correct) return hesitation ? 1 : 0;

	if (modality === 'contextual') return 5;
	if (modality === 'speaking') return hesitation ? 3 : 4;
	return 3;
}
