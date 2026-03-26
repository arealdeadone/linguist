import { readFileSync } from 'fs';
import postgres from 'postgres';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

function loadEnv() {
	const envFiles = ['.env.local', '.env'];
	for (const file of envFiles) {
		try {
			const content = readFileSync(file, 'utf-8');
			for (const line of content.split('\n')) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith('#')) continue;
				const eqIdx = trimmed.indexOf('=');
				if (eqIdx === -1) continue;
				const key = trimmed.slice(0, eqIdx);
				const val = trimmed.slice(eqIdx + 1);
				if (!process.env[key]) process.env[key] = val;
			}
			break;
		} catch {
			continue;
		}
	}
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
const GENAI_API_KEY = process.env.GENAI_API_KEY || process.env.AGODA_GENAI_API_KEY;
const GENAI_BASE_URL = process.env.GENAI_BASE_URL || 'https://api.openai.com/v1';
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!DATABASE_URL || !GENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SECRET_KEY) {
	console.error('Missing required env vars: DATABASE_URL, GENAI_API_KEY, PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY');
	process.exit(1);
}

const sql = postgres(DATABASE_URL);
const openai = new OpenAI({ apiKey: GENAI_API_KEY, baseURL: GENAI_BASE_URL });
const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
	auth: { autoRefreshToken: false, persistSession: false }
});

function generatePath(word: string, language: string): string {
	const hash = createHash('sha256').update(word).digest('hex').slice(0, 16);
	return `${language}/${hash}.mp3`;
}

async function generateTTS(text: string): Promise<Buffer> {
	const response = await openai.audio.speech.create({
		model: 'gpt-4o-mini-tts',
		voice: 'coral',
		input: text
	});
	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
}

async function uploadAndGetUrl(word: string, language: string, audio: Buffer): Promise<string> {
	const path = generatePath(word, language);
	const bucket = supabase.storage.from('tts-audio');

	const { error } = await bucket.upload(path, audio, {
		contentType: 'audio/mpeg',
		cacheControl: '31536000',
		upsert: true
	});

	if (error) throw new Error(`Upload failed for "${word}": ${error.message}`);

	const { data } = bucket.getPublicUrl(path);
	return data.publicUrl;
}

async function main() {
	console.log('🔊 Backfilling TTS audio for existing vocabulary...\n');

	const rows = await sql`
		SELECT v.id, v.word, l.target_language
		FROM vocabulary v
		JOIN learners l ON v.learner_id = l.id
		WHERE v.audio_url IS NULL
		ORDER BY l.target_language, v.word
	`;

	console.log(`Found ${rows.length} words without audio\n`);

	let success = 0;
	let failed = 0;

	for (const row of rows) {
		const { id, word, target_language } = row;
		try {
			process.stdout.write(`  ${target_language} "${word}" ... `);
			const audio = await generateTTS(word);
			const url = await uploadAndGetUrl(word, target_language, audio);
			await sql`UPDATE vocabulary SET audio_url = ${url} WHERE id = ${id}`;
			console.log(`✅ ${url.split('/').pop()}`);
			success++;
		} catch (e) {
			console.log(`❌ ${e instanceof Error ? e.message : e}`);
			failed++;
		}
	}

	console.log(`\n✅ Done: ${success} uploaded, ${failed} failed`);

	console.log('\n📝 Updating lesson plans with audio URLs...\n');
	const lessons = await sql`
		SELECT l.id, l.plan, lr.target_language
		FROM lessons l
		JOIN learners lr ON l.learner_id = lr.id
	`;

	for (const lesson of lessons) {
		const plan = lesson.plan as Record<string, unknown>;
		const vocabTargets = (plan.vocabulary_targets ?? []) as Array<Record<string, unknown>>;
		let updated = false;

		for (const vt of vocabTargets) {
			if (vt.audioUrl) continue;
			const word = vt.word as string;
			const vocabRow = await sql`
				SELECT audio_url FROM vocabulary
				WHERE word = ${word}
				AND learner_id = (SELECT learner_id FROM lessons WHERE id = ${lesson.id})
				LIMIT 1
			`;
			if (vocabRow[0]?.audio_url) {
				vt.audioUrl = vocabRow[0].audio_url;
				updated = true;
			}
		}

		if (updated) {
			plan.vocabulary_targets = vocabTargets;
			await sql`UPDATE lessons SET plan = ${JSON.stringify(plan)}::jsonb WHERE id = ${lesson.id}`;
			console.log(`  Updated lesson ${(lesson.id as string).slice(0, 8)}`);
		}
	}

	console.log('\n🎉 Backfill complete');
	await sql.end();
}

main().catch((e) => {
	console.error('Fatal:', e);
	process.exit(1);
});
