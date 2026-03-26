import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

const isPooler = env.DATABASE_URL?.includes('pooler.supabase.com');
const isSupabase = env.DATABASE_URL?.includes('supabase.com');

const client = postgres(env.DATABASE_URL, {
	prepare: !isPooler,
	idle_timeout: 20,
	max: isPooler ? 1 : 10,
	ssl: isSupabase ? 'require' : undefined,
	connection: {
		application_name: 'linguist'
	}
});

export const db = drizzle(client, { schema });
