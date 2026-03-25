import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { quizResults } from '../schema';

export async function saveQuizResult(data: {
	learnerId: string;
	lessonId?: string;
	quizType: string;
	questions: Record<string, unknown>;
	answers: Record<string, unknown>;
	score?: number;
	srsUpdates?: Record<string, unknown>;
}) {
	const rows = await db.insert(quizResults).values(data).returning();
	return rows[0];
}

export async function getQuizResultById(id: string) {
	const rows = await db.select().from(quizResults).where(eq(quizResults.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function getQuizHistory(learnerId: string, limit = 20) {
	return db
		.select()
		.from(quizResults)
		.where(eq(quizResults.learnerId, learnerId))
		.orderBy(desc(quizResults.createdAt))
		.limit(limit);
}
