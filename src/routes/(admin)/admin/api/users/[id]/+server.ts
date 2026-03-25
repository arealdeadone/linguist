import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { learners } from '$lib/server/schema';
import { updateLearner } from '$lib/server/data/learners';
import { CEFR_LEVELS } from '$lib/constants';
import { eq } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const rows = await db.delete(learners).where(eq(learners.id, params.id)).returning();
		if (rows.length === 0) return json({ error: 'Not found' }, { status: 404 });
		return json({ ok: true, deleted: rows[0].name });
	} catch (error) {
		console.error('Failed to delete learner:', error);
		return json({ error: 'Failed to delete learner' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const body = (await request.json()) as { cefrLevel?: unknown };
		if (typeof body.cefrLevel !== 'string') {
			return json({ error: 'cefrLevel is required' }, { status: 400 });
		}

		const cefrLevel = body.cefrLevel.trim().toUpperCase();
		if (!CEFR_LEVELS.includes(cefrLevel as (typeof CEFR_LEVELS)[number])) {
			return json({ error: 'Invalid CEFR level. Use A1, A2, B1, B2, C1, or C2.' }, { status: 400 });
		}

		const updated = await updateLearner(params.id, { cefrLevel });
		if (!updated) {
			return json({ error: 'Learner not found' }, { status: 404 });
		}

		return json(updated);
	} catch (error) {
		console.error('Failed to update learner:', error);
		return json({ error: 'Failed to update learner' }, { status: 500 });
	}
};
