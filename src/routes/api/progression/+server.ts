import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CEFR_LEVELS } from '$lib/constants';
import type { CefrLevel } from '$lib/types/lesson';
import { getLearnerById } from '$lib/server/data/learners';
import { checkProgression, promoteLevel } from '$lib/server/progression';

function isCefrLevel(value: string): value is CefrLevel {
	return CEFR_LEVELS.includes(value as CefrLevel);
}

export const GET: RequestHandler = async ({ locals }) => {
	const learnerId = locals.learnerId;
	if (!learnerId) return json({ error: 'Not authenticated' }, { status: 401 });

	const learner = await getLearnerById(learnerId);
	if (!learner) return json({ error: 'Learner not found' }, { status: 404 });
	if (!isCefrLevel(learner.cefrLevel)) {
		return json({ error: 'Invalid learner CEFR level' }, { status: 400 });
	}

	const progression = await checkProgression(learnerId, learner.cefrLevel);
	return json(progression);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	const learnerId = locals.learnerId;
	if (!learnerId) return json({ error: 'Not authenticated' }, { status: 401 });

	const body = (await request.json()) as { newLevel?: string };
	const { newLevel } = body;

	if (!newLevel || !isCefrLevel(newLevel)) {
		return json({ error: 'Valid newLevel required' }, { status: 400 });
	}

	await promoteLevel(learnerId, newLevel);
	return json({ ok: true });
};
