import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from './config';
import * as schema from './schema';

const isPooler = config.databaseUrl.includes('pooler.supabase.com');
const isSupabase = config.databaseUrl.includes('supabase.com');

const client = postgres(config.databaseUrl, {
	prepare: !isPooler,
	ssl: isSupabase ? 'require' : undefined,
	connect_timeout: 30,
	idle_timeout: 20,
	max: 3,
	connection: { application_name: 'linguist-worker' },
	onnotice: () => {}
});

export const db = drizzle(client, { schema, logger: false });
