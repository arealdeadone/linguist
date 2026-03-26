import type { CefrLevel } from '$lib/types';

export function selectQuizTypeByCefr(level: CefrLevel): 'multiple_choice' | 'fill_in_blank' {
	if (level === 'A1' || level === 'A2' || level === 'B1') return 'multiple_choice';
	return 'fill_in_blank';
}
