import { createHash } from 'crypto';
import { getAIService } from './ai-service';
import { getSupabaseAdmin } from './supabase-admin';

function generateHash(word: string): string {
	return createHash('sha256').update(word).digest('hex').slice(0, 16);
}

function normalizeLanguage(language: string): string {
	const normalized = language.trim().toLowerCase();
	return normalized.length > 0 ? normalized : 'unknown';
}

function generatePath(word: string, language: string): string {
	const hash = generateHash(word);
	return `${normalizeLanguage(language)}/${hash}.mp3`;
}

export async function generateAndUploadTTS(word: string, language: string): Promise<string> {
	const normalizedLanguage = normalizeLanguage(language);
	const hash = generateHash(word);
	const path = generatePath(word, normalizedLanguage);
	const admin = getSupabaseAdmin();
	const bucket = admin.storage.from('tts-audio');

	const { data: files, error: listError } = await bucket.list(normalizedLanguage, {
		search: hash
	});

	if (listError) {
		throw new Error(`TTS storage list failed for "${word}": ${listError.message}`);
	}

	const exists = files?.some((file) => file.name === `${hash}.mp3`) ?? false;
	if (exists) {
		const { data } = bucket.getPublicUrl(path);
		return data.publicUrl;
	}

	const audioBuffer = await getAIService().synthesize({ text: word });

	const { error } = await bucket.upload(path, audioBuffer, {
		contentType: 'audio/mpeg',
		cacheControl: '31536000',
		upsert: true
	});

	if (error) {
		throw new Error(`TTS upload failed for "${word}": ${error.message}`);
	}

	const { data } = bucket.getPublicUrl(path);
	return data.publicUrl;
}

export interface BatchTTSResult {
	urls: Map<string, string>;
	failures: Array<{ text: string; error: string }>;
}

export async function generateBatchTTS(
	items: Array<{ text: string; language: string }>
): Promise<BatchTTSResult> {
	const urls = new Map<string, string>();
	const failures: Array<{ text: string; error: string }> = [];

	const settled = await Promise.allSettled(
		items.map(async ({ text, language }) => {
			const url = await generateAndUploadTTS(text, language);
			urls.set(text, url);
		})
	);

	for (let i = 0; i < settled.length; i++) {
		const result = settled[i];
		if (result.status === 'rejected') {
			const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason);
			failures.push({ text: items[i].text, error: errorMsg });
			console.error(`TTS batch failure [${items[i].text}]:`, errorMsg);
		}
	}

	return { urls, failures };
}
