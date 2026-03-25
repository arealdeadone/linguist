import { desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { conversations } from '../schema';

export async function createConversation(data: {
	learnerId: string;
	lessonId?: string;
	scenario?: string;
}) {
	const rows = await db
		.insert(conversations)
		.values({ ...data, messages: [] })
		.returning();
	return rows[0];
}

export async function getConversationById(id: string) {
	const rows = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function appendMessage(id: string, message: Record<string, unknown>) {
	const conv = await getConversationById(id);
	if (!conv) return null;

	const messages = [...(conv.messages as Record<string, unknown>[]), message];
	const rows = await db
		.update(conversations)
		.set({ messages })
		.where(eq(conversations.id, id))
		.returning();
	return rows[0] ?? null;
}

export async function saveAnalysis(
	id: string,
	analysis: Record<string, unknown>,
	srsUpdates?: Record<string, unknown>
) {
	const rows = await db
		.update(conversations)
		.set({ analysis, srsUpdates, completedAt: new Date() })
		.where(eq(conversations.id, id))
		.returning();
	return rows[0] ?? null;
}

export async function completeConversation(id: string) {
	const rows = await db
		.update(conversations)
		.set({ completedAt: new Date() })
		.where(eq(conversations.id, id))
		.returning();
	return rows[0] ?? null;
}

export async function getConversationsByLearnerId(learnerId: string, limit = 10) {
	return db
		.select()
		.from(conversations)
		.where(eq(conversations.learnerId, learnerId))
		.orderBy(desc(conversations.createdAt))
		.limit(limit);
}
