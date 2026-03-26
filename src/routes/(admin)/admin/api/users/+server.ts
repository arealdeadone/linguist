import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllLearners, createLearner } from '$lib/server/data/learners';
import { getVocabCount, getDueCount } from '$lib/server/data/vocabulary';
import { getSupabaseAdmin } from '$lib/server/supabase-admin';

export const GET: RequestHandler = async () => {
	const learners = await getAllLearners();
	const enriched = await Promise.all(
		learners.map(async (l) => {
			const [vocabCount, dueCount] = await Promise.all([getVocabCount(l.id), getDueCount(l.id)]);
			return { ...l, vocabCount, dueCount };
		})
	);
	return json(enriched);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { email, name, password, targetLanguage, lessonLanguage } = body;

	if (!email || !name || !password || !targetLanguage || !lessonLanguage) {
		return json(
			{ error: 'email, name, password, targetLanguage, and lessonLanguage required' },
			{ status: 400 }
		);
	}

	const admin = getSupabaseAdmin();
	const { data: authData, error: authError } = await admin.auth.admin.createUser({
		email,
		password,
		email_confirm: true
	});

	if (authError) {
		return json({ error: authError.message }, { status: 400 });
	}

	if (!authData.user) {
		return json({ error: 'Failed to create auth user' }, { status: 500 });
	}

	const learner = await createLearner({
		name,
		supabaseUserId: authData.user.id,
		targetLanguage,
		lessonLanguage
	});

	return json(learner, { status: 201 });
};
