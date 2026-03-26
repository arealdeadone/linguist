import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { testLanguagePairStreaming } from '$lib/server/language-tester';
import { createJob, getJobById } from '$lib/server/data/ai-jobs';
import type { LanguageTestSummary } from '$lib/types';

interface LanguageTestRequest {
	targetLanguage?: string;
	sourceLanguage?: string;
	targetLanguageName?: string;
	sourceLanguageName?: string;
	testCount?: number;
}

function sseEvent(data: Record<string, unknown>): string {
	return `data: ${JSON.stringify(data)}\n\n`;
}

function streamFromLocalMode(
	targetLanguage: string,
	sourceLanguage: string,
	targetLanguageName: string,
	sourceLanguageName: string,
	testCount: number
): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();

	return new ReadableStream({
		async start(controller) {
			try {
				const generator = testLanguagePairStreaming(
					targetLanguage,
					sourceLanguage,
					targetLanguageName,
					sourceLanguageName,
					testCount
				);

				for await (const update of generator) {
					controller.enqueue(encoder.encode(sseEvent({ event: update.event, ...update.data })));
				}
			} catch (error) {
				const msg = error instanceof Error ? error.message : 'Test failed';
				controller.enqueue(encoder.encode(sseEvent({ event: 'error', message: msg })));
			} finally {
				controller.close();
			}
		}
	});
}

function streamFromQueueMode(
	targetLanguage: string,
	sourceLanguage: string,
	targetLanguageName: string,
	sourceLanguageName: string,
	testCount: number
): ReadableStream<Uint8Array> {
	const encoder = new TextEncoder();

	return new ReadableStream({
		async start(controller) {
			try {
				controller.enqueue(
					encoder.encode(sseEvent({ event: 'status', message: 'Submitting to worker...' }))
				);

				const job = await createJob({
					jobType: 'language_test',
					input: {
						targetLanguage,
						sourceLanguage,
						targetLanguageName,
						sourceLanguageName,
						testCount
					}
				});

				controller.enqueue(
					encoder.encode(sseEvent({ event: 'status', message: 'Worker processing...' }))
				);

				const deadline = Date.now() + 180_000;
				let completed = false;

				while (Date.now() < deadline) {
					const current = await getJobById(job.id);
					if (!current) throw new Error('Job disappeared');

					if (current.status === 'failed') {
						throw new Error(current.error ?? 'Worker job failed');
					}

					if (current.status === 'completed') {
						if (!current.output) throw new Error('Job completed without output');

						const summary = current.output as unknown as LanguageTestSummary;

						controller.enqueue(
							encoder.encode(sseEvent({ event: 'sentences', total: summary.results.length }))
						);

						for (let i = 0; i < summary.results.length; i++) {
							controller.enqueue(
								encoder.encode(sseEvent({ event: 'result', index: i, result: summary.results[i] }))
							);
						}

						controller.enqueue(encoder.encode(sseEvent({ event: 'complete', ...summary })));
						completed = true;
						break;
					}

					await new Promise((resolve) => setTimeout(resolve, 2000));
				}

				if (!completed) {
					throw new Error('Language test timed out after 3 minutes');
				}
			} catch (error) {
				const msg = error instanceof Error ? error.message : 'Test failed';
				controller.enqueue(encoder.encode(sseEvent({ event: 'error', message: msg })));
			} finally {
				controller.close();
			}
		}
	});
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as LanguageTestRequest;

		if (!body.targetLanguage?.trim()) {
			return json({ error: 'targetLanguage code is required' }, { status: 400 });
		}
		if (!body.sourceLanguage?.trim()) {
			return json({ error: 'sourceLanguage code is required' }, { status: 400 });
		}

		const targetLanguage = body.targetLanguage.trim();
		const sourceLanguage = body.sourceLanguage.trim();
		const targetLanguageName = body.targetLanguageName?.trim() || targetLanguage;
		const sourceLanguageName = body.sourceLanguageName?.trim() || sourceLanguage;
		const testCount = Math.floor(Math.min(Math.max(body.testCount ?? 5, 1), 10));

		const isQueue = (env.AI_MODE ?? 'local') === 'queue';

		const stream = isQueue
			? streamFromQueueMode(
					targetLanguage,
					sourceLanguage,
					targetLanguageName,
					sourceLanguageName,
					testCount
				)
			: streamFromLocalMode(
					targetLanguage,
					sourceLanguage,
					targetLanguageName,
					sourceLanguageName,
					testCount
				);

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	} catch (error) {
		const msg = error instanceof Error ? error.message : 'Test failed';
		return json({ error: msg }, { status: 500 });
	}
};
