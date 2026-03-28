import { and, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { lessons } from '../schema';

export async function createLesson(data: {
	learnerId: string;
	cefrLevel: string;
	week?: number;
	day?: number;
	theme?: string;
	plan: Record<string, unknown>;
}) {
	const rows = await db.insert(lessons).values(data).returning();
	return rows[0];
}

export async function getLessonById(id: string) {
	const rows = await db.select().from(lessons).where(eq(lessons.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function getLessonsByLearnerId(learnerId: string, limit = 20) {
	return db
		.select()
		.from(lessons)
		.where(eq(lessons.learnerId, learnerId))
		.orderBy(desc(lessons.createdAt))
		.limit(limit);
}

export async function updateLessonStatus(id: string, status: string) {
	const now = new Date();
	const set: Partial<{
		status: string;
		startedAt: Date;
		completedAt: Date;
	}> = { status };

	if (status === 'in_progress') set.startedAt = now;
	if (status === 'completed') set.completedAt = now;

	const rows = await db.update(lessons).set(set).where(eq(lessons.id, id)).returning();
	return rows[0] ?? null;
}

export async function updateLessonPlan(id: string, plan: Record<string, unknown>) {
	const rows = await db.update(lessons).set({ plan }).where(eq(lessons.id, id)).returning();
	return rows[0] ?? null;
}

export async function getNextPendingLesson(learnerId: string) {
	const rows = await db
		.select()
		.from(lessons)
		.where(and(eq(lessons.learnerId, learnerId), eq(lessons.status, 'pending')))
		.orderBy(lessons.createdAt)
		.limit(1);
	return rows[0] ?? null;
}
