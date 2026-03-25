import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLearnerById, updateLearner } from '$lib/server/data/learners';

export const GET: RequestHandler = async ({ params }) => {
	const learner = await getLearnerById(params.id);
	if (!learner) return json({ error: 'Not found' }, { status: 404 });
	return json(learner);
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const learner = await updateLearner(params.id, body);
	if (!learner) return json({ error: 'Not found' }, { status: 404 });
	return json(learner);
};
