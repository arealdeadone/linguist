import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllLearners, createLearner, getLearnerByNameAndPin } from '$lib/server/data/learners';

export const GET: RequestHandler = async () => {
	const learners = await getAllLearners();
	return json(learners);
};

export const POST: RequestHandler = async ({ request, url, cookies }) => {
	const body = await request.json();
	const secure = url.protocol === 'https:';

	if (body.action === 'logout') {
		cookies.delete('learner_id', { path: '/', secure });
		return json({ ok: true });
	}

	if (body.pin && body.name && !body.targetLanguage) {
		const learner = await getLearnerByNameAndPin(body.name, body.pin);
		if (!learner) return json({ error: 'Invalid name or PIN' }, { status: 401 });
		cookies.set('learner_id', learner.id, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure,
			maxAge: 60 * 60 * 24 * 30
		});
		return json(learner);
	}

	if (!body.name || !body.targetLanguage || !body.lessonLanguage) {
		return json({ error: 'name, targetLanguage, and lessonLanguage required' }, { status: 400 });
	}

	const learner = await createLearner(body);
	return json(learner, { status: 201 });
};
