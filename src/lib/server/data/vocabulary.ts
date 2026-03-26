import { and, eq, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { vocabulary } from '../schema';

export async function getVocabByLearnerId(learnerId: string) {
	return db.select().from(vocabulary).where(eq(vocabulary.learnerId, learnerId));
}

export async function getVocabById(id: string) {
	const rows = await db.select().from(vocabulary).where(eq(vocabulary.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function getDueVocab(learnerId: string, limit = 20) {
	return db
		.select()
		.from(vocabulary)
		.where(and(eq(vocabulary.learnerId, learnerId), lte(vocabulary.nextReview, new Date())))
		.orderBy(vocabulary.nextReview)
		.limit(limit);
}

export async function upsertVocab(data: {
	learnerId: string;
	word: string;
	romanization?: string;
	meaning?: string;
	sceneDescription?: string;
	cefrLevel: string;
	audioUrl?: string;
}) {
	const rows = await db
		.insert(vocabulary)
		.values(data)
		.onConflictDoUpdate({
			target: [vocabulary.learnerId, vocabulary.word],
			set: {
				romanization: data.romanization,
				meaning: data.meaning,
				sceneDescription: data.sceneDescription,
				...(data.audioUrl !== undefined ? { audioUrl: data.audioUrl } : {}),
				cefrLevel: data.cefrLevel,
				updatedAt: new Date()
			}
		})
		.returning();
	return rows[0];
}

export async function updateSM2(
	id: string,
	sm2: {
		repetition: number;
		interval: number;
		ef: number;
		nextReview: Date;
	}
) {
	const rows = await db
		.update(vocabulary)
		.set({
			sm2Repetition: sm2.repetition,
			sm2Interval: sm2.interval,
			sm2Ef: sm2.ef,
			nextReview: sm2.nextReview,
			updatedAt: new Date()
		})
		.where(eq(vocabulary.id, id))
		.returning();
	return rows[0] ?? null;
}

export async function updateModalityScore(
	id: string,
	modality: 'listening' | 'speaking' | 'contextual',
	score: number
) {
	await db
		.update(vocabulary)
		.set({
			modalityScores: sql`jsonb_set(modality_scores, ${`{${modality}}`}::text[], to_jsonb(${score}::int), true)`,
			updatedAt: new Date()
		})
		.where(eq(vocabulary.id, id));
}

export async function getVocabCount(learnerId: string) {
	const rows = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(vocabulary)
		.where(eq(vocabulary.learnerId, learnerId));
	return rows[0].count;
}

export async function getDueCount(learnerId: string) {
	const rows = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(vocabulary)
		.where(and(eq(vocabulary.learnerId, learnerId), lte(vocabulary.nextReview, new Date())));
	return rows[0].count;
}

export async function backfillVocabAudioUrl(learnerId: string, word: string, audioUrl: string) {
	await db
		.update(vocabulary)
		.set({ audioUrl })
		.where(
			and(
				eq(vocabulary.learnerId, learnerId),
				eq(vocabulary.word, word),
				sql`${vocabulary.audioUrl} IS NULL`
			)
		);
}
