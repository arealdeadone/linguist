import { and, eq } from 'drizzle-orm';
import { db } from '../db';
import { learners } from '../schema';

export async function getAllLearners() {
	return db
		.select({
			id: learners.id,
			name: learners.name,
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

export async function getLearnerByPin(pin: string) {
	const rows = await db.select().from(learners).where(eq(learners.pin, pin)).limit(1);
	return rows[0] ?? null;
}

export async function getLearnerByNameAndPin(name: string, pin: string) {
	const rows = await db
		.select()
		.from(learners)
		.where(and(eq(learners.name, name), eq(learners.pin, pin)))
		.limit(1);
	return rows[0] ?? null;
}

export async function createLearner(data: {
	name: string;
	pin?: string;
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
		pin: string;
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
