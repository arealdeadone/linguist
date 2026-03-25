import type { AIJobType } from '@linguist/ai-core';
import { LocalAIService } from './local-ai-service';

interface JobRow {
	id: string;
	jobType: string;
	input: Record<string, unknown>;
	learnerId: string | null;
}

const ai = new LocalAIService();

function requireString(value: unknown, field: string): string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		throw new Error(`Missing or invalid ${field}`);
	}
	return value;
}

function optionalString(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

export async function processJob(job: JobRow): Promise<Record<string, unknown>> {
	const jobType = job.jobType as AIJobType;

	switch (jobType) {
		case 'lesson_generation':
			return processLessonGeneration(job);
		case 'quiz':
			return processQuizGeneration(job);
		case 'tts':
			return processTTS(job);
		case 'stt':
			return processSTT(job);
		case 'pronunciation_eval':
			return processPronunciation(job);
		case 'tone_detection':
			return processToneDetection(job);
		case 'conversation':
			return processConversation(job);
		case 'analysis':
			return processAnalysis(job);
		case 'code_switch':
			return processCodeSwitch(job);
		case 'prompt_translation':
			return processPromptTranslation(job);
		case 'language_test':
			return processLanguageTest(job);
		default:
			throw new Error(`Unknown job type: ${jobType}`);
	}
}

async function processLessonGeneration(job: JobRow): Promise<Record<string, unknown>> {
	const learnerId = job.learnerId ?? requireString(job.input.learnerId, 'learnerId');
	const result = await ai.generateLesson({
		learnerId,
		week: Number(job.input.week),
		day: Number(job.input.day),
		theme: optionalString(job.input.theme)
	});
	return result as unknown as Record<string, unknown>;
}

async function processQuizGeneration(job: JobRow): Promise<Record<string, unknown>> {
	const learnerId = job.learnerId ?? requireString(job.input.learnerId, 'learnerId');
	return ai.generateQuiz({
		learnerId,
		lessonId: optionalString(job.input.lessonId),
		quizType: requireString(job.input.quizType, 'quizType') as
			| 'multiple_choice'
			| 'fill_in_blank'
			| 'matching',
		cefrLevel: optionalString(job.input.cefrLevel) as
			| 'A1'
			| 'A2'
			| 'B1'
			| 'B2'
			| 'C1'
			| 'C2'
			| undefined
	});
}

async function processTTS(job: JobRow): Promise<Record<string, unknown>> {
	const audio = await ai.synthesize({
		text: requireString(job.input.text, 'text'),
		instructions: optionalString(job.input.instructions),
		voice: optionalString(job.input.voice)
	});
	return { audio: audio.toString('base64') };
}

async function processSTT(job: JobRow): Promise<Record<string, unknown>> {
	const audioBase64 = requireString(job.input.audioBase64, 'audioBase64');
	const audio = Buffer.from(audioBase64, 'base64');
	const result = await ai.transcribe({
		audio,
		language: requireString(job.input.language, 'language')
	});
	return result as unknown as Record<string, unknown>;
}

async function processPronunciation(job: JobRow): Promise<Record<string, unknown>> {
	const result = await ai.evaluatePronunciation({
		transcript: requireString(job.input.transcript, 'transcript'),
		expected: requireString(job.input.expected, 'expected'),
		language: requireString(job.input.language, 'language'),
		lessonLanguage: requireString(job.input.lessonLanguage, 'lessonLanguage'),
		learnerId: job.learnerId ?? optionalString(job.input.learnerId)
	});
	return result as unknown as Record<string, unknown>;
}

async function processToneDetection(job: JobRow): Promise<Record<string, unknown>> {
	const result = await ai.detectToneErrors({
		transcript: requireString(job.input.transcript, 'transcript'),
		expected: requireString(job.input.expected, 'expected'),
		language: requireString(job.input.language, 'language'),
		learnerId: job.learnerId ?? optionalString(job.input.learnerId)
	});
	return result as unknown as Record<string, unknown>;
}

async function processConversation(job: JobRow): Promise<Record<string, unknown>> {
	const learnerId = job.learnerId ?? requireString(job.input.learnerId, 'learnerId');
	const result = await ai.chat({
		learnerId,
		message: requireString(job.input.message, 'message'),
		conversationId: optionalString(job.input.conversationId),
		scenario: optionalString(job.input.scenario)
	});
	return result as unknown as Record<string, unknown>;
}

async function processAnalysis(job: JobRow): Promise<Record<string, unknown>> {
	const learnerId = job.learnerId ?? requireString(job.input.learnerId, 'learnerId');
	const result = await ai.analyzeConversation({
		conversationId: requireString(job.input.conversationId, 'conversationId'),
		learnerId
	});
	return result as unknown as Record<string, unknown>;
}

async function processCodeSwitch(job: JobRow): Promise<Record<string, unknown>> {
	const result = await ai.detectCodeSwitches({
		message: requireString(job.input.message, 'message'),
		targetLanguage: requireString(job.input.targetLanguage, 'targetLanguage'),
		lessonLanguage: requireString(job.input.lessonLanguage, 'lessonLanguage'),
		learnerId: job.learnerId ?? optionalString(job.input.learnerId)
	});
	return { switches: result as unknown as Record<string, unknown>[] };
}

async function processPromptTranslation(job: JobRow): Promise<Record<string, unknown>> {
	const result = await ai.translatePromptSections({
		targetLanguageCode: requireString(job.input.targetLanguageCode, 'targetLanguageCode'),
		targetLanguageName: requireString(job.input.targetLanguageName, 'targetLanguageName')
	});
	return result as unknown as Record<string, unknown>;
}

async function processLanguageTest(job: JobRow): Promise<Record<string, unknown>> {
	const result = await ai.testLanguagePair({
		targetLanguage: requireString(job.input.targetLanguage, 'targetLanguage'),
		sourceLanguage: requireString(job.input.sourceLanguage, 'sourceLanguage'),
		targetLanguageName: requireString(job.input.targetLanguageName, 'targetLanguageName'),
		sourceLanguageName: requireString(job.input.sourceLanguageName, 'sourceLanguageName'),
		testCount: Number(job.input.testCount ?? 5),
		modelRouting:
			typeof job.input.modelRouting === 'object' && job.input.modelRouting !== null
				? (job.input.modelRouting as Record<string, string>)
				: undefined
	});
	return result as unknown as Record<string, unknown>;
}
