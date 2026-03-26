import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getLearnerById, updateLearner } from '$lib/server/data/learners';
import { env } from '$env/dynamic/private';

async function requireAdmin(
	locals: App.Locals
): Promise<{ ok: true } | { ok: false; response: Response }> {
	const { user } = await locals.safeGetSession();
	if (!user || user.id !== env.ADMIN_SUPABASE_USER_ID) {
		return { ok: false, response: json({ error: 'Forbidden' }, { status: 403 }) };
	}

	return { ok: true };
}

export const GET: RequestHandler = async ({ params, locals }) => {
	const auth = await requireAdmin(locals);
	if (!auth.ok) return auth.response;

	const learner = await getLearnerById(params.id);
	if (!learner) return json({ error: 'Not found' }, { status: 404 });
	return json(learner);
};

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
	const auth = await requireAdmin(locals);
	if (!auth.ok) return auth.response;

	const body = await request.json();
	const learner = await updateLearner(params.id, body);
	if (!learner) return json({ error: 'Not found' }, { status: 404 });
	return json(learner);
};
