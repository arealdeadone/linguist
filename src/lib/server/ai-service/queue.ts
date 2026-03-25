import type {
	AIService,
	AnalyzeConversationInput,
	ChatInput,
	ChatOutput,
	CodeSwitchInput,
	DetectTonesInput,
	DetectedSwitch,
	EvalPronunciationInput,
	GenerateLessonInput,
	GenerateQuizInput,
	LanguageTestInput,
	LanguageTestSummary,
	LessonPlan,
	PronunciationEvaluation,
	SynthesizeInput,
	ToneAnalysis,
	TranscribeInput,
	TranscriptionResult,
	TranslatePromptInput,
	ConversationAnalysis
} from '$lib/types';
import type { TutorPromptSections } from '$lib/server/prompts/types';
import { createJob, pollJobResult } from '$lib/server/data/ai-jobs';

function toRecord(input: object): Record<string, unknown> {
	return input as unknown as Record<string, unknown>;
}

export class QueueAIService implements AIService {
	private pollIntervalMs: number;
	private pollTimeoutMs: number;

	constructor(pollIntervalMs = 1000, pollTimeoutMs = 120000) {
		this.pollIntervalMs = pollIntervalMs;
		this.pollTimeoutMs = pollTimeoutMs;
	}

	private async submitAndWait<T>(
		jobType: string,
		input: Record<string, unknown>,
		learnerId?: string
	): Promise<T> {
		const job = await createJob({
			jobType,
			input,
			learnerId: learnerId ?? undefined
		});

		const completed = await pollJobResult(job.id, this.pollIntervalMs, this.pollTimeoutMs);

		if (completed.status === 'failed') {
			throw new Error(completed.error ?? 'AI job failed');
		}

		if (!completed.output) {
			throw new Error(`AI job ${job.id} completed without output`);
		}

		return completed.output as T;
	}

	async generateLesson(input: GenerateLessonInput): Promise<LessonPlan> {
		return this.submitAndWait('lesson_generation', toRecord(input), input.learnerId);
	}

	async generateQuiz(input: GenerateQuizInput): Promise<Record<string, unknown>> {
		return this.submitAndWait('quiz', toRecord(input), input.learnerId);
	}

	async synthesize(input: SynthesizeInput): Promise<Buffer> {
		const result = await this.submitAndWait<{ audio: string }>('tts', toRecord(input));
		if (typeof result.audio !== 'string') {
			throw new Error('AI tts job returned invalid audio payload');
		}
		return Buffer.from(result.audio, 'base64');
	}

	async transcribe(input: TranscribeInput): Promise<TranscriptionResult> {
		let audioBase64: string;
		if ('arrayBuffer' in input.audio && typeof input.audio.arrayBuffer === 'function') {
			const arrayBuffer = await input.audio.arrayBuffer();
			audioBase64 = Buffer.from(arrayBuffer).toString('base64');
		} else {
			audioBase64 = input.audio.toString('base64');
		}

		return this.submitAndWait('stt', {
			audioBase64,
			language: input.language
		});
	}

	async evaluatePronunciation(input: EvalPronunciationInput): Promise<PronunciationEvaluation> {
		return this.submitAndWait('pronunciation_eval', toRecord(input), input.learnerId);
	}

	async detectToneErrors(input: DetectTonesInput): Promise<ToneAnalysis> {
		return this.submitAndWait('tone_detection', toRecord(input), input.learnerId);
	}

	async chat(input: ChatInput): Promise<ChatOutput> {
		return this.submitAndWait('conversation', toRecord(input), input.learnerId);
	}

	async analyzeConversation(input: AnalyzeConversationInput): Promise<ConversationAnalysis> {
		return this.submitAndWait('analysis', toRecord(input), input.learnerId);
	}

	async detectCodeSwitches(input: CodeSwitchInput): Promise<DetectedSwitch[]> {
		return this.submitAndWait('code_switch', toRecord(input), input.learnerId);
	}

	async translatePromptSections(input: TranslatePromptInput): Promise<TutorPromptSections> {
		return this.submitAndWait('prompt_translation', toRecord(input));
	}

	async testLanguagePair(input: LanguageTestInput): Promise<LanguageTestSummary> {
		return this.submitAndWait('language_test', toRecord(input));
	}
}
