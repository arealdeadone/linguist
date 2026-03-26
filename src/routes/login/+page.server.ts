import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions: Actions = {
	login: async ({ request, locals: { supabase } }) => {
		const formData = await request.formData();
		const email = formData.get('email');
		const password = formData.get('password');

		if (typeof email !== 'string' || typeof password !== 'string') {
			return fail(400, { error: 'Email and password are required.' });
		}

		if (!email.trim() || !password.trim()) {
			return fail(400, { error: 'Email and password are required.' });
		}

		const { error } = await supabase.auth.signInWithPassword({
			email: email.trim(),
			password: password.trim()
		});

		if (error) {
			return fail(400, { error: error.message, email: email.trim() });
		}

		throw redirect(303, '/');
	},
	logout: async ({ locals: { supabase } }) => {
		await supabase.auth.signOut();
		throw redirect(303, '/login');
	}
};
