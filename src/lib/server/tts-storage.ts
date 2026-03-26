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

export async function generateAndUploadTTS(word: string, language: string): Promise<string | null> {
	try {
		const normalizedLanguage = normalizeLanguage(language);
		const hash = generateHash(word);
		const path = generatePath(word, normalizedLanguage);
		const admin = getSupabaseAdmin();
		const bucket = admin.storage.from('tts-audio');

		const { data: files, error: listError } = await bucket.list(normalizedLanguage, {
			search: hash
		});
		if (listError) {
			console.error('TTS list check failed:', listError.message);
		} else {
			const exists = files?.some((file) => file.name === `${hash}.mp3`) ?? false;
			if (exists) {
				const { data } = bucket.getPublicUrl(path);
				return data.publicUrl;
			}
		}

		const audioBuffer = await getAIService().synthesize({ text: word });

		const { error } = await bucket.upload(path, audioBuffer, {
			contentType: 'audio/mpeg',
			cacheControl: '31536000',
			upsert: true
		});

		if (error) {
			console.error('TTS upload failed:', error.message);
			return null;
		}

		const { data } = bucket.getPublicUrl(path);
		return data.publicUrl;
	} catch (error) {
		console.error('TTS pre-generation failed:', error instanceof Error ? error.message : error);
		return null;
	}
}

export async function generateBatchTTS(
	items: Array<{ text: string; language: string }>
): Promise<Map<string, string>> {
	const results = new Map<string, string>();
	const settled = await Promise.allSettled(
		items.map(async ({ text, language }) => {
			const url = await generateAndUploadTTS(text, language);
			if (url) {
				results.set(text, url);
			}
		})
	);

	for (const result of settled) {
		if (result.status === 'rejected') {
			console.error('Batch TTS item failed:', result.reason);
		}
	}

	return results;
}
