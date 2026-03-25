import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();

	if (!user || user.id !== env.ADMIN_SUPABASE_USER_ID) {
		throw redirect(303, '/login');
	}

	return { user };
};
