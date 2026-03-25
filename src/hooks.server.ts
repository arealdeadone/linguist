import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { env as publicEnv } from '$env/dynamic/public';
import { env } from '$env/dynamic/private';

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

const adminGuard: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/admin')) {
		const { user } = await event.locals.safeGetSession();

		if (!user || user.id !== env.ADMIN_SUPABASE_USER_ID) {
			throw redirect(303, '/login');
		}
	}

	return resolve(event);
};

export const handle: Handle = sequence(supabaseHandle, adminGuard);
