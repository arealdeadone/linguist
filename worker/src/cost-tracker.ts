import { insertUsageLog } from './data/ai-usage';

const MODEL_PRICING: Record<string, { input: number; output: number }> = {
	'gpt-4o': { input: 2.5, output: 10 },
	'gpt-4o-mini': { input: 0.15, output: 0.6 },
	'gpt-4o-mini-tts': { input: 0.6, output: 12 },
	'gpt-4o-transcribe': { input: 2.5, output: 10 },
	'claude-sonnet-4-6': { input: 3, output: 15 },
	'gemini-3-flash-preview': { input: 0.5, output: 3 }
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
	const rates = MODEL_PRICING[model] ?? { input: 1, output: 1 };
	return (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
}

export interface TrackUsageParams {
	learnerId?: string;
	task: string;
	model: string;
	inputTokens: number;
	outputTokens: number;
	durationMs?: number;
	metadata?: Record<string, unknown>;
}

export async function trackUsage(params: TrackUsageParams): Promise<void> {
	const costUsd = calculateCost(params.model, params.inputTokens, params.outputTokens);
	await insertUsageLog({
		learnerId: params.learnerId,
		task: params.task,
		model: params.model,
		inputTokens: params.inputTokens,
		outputTokens: params.outputTokens,
		costUsd,
		durationMs: params.durationMs,
		metadata: params.metadata
	});
}
