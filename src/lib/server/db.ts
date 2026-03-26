import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

type DB = PostgresJsDatabase<typeof schema>;

let _db: DB | null = null;

function createDb(): DB {
	const isPooler = env.DATABASE_URL?.includes('pooler.supabase.com');
	const isSupabase = env.DATABASE_URL?.includes('supabase.com');

	const client = postgres(env.DATABASE_URL, {
		prepare: !isPooler,
		idle_timeout: 20,
		max: isPooler ? 1 : 10,
		ssl: isSupabase ? 'require' : undefined,
		connect_timeout: 30,
		connection: {
			application_name: 'linguist'
		}
	});

	return drizzle(client, { schema });
}

export const db: DB = new Proxy({} as DB, {
	get(_target, prop, receiver) {
		if (!_db) _db = createDb();
		return Reflect.get(_db, prop, receiver);
	}
});
