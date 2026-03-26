import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLearnerById, updateLearner } from '$lib/server/data/learners';

export const GET: RequestHandler = async ({ locals }) => {
	const learnerId = locals.learnerId;
	if (!learnerId) return json({ error: 'Not authenticated' }, { status: 401 });

	const learner = await getLearnerById(learnerId);
	if (!learner) return json({ error: 'Learner not found' }, { status: 404 });

	return json(learner);
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const learnerId = locals.learnerId;
	if (!learnerId) return json({ error: 'Not authenticated' }, { status: 401 });

	const body = (await request.json()) as { preferences?: Record<string, unknown> };
	if (!body.preferences || typeof body.preferences !== 'object') {
		return json({ error: 'preferences required' }, { status: 400 });
	}

	const learner = await updateLearner(learnerId, { preferences: body.preferences });
	if (!learner) return json({ error: 'Learner not found' }, { status: 404 });

	return json(learner);
};
