export type { CefrLevel } from './lesson';

export type SupportedLanguage = string;

export type TaskType =
	| 'lesson_generation'
	| 'conversation'
	| 'grammar_evaluation'
	| 'flashcard'
	| 'quiz'
	| 'summary'
	| 'code_switch';

export interface ModelSelection {
	model: string;
	task: TaskType;
	language: string;
}

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
