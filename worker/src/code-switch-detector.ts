import { chatJSON } from './ai';
import { trackUsage } from './cost-tracker';
import { getLanguageNames } from './data/languages';

export interface DetectedSwitch {
	gapWord: string;
	targetEquiv: string;
	context: string;
}

interface CodeSwitchResponse {
	switches?: unknown;
}

function isDetectedSwitch(value: unknown): value is DetectedSwitch {
	if (typeof value !== 'object' || value === null) return false;

	const item = value as Record<string, unknown>;
	return (
		typeof item.gapWord === 'string' &&
		typeof item.targetEquiv === 'string' &&
		typeof item.context === 'string'
	);
}

export async function detectCodeSwitches(
	message: string,
	targetLanguage: string,
	lessonLanguage: string,
	learnerId?: string
): Promise<DetectedSwitch[]> {
	if (!message.trim()) return [];

	const languageNames = await getLanguageNames();
	const targetLanguageName = languageNames[targetLanguage] ?? targetLanguage;
	const lessonLanguageName = languageNames[lessonLanguage] ?? lessonLanguage;

	try {
		const response = await chatJSON<CodeSwitchResponse>(
			[
				{
					role: 'system',
					content: `Analyze this message for code-switching. The learner is learning ${targetLanguageName} and their instruction language is ${lessonLanguageName}. Identify any words from ${lessonLanguageName} used in place of ${targetLanguageName} words.

Return STRICT JSON with this shape:
{
  "switches": [
    {
      "gapWord": "word from ${lessonLanguageName}",
      "targetEquiv": "best equivalent in ${targetLanguageName}",
      "context": "short snippet from original message"
    }
  ]
}

Rules:
- Include only clear substitutions (not proper nouns).
- Keep gapWord and context exactly as used by learner when possible.
- If none found, return an empty switches array.
- Output JSON only.`
				},
				{ role: 'user', content: message }
			],
			'code_switch',
			targetLanguage,
			{
				temperature: 0.1,
				max_tokens: 350,
				onUsage: (u) =>
					trackUsage({
						learnerId,
						task: 'code_switch',
						...u
					}).catch(console.error)
			}
		);

		return Array.isArray(response.switches)
			? response.switches.filter((item) => isDetectedSwitch(item))
			: [];
	} catch (e) {
		console.error('[code-switch] Detection failed:', e instanceof Error ? e.message : e);
		return [];
	}
}
