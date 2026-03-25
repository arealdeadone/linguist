import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { codeSwitches } from '../schema';

export async function upsertCodeSwitch(data: {
	learnerId: string;
	conversationId?: string;
	gapWord: string;
	targetEquiv?: string;
}) {
	const rows = await db
		.insert(codeSwitches)
		.values(data)
		.onConflictDoUpdate({
			target: [codeSwitches.learnerId, codeSwitches.gapWord],
			set: {
				timesUsed: sql`${codeSwitches.timesUsed} + 1`,
				targetEquiv: data.targetEquiv,
				conversationId: data.conversationId
			}
		})
		.returning();
	return rows[0];
}

export async function getFrequentSwitches(learnerId: string, minTimes = 3) {
	return db
		.select()
		.from(codeSwitches)
		.where(
			and(
				eq(codeSwitches.learnerId, learnerId),
				sql`${codeSwitches.timesUsed} >= ${minTimes}`,
				eq(codeSwitches.promotedToVocab, false)
			)
		)
		.orderBy(desc(codeSwitches.timesUsed));
}

export async function promoteToVocab(id: string) {
	const rows = await db
		.update(codeSwitches)
		.set({ promotedToVocab: true })
		.where(eq(codeSwitches.id, id))
		.returning();
	return rows[0] ?? null;
}
