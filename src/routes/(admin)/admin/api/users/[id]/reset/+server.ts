import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import {
	vocabulary,
	lessons,
	conversations,
	codeSwitches,
	quizResults,
	learners
} from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { updateLearner } from '$lib/server/data/learners';

export const POST: RequestHandler = async ({ params }) => {
	const id = params.id;

	await db.delete(quizResults).where(eq(quizResults.learnerId, id));
	await db.delete(codeSwitches).where(eq(codeSwitches.learnerId, id));
	await db.delete(conversations).where(eq(conversations.learnerId, id));
	await db.delete(lessons).where(eq(lessons.learnerId, id));
	await db.delete(vocabulary).where(eq(vocabulary.learnerId, id));

	await updateLearner(id, { cefrLevel: 'A1' });

	return json({ ok: true, message: 'Progress reset to A1' });
};
