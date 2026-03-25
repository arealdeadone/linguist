import { db } from '../db';
import { languages } from '../schema';

let languageCache: Record<string, string> | null = null;

function normalizeCode(code: string): string {
	return code.trim().toLowerCase();
}

function normalizeName(name: string): string {
	return name.trim();
}

export async function getAllLanguages(): Promise<Array<{ code: string; name: string }>> {
	const rows = await db
		.select({ code: languages.code, name: languages.name })
		.from(languages)
		.orderBy(languages.code);

	return rows;
}

export async function getLanguageName(code: string): Promise<string> {
	const normalizedCode = normalizeCode(code);
	if (!normalizedCode) return code;

	const names = await getLanguageNames();
	return names[normalizedCode] ?? normalizedCode;
}

export async function upsertLanguage(code: string, name: string): Promise<void> {
	const normalizedCode = normalizeCode(code);
	const normalizedName = normalizeName(name);

	await db
		.insert(languages)
		.values({
			code: normalizedCode,
			name: normalizedName
		})
		.onConflictDoUpdate({
			target: languages.code,
			set: {
				name: normalizedName
			}
		});

	invalidateLanguageCache();
}

export async function getLanguageNames(): Promise<Record<string, string>> {
	if (languageCache) return languageCache;

	const rows = await db.select({ code: languages.code, name: languages.name }).from(languages);
	languageCache = Object.fromEntries(rows.map((row) => [row.code, row.name]));

	return languageCache;
}

export function invalidateLanguageCache(): void {
	languageCache = null;
}
