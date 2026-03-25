import type { CefrLevel } from '$lib/types/lesson';

export interface LearnerProfile {
	id: string;
	name: string;
	targetLanguage: string;
	lessonLanguage: string;
	cefrLevel: CefrLevel;
}

let activeLearner = $state<LearnerProfile | null>(null);

export function getActiveLearner(): LearnerProfile | null {
	return activeLearner;
}

export function setActiveLearner(learner: LearnerProfile | null): void {
	activeLearner = learner;
}

export function isLearnerActive(): boolean {
	return activeLearner !== null;
}

export async function loadLearner(id: string): Promise<void> {
	const res = await fetch(`/api/profile/${id}`);

	if (!res.ok) {
		return;
	}

	const data = (await res.json()) as LearnerProfile;
	activeLearner = {
		id: data.id,
		name: data.name,
		targetLanguage: data.targetLanguage,
		lessonLanguage: data.lessonLanguage,
		cefrLevel: data.cefrLevel
	};
}

export function clearLearner(): void {
	activeLearner = null;
}
