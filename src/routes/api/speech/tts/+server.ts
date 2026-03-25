import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { getAIService } from '$lib/server/ai-service';
import { trackUsage } from '$lib/server/cost-tracker';
import { cacheTTS, getCachedTTS } from '$lib/server/redis';
import { TTS_MODEL, TTS_VOICE } from '$lib/constants';

function isChinese(text: string): boolean {
	return /[\u4e00-\u9fff]/.test(text);
}

function defaultInstructions(text: string): string {
	if (isChinese(text)) {
		return 'Speak this Chinese Mandarin text clearly and naturally with correct tones. Pronounce each character accurately.';
	}
	if (/[\u0c00-\u0c7f]/.test(text)) {
		return 'Speak this Telugu text clearly and naturally with proper pronunciation.';
	}
	if (/[\u0900-\u097f]/.test(text)) {
		return 'Speak this Hindi text clearly and naturally.';
	}
	if (/[\u0e00-\u0e7f]/.test(text)) {
		return 'Speak this Thai text clearly and naturally.';
	}
	return '';
}

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { text, voice, instructions } = body;

	if (!text) return json({ error: 'text required' }, { status: 400 });

	const selectedVoice = voice ?? TTS_VOICE;
	const ttsInstructions = instructions || defaultInstructions(text);

	const cached = await getCachedTTS(text, selectedVoice, TTS_MODEL);
	if (cached) {
		return new Response(new Uint8Array(cached), {
			headers: {
				'Content-Type': 'audio/mpeg',
				'Cache-Control': 'public, max-age=604800',
				'X-Cache': 'HIT'
			}
		});
	}

	const audio = await getAIService().synthesize({
		text,
		instructions: ttsInstructions || undefined,
		voice: selectedVoice
	});
	const estimatedInput = Math.ceil(text.length / 4);
	const estimatedOutput = Math.ceil(text.length / 4) * 3;
	trackUsage({
		task: 'tts',
		model: TTS_MODEL,
		inputTokens: estimatedInput,
		outputTokens: estimatedOutput
	}).catch(console.error);

	cacheTTS(text, selectedVoice, TTS_MODEL, audio).catch((e) =>
		console.error('TTS cache failed:', e)
	);

	return new Response(new Uint8Array(audio), {
		headers: {
			'Content-Type': 'audio/mpeg',
			'Cache-Control': 'public, max-age=604800',
			'X-Cache': 'MISS'
		}
	});
};
