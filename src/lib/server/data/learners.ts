import { eq } from 'drizzle-orm';
import { db } from '../db';
import { learners } from '../schema';

export async function getAllLearners() {
	return db
		.select({
			id: learners.id,
			name: learners.name,
			supabaseUserId: learners.supabaseUserId,
			targetLanguage: learners.targetLanguage,
			lessonLanguage: learners.lessonLanguage,
			cefrLevel: learners.cefrLevel,
			createdAt: learners.createdAt
		})
		.from(learners);
}

export async function getLearnerById(id: string) {
	const rows = await db.select().from(learners).where(eq(learners.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function getLearnerBySupabaseUserId(supabaseUserId: string) {
	const rows = await db
		.select()
		.from(learners)
		.where(eq(learners.supabaseUserId, supabaseUserId))
		.limit(1);
	return rows[0] ?? null;
}

export async function createLearner(data: {
	name: string;
	supabaseUserId?: string;
	targetLanguage: string;
	lessonLanguage: string;
}) {
	const rows = await db.insert(learners).values(data).returning();
	return rows[0];
}

export async function updateLearner(
	id: string,
	data: Partial<{
		name: string;
		supabaseUserId: string;
		cefrLevel: string;
		lessonLanguage: string;
		preferences: Record<string, unknown>;
	}>
) {
	const rows = await db
		.update(learners)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(learners.id, id))
		.returning();
	return rows[0] ?? null;
}
