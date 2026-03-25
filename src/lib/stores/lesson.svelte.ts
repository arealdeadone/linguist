import type { LessonPlan, LessonStatus } from '$lib/types/lesson';

interface ActiveLesson {
	id: string;
	plan: LessonPlan;
	status: LessonStatus;
	currentActivityIndex: number;
	startedAt: Date;
}

let activeLesson = $state<ActiveLesson | null>(null);

export function getActiveLesson(): ActiveLesson | null {
	return activeLesson;
}

export function startLesson(id: string, plan: LessonPlan): void {
	activeLesson = {
		id,
		plan,
		status: 'in_progress',
		currentActivityIndex: 0,
		startedAt: new Date()
	};
}

export function getCurrentActivity() {
	if (!activeLesson) {
		return null;
	}

	return activeLesson.plan.activities[activeLesson.currentActivityIndex] ?? null;
}

export function nextActivity(): boolean {
	if (!activeLesson) {
		return false;
	}

	const nextIdx = activeLesson.currentActivityIndex + 1;

	if (nextIdx >= activeLesson.plan.activities.length) {
		activeLesson.status = 'completed';
		return false;
	}

	activeLesson.currentActivityIndex = nextIdx;
	return true;
}

export function previousActivity(): boolean {
	if (!activeLesson || activeLesson.currentActivityIndex === 0) {
		return false;
	}

	activeLesson.currentActivityIndex -= 1;
	return true;
}

export function getLessonProgress(): number {
	if (!activeLesson) {
		return 0;
	}

	const total = activeLesson.plan.activities.length;

	if (total === 0) {
		return 0;
	}

	return (activeLesson.currentActivityIndex + 1) / total;
}

export function endLesson(): void {
	activeLesson = null;
}
