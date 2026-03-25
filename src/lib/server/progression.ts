import { CEFR_LEVELS, CEFR_VOCAB_TARGETS } from '$lib/constants';
import type { CefrLevel } from '$lib/types/lesson';
import { getConversationsByLearnerId } from './data/conversations';
import { getLessonsByLearnerId } from './data/lessons';
import { updateLearner } from './data/learners';
import { getVocabByLearnerId } from './data/vocabulary';

interface ProgressionThreshold {
	lessonsRequired: number;
	conversationsRequired: number;
}

interface ProgressionCheck {
	ready: boolean;
	currentLevel: CefrLevel;
	nextLevel: CefrLevel | null;
	vocabMastered: number;
	vocabRequired: number;
	lessonsCompleted: number;
	lessonsRequired: number;
	conversationsCompleted: number;
	conversationsRequired: number;
	progressPercent: number;
}

const PROGRESSION_THRESHOLDS: Record<Exclude<CefrLevel, 'C2'>, ProgressionThreshold> = {
	A1: { lessonsRequired: 5, conversationsRequired: 3 },
	A2: { lessonsRequired: 15, conversationsRequired: 10 },
	B1: { lessonsRequired: 30, conversationsRequired: 20 },
	B2: { lessonsRequired: 50, conversationsRequired: 30 },
	C1: { lessonsRequired: 100, conversationsRequired: 50 }
};

function getNextLevel(level: CefrLevel): CefrLevel | null {
	const index = CEFR_LEVELS.indexOf(level);
	if (index < 0 || index >= CEFR_LEVELS.length - 1) return null;
	return CEFR_LEVELS[index + 1] ?? null;
}

function getProgressPercent(values: number[]): number {
	if (values.length === 0) return 100;
	const normalized = values.map((value) => Math.min(1, Math.max(0, value)));
	const avg = normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
	return Math.round(avg * 100);
}

export async function checkProgression(
	learnerId: string,
	currentLevel: CefrLevel
): Promise<ProgressionCheck> {
	const nextLevel = getNextLevel(currentLevel);

	const [vocab, lessons, conversations] = await Promise.all([
		getVocabByLearnerId(learnerId),
		getLessonsByLearnerId(learnerId, 1000),
		getConversationsByLearnerId(learnerId, 1000)
	]);

	const vocabMastered = vocab.filter((item) => item.sm2Interval > 30).length;
	const lessonsCompleted = lessons.filter((lesson) => lesson.status === 'completed').length;
	const conversationsCompleted = conversations.filter((conversation) => Boolean(conversation.completedAt)).length;

	if (!nextLevel) {
		return {
			ready: false,
			currentLevel,
			nextLevel: null,
			vocabMastered,
			vocabRequired: 0,
			lessonsCompleted,
			lessonsRequired: 0,
			conversationsCompleted,
			conversationsRequired: 0,
			progressPercent: 100
		};
	}

	const threshold = PROGRESSION_THRESHOLDS[currentLevel as Exclude<CefrLevel, 'C2'>];
	const vocabRequired = Math.ceil(CEFR_VOCAB_TARGETS[currentLevel] * 0.8);
	const lessonsRequired = threshold.lessonsRequired;
	const conversationsRequired = threshold.conversationsRequired;

	const ready =
		vocabMastered >= vocabRequired &&
		lessonsCompleted >= lessonsRequired &&
		conversationsCompleted >= conversationsRequired;

	const progressPercent = getProgressPercent([
		vocabMastered / vocabRequired,
		lessonsCompleted / lessonsRequired,
		conversationsCompleted / conversationsRequired
	]);

	return {
		ready,
		currentLevel,
		nextLevel,
		vocabMastered,
		vocabRequired,
		lessonsCompleted,
		lessonsRequired,
		conversationsCompleted,
		conversationsRequired,
		progressPercent
	};
}

export async function promoteLevel(learnerId: string, newLevel: CefrLevel): Promise<void> {
	await updateLearner(learnerId, { cefrLevel: newLevel });
}
