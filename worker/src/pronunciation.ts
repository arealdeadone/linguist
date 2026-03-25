import { chatJSON, AIError } from './ai';
import { trackUsage } from './cost-tracker';
import { getLanguageNames } from './data/languages';
import { detectToneErrors, type ToneError } from './tones';

export interface PronunciationCorrection {
	word: string;
	expected: string;
	got: string;
	issue: string;
}

export interface PronunciationEvaluation {
	score: number;
	correct: boolean;
	feedback: string;
	corrections: PronunciationCorrection[];
	toneErrors?: ToneError[];
}

const FALLBACK_FEEDBACK: Record<string, string> = {
	hi: 'उच्चारण का फिर से अभ्यास करें और धीरे-धीरे बोलें।',
	th: 'ลองฝึกออกเสียงอีกครั้งและพูดให้ช้าลงเล็กน้อย',
	en: 'Please practice again and speak more slowly.'
};

const SYSTEM_ERROR_FEEDBACK: Record<string, string> = {
	hi: '⚠️ प्रणाली त्रुटि — उच्चारण का मूल्यांकन नहीं हो सका। कृपया पुनः प्रयास करें।',
	th: '⚠️ ระบบขัดข้อง — ไม่สามารถประเมินการออกเสียงได้ กรุณาลองอีกครั้ง',
	en: '⚠️ System error — could not evaluate pronunciation. Please try again.'
};

function normalizeScore(score: number): number {
	if (!Number.isFinite(score)) return 0;
	return Math.max(0, Math.min(100, Math.round(score)));
}

function isCorrection(value: unknown): value is PronunciationCorrection {
	if (typeof value !== 'object' || value === null) return false;

	const item = value as Record<string, unknown>;
	return (
		typeof item.word === 'string' &&
		typeof item.expected === 'string' &&
		typeof item.got === 'string' &&
		typeof item.issue === 'string'
	);
}

function normalizeEvaluation(
	raw: Partial<PronunciationEvaluation> | null | undefined,
	lessonLanguage: string
): PronunciationEvaluation {
	const score = normalizeScore(raw?.score ?? 0);
	const corrections = Array.isArray(raw?.corrections)
		? raw.corrections.filter((item) => isCorrection(item))
		: [];

	const feedback =
		typeof raw?.feedback === 'string' && raw.feedback.trim().length > 0
			? raw.feedback.trim()
			: (FALLBACK_FEEDBACK[lessonLanguage] ?? FALLBACK_FEEDBACK.hi);

	const correct =
		typeof raw?.correct === 'boolean' ? raw.correct : score >= 90 && corrections.length === 0;

	return {
		score,
		correct,
		feedback,
		corrections
	};
}

export async function evaluatePronunciation(
	transcript: string,
	expected: string,
	language: string,
	lessonLanguage: string,
	learnerId?: string
): Promise<PronunciationEvaluation> {
	const languageNames = await getLanguageNames();
	const targetLanguageName = languageNames[language] ?? language;
	const lessonLanguageName = languageNames[lessonLanguage] ?? lessonLanguage;

	const messages = [
		{
			role: 'system' as const,
			content: `You evaluate spoken language pronunciation.

Target language: ${targetLanguageName}
Feedback language: ${lessonLanguageName}

Instructions:
1. Compare the transcript with the expected phrase.
2. Evaluate missing words, wrong words, substitutions, and likely pronunciation issues.
3. Return STRICT JSON with this shape:
{
  "score": number,
  "correct": boolean,
  "feedback": "string in ${lessonLanguageName}",
  "corrections": [
    {
      "word": "string",
      "expected": "string",
      "got": "string",
      "issue": "string in ${lessonLanguageName}"
    }
  ]
}
4. score must be 0-100.
5. feedback and issue fields must be ONLY in ${lessonLanguageName}. Never use English unless ${lessonLanguageName} is English.
6. If transcript matches expected with minor punctuation differences, score high and use empty corrections.`
		},
		{
			role: 'user' as const,
			content: `Expected phrase:\n${expected}\n\nLearner transcript:\n${transcript}`
		}
	];

	let result: PronunciationEvaluation;
	try {
		result = await chatJSON<PronunciationEvaluation>(messages, 'grammar_evaluation', language, {
			temperature: 0.1,
			max_tokens: 450,
			onUsage: (u) =>
				trackUsage({
					learnerId,
					task: 'grammar_evaluation',
					...u
				}).catch(console.error)
		});
	} catch (e) {
		if (e instanceof AIError) {
			return {
				score: -1,
				correct: false,
				feedback: SYSTEM_ERROR_FEEDBACK[lessonLanguage] ?? SYSTEM_ERROR_FEEDBACK.en,
				corrections: [],
				systemError: true
			} as PronunciationEvaluation & { systemError: boolean };
		}
		throw e;
	}
	const normalized = normalizeEvaluation(result, lessonLanguage);

	if (language !== 'zh') {
		return normalized;
	}

	const toneAnalysis = await detectToneErrors(transcript, expected, language, learnerId);

	return {
		...normalized,
		toneErrors: toneAnalysis.toneErrors
	};
}
