import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAIService } from '$lib/server/ai-service';
import { trackUsage } from '$lib/server/cost-tracker';
import { STT_MODEL } from '$lib/constants';

export const POST: RequestHandler = async ({ request }) => {
	const contentType = request.headers.get('content-type') ?? '';

	let language = 'zh';

	try {
		if (contentType.includes('multipart/form-data')) {
			const formData = await request.formData();
			const file = formData.get('audio') as File | null;
			language = (formData.get('language') as string) ?? 'zh';

			if (!file) return json({ error: 'audio file required' }, { status: 400 });
			if (file.size > 25 * 1024 * 1024)
				return json({ error: 'File too large (max 25MB)' }, { status: 413 });
			if (file.size === 0) return json({ error: 'Empty audio file' }, { status: 400 });

			const result = await getAIService().transcribe({ audio: file, language });
			const estimatedInput = Math.ceil(file.size / 32);
			const estimatedOutput = Math.ceil(result.text.length / 4);
			trackUsage({
				task: 'stt',
				model: STT_MODEL,
				inputTokens: estimatedInput,
				outputTokens: estimatedOutput
			}).catch(console.error);
			return json(result);
		} else {
			const langHeader = request.headers.get('x-language') ?? 'zh';
			language = langHeader;
			const audioBuffer = Buffer.from(await request.arrayBuffer());

			if (audioBuffer.length === 0) return json({ error: 'Empty audio' }, { status: 400 });
			if (audioBuffer.length > 25 * 1024 * 1024)
				return json({ error: 'File too large (max 25MB)' }, { status: 413 });

			const result = await getAIService().transcribe({ audio: audioBuffer, language });
			const estimatedInput = Math.ceil(audioBuffer.length / 32);
			const estimatedOutput = Math.ceil(result.text.length / 4);
			trackUsage({
				task: 'stt',
				model: STT_MODEL,
				inputTokens: estimatedInput,
				outputTokens: estimatedOutput
			}).catch(console.error);
			return json(result);
		}
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Transcription failed';
		console.error('STT error:', msg);
		return json({ error: msg }, { status: 500 });
	}
};
