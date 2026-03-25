import { chatJSON } from './ai';
import { trackUsage } from './cost-tracker';

export interface ToneError {
	expected: string;
	got: string;
	pinyin: string;
	expectedTone: number;
	actualTone: number;
}

export interface ToneAnalysis {
	toneErrors: ToneError[];
	hasToneErrors: boolean;
}

interface ToneResponse {
	toneErrors?: unknown;
}

function isToneNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5;
}

function isToneError(value: unknown): value is ToneError {
	if (typeof value !== 'object' || value === null) return false;

	const item = value as Record<string, unknown>;
	return (
		typeof item.expected === 'string' &&
		typeof item.got === 'string' &&
		typeof item.pinyin === 'string' &&
		isToneNumber(item.expectedTone) &&
		isToneNumber(item.actualTone)
	);
}

const EMPTY_ANALYSIS: ToneAnalysis = {
	toneErrors: [],
	hasToneErrors: false
};

export async function detectToneErrors(
	transcript: string,
	expected: string,
	language: string,
	learnerId?: string
): Promise<ToneAnalysis> {
	if (language !== 'zh') return EMPTY_ANALYSIS;

	try {
		const response = await chatJSON<ToneResponse>(
			[
				{
					role: 'system',
					content: `Compare these two Chinese texts character by character. Identify characters where the learner used a different tone of the same pinyin base (homophones).

Return STRICT JSON with this shape:
{
  "toneErrors": [
    {
      "expected": "single expected Chinese character",
      "got": "single spoken/transcribed Chinese character",
      "pinyin": "base pinyin with tone marks or tone number",
      "expectedTone": number from 1-5,
      "actualTone": number from 1-5
    }
  ]
}

Rules:
- Only include true tone-level confusions with the same pinyin base.
- Do not include unrelated substitutions.
- If there are no tone errors, return an empty toneErrors array.
- Output JSON only.`
				},
				{
					role: 'user',
					content: `Expected:\n${expected}\n\nLearner transcript:\n${transcript}`
				}
			],
			'grammar_evaluation',
			language,
			{
				temperature: 0.1,
				max_tokens: 350,
				onUsage: (u) =>
					trackUsage({
						learnerId,
						task: 'grammar_evaluation',
						...u
					}).catch(console.error)
			}
		);

		const toneErrors = Array.isArray(response.toneErrors)
			? response.toneErrors.filter((item) => isToneError(item))
			: [];

		return {
			toneErrors,
			hasToneErrors: toneErrors.length > 0
		};
	} catch (e) {
		console.error('[tones] Tone detection failed:', e instanceof Error ? e.message : e);
		return EMPTY_ANALYSIS;
	}
}
