import { createServerClient } from '@supabase/ssr';
import type { User } from '@supabase/supabase-js';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env as publicEnv } from '$env/dynamic/public';
import { env } from '$env/dynamic/private';
import { getLearnerBySupabaseUserId } from '$lib/server/data/learners';

const supabaseHandle: Handle = async ({ event, resolve }) => {
	const secure = event.url.protocol === 'https:';

	event.locals.supabase = createServerClient(publicEnv.PUBLIC_SUPABASE_URL, publicEnv.PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					try {
						event.cookies.set(name, value, { ...options, path: '/', secure });
					} catch (e) {
						console.error(`Failed to set cookie '${name}':`, e);
					}
				});
			}
		}
	});

	event.locals.session = null;
	event.locals.user = null;
	event.locals.learnerId = null;

	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session) {
			event.locals.session = null;
			event.locals.user = null;
			return { session: null, user: null };
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();

		if (error) {
			event.locals.session = null;
			event.locals.user = null;
			return { session: null, user: null };
		}

		event.locals.session = session;
		event.locals.user = user;

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

const authHandle: Handle = async ({ event, resolve }) => {
	if (env.TEST_MODE === 'true') {
		const testLearnerId = event.request.headers.get('x-test-learner-id');
		if (testLearnerId) {
			event.locals.learnerId = testLearnerId;
			return resolve(event);
		}

		const testAdmin = event.request.headers.get('x-test-admin');
		if (testAdmin === 'true') {
			const adminUser = { id: env.ADMIN_SUPABASE_USER_ID } as User;
			event.locals.user = adminUser;
			event.locals.safeGetSession = async () => ({ session: null, user: adminUser });
			return resolve(event);
		}
	}

	const { user } = await event.locals.safeGetSession();
	event.locals.learnerId = null;

	if (user) {
		const learner = await getLearnerBySupabaseUserId(user.id);
		if (learner) {
			event.locals.learnerId = learner.id;
		}
	}

	const isAppRoute =
		event.url.pathname === '/' ||
		event.url.pathname.startsWith('/dashboard') ||
		event.url.pathname.startsWith('/learn') ||
		event.url.pathname.startsWith('/review') ||
		event.url.pathname.startsWith('/write') ||
		event.url.pathname.startsWith('/converse');

	if (isAppRoute && !user) {
		throw redirect(303, '/login');
	}

	if (isAppRoute && user && !event.locals.learnerId) {
		const isAdmin = user.id === env.ADMIN_SUPABASE_USER_ID;
		if (isAdmin) {
			throw redirect(303, '/admin');
		}

		throw redirect(303, '/login');
	}

	if (event.url.pathname.startsWith('/admin')) {
		if (!user || user.id !== env.ADMIN_SUPABASE_USER_ID) {
			throw redirect(303, '/login');
		}
	}

	return resolve(event);
};

export const handle: Handle = sequence(supabaseHandle, authHandle);
