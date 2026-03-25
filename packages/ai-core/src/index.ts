export const GENAI_BASE_URL = 'https://genai-gateway.agoda.is/v1';

export type TaskType =
	| 'lesson_generation'
	| 'conversation'
	| 'grammar_evaluation'
	| 'flashcard'
	| 'quiz'
	| 'summary'
	| 'code_switch';

export const MODEL_ROUTING: Record<TaskType, Record<string, string>> = {
	lesson_generation: { zh: 'gemini-3-flash-preview', te: 'gemini-3-flash-preview' },
	conversation: { zh: 'gpt-4o', te: 'gemini-3-flash-preview' },
	grammar_evaluation: { zh: 'claude-sonnet-4-6', te: 'claude-sonnet-4-6' },
	flashcard: { zh: 'gpt-4o-mini', te: 'gpt-4o-mini' },
	quiz: { zh: 'gpt-4o-mini', te: 'gpt-4o-mini' },
	summary: { zh: 'gpt-4o-mini', te: 'gpt-4o-mini' },
	code_switch: { zh: 'gpt-4o', te: 'gemini-3-flash-preview' }
};

export const STT_MODEL = 'gpt-4o-transcribe';
export const TTS_MODEL = 'gpt-4o-mini-tts';
export const TTS_VOICE = 'coral';

export const MAX_NEW_VOCAB_PER_SESSION: Record<string, number> = {
	A1: 5,
	A2: 7,
	B1: 10,
	B2: 12,
	C1: 15,
	C2: 20
};

export const SESSION_TIME_ALLOCATION = {
	vocabulary_tpr: 0.25,
	listening: 0.15,
	speaking: 0.3,
	srs_review: 0.2,
	cultural: 0.1
};

export const TTS_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

export type AIJobType =
	| 'lesson_generation'
	| 'quiz'
	| 'tts'
	| 'stt'
	| 'pronunciation_eval'
	| 'tone_detection'
	| 'conversation'
	| 'analysis'
	| 'code_switch'
	| 'prompt_translation'
	| 'language_test';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

export interface ChatOptions {
	temperature?: number;
	max_tokens?: number;
	stream?: boolean;
	onUsage?: (usage: { inputTokens: number; outputTokens: number; model: string }) => void;
}

export interface TranscriptionResult {
	text: string;
	language: string;
}
