import type { TutorPromptSections } from './prompts/types';
import type { TaskType, TranscriptionResult, CefrLevel } from '@linguist/ai-core';

export interface ChatOutput {
	response: string;
	conversationId: string;
}

export interface GenerateLessonInput {
	learnerId: string;
	week: number;
	day: number;
	theme?: string;
}

export interface GenerateQuizInput {
	learnerId: string;
	lessonId?: string;
	quizType: 'multiple_choice' | 'fill_in_blank' | 'matching';
	cefrLevel?: CefrLevel;
}

export interface SynthesizeInput {
	text: string;
	instructions?: string;
	voice?: string;
}

export interface TranscribeInput {
	audio: Buffer | File;
	language: string;
}

export interface EvalPronunciationInput {
	transcript: string;
	expected: string;
	language: string;
	lessonLanguage: string;
	learnerId?: string;
}

export interface DetectTonesInput {
	transcript: string;
	expected: string;
	language: string;
	learnerId?: string;
}

export interface ChatInput {
	learnerId: string;
	message: string;
	conversationId?: string;
	scenario?: string;
}

export interface AnalyzeConversationInput {
	conversationId: string;
	learnerId: string;
}

export interface CodeSwitchInput {
	message: string;
	targetLanguage: string;
	lessonLanguage: string;
	learnerId?: string;
}

export interface TranslatePromptInput {
	targetLanguageCode: string;
	targetLanguageName: string;
}

export interface LanguageTestInput {
	targetLanguage: string;
	sourceLanguage: string;
	targetLanguageName: string;
	sourceLanguageName: string;
	testCount: number;
	modelRouting?: Record<string, string>;
}

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
	systemError?: boolean;
}

export interface DetectedSwitch {
	gapWord: string;
	targetEquiv: string;
	context: string;
}

export interface Message {
	role: 'system' | 'user' | 'assistant';
	content: string;
	timestamp?: Date;
	audio_url?: string;
}

export interface ConversationAnalysis {
	words_used_correctly: string[];
	words_used_incorrectly: Array<{
		word: string;
		error: string;
		correction: string;
	}>;
	code_switches: Array<{
		turn: number;
		learner_said: string;
		gap_word: string;
		target_equivalent: string | null;
		times_used: number;
		auto_promoted: boolean;
	}>;
	new_patterns_demonstrated: string[];
	srs_updates: Array<{
		word: string;
		quality: number;
	}>;
	suggested_focus_next_session: string;
}

export interface Activity {
	type: 'listening' | 'vocabulary_tpr' | 'conversation' | 'srs_review' | 'quiz' | 'speaking';
	duration_min: number;
	data?: Record<string, unknown>;
}

export interface VocabTarget {
	word: string;
	romanization: string;
	meaning: string;
	scene_description: string;
}

export interface LessonPlan {
	id: string;
	cefr_level: CefrLevel;
	week: number;
	day: number;
	theme: string;
	duration_minutes: number;
	learning_objectives: string[];
	vocabulary_targets: VocabTarget[];
	review_words: string[];
	activities: Activity[];
	colloquial_phrase: string;
	cultural_note: string;
}

export interface LanguageTestResult {
	sentence: string;
	ttsLatencyMs: number;
	sttLatencyMs: number;
	evalLatencyMs: number;
	sttTranscript: string;
	evalScore: number;
	evalFeedback: string;
	roundTripSuccess: boolean;
}

export interface LanguageTestSummary {
	results: LanguageTestResult[];
	averageScore: number;
	successRate: number;
	averageLatencyMs: number;
	recommendation: 'viable' | 'marginal' | 'not_viable';
	reasoning: string;
	agentAnalysis: string;
	modelRouting: Record<TaskType, string>;
}

export interface AIService {
	generateLesson(input: GenerateLessonInput): Promise<LessonPlan>;
	generateQuiz(input: GenerateQuizInput): Promise<Record<string, unknown>>;
	synthesize(input: SynthesizeInput): Promise<Buffer>;
	transcribe(input: TranscribeInput): Promise<TranscriptionResult>;
	evaluatePronunciation(input: EvalPronunciationInput): Promise<PronunciationEvaluation>;
	detectToneErrors(input: DetectTonesInput): Promise<ToneAnalysis>;
	chat(input: ChatInput): Promise<ChatOutput>;
	analyzeConversation(input: AnalyzeConversationInput): Promise<ConversationAnalysis>;
	detectCodeSwitches(input: CodeSwitchInput): Promise<DetectedSwitch[]>;
	translatePromptSections(input: TranslatePromptInput): Promise<TutorPromptSections>;
	testLanguagePair(input: LanguageTestInput): Promise<LanguageTestSummary>;
}
