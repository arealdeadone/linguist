import { createClient } from '@supabase/supabase-js';
import { env as publicEnv } from '$env/dynamic/public';
import { env } from '$env/dynamic/private';

let _adminClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdmin() {
	if (!_adminClient) {
		const secretKey = env.SUPABASE_SECRET_KEY;
		if (!secretKey) {
			throw new Error('SUPABASE_SECRET_KEY is required for admin operations');
		}

		_adminClient = createClient(publicEnv.PUBLIC_SUPABASE_URL, secretKey, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});
	}

	return _adminClient;
}
