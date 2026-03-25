import type { OpenAI } from '$lib/server/ai';
import { chat, chatJSON, synthesize, transcribe } from '$lib/server/ai';
import { analyzeConversation } from '$lib/server/analysis';
import { detectCodeSwitches } from '$lib/server/code-switch-detector';
import { trackUsage } from '$lib/server/cost-tracker';
import {
	appendMessage,
	createConversation,
	getConversationById
} from '$lib/server/data/conversations';
import { getLanguageNames } from '$lib/server/data/languages';
import { getLessonById } from '$lib/server/data/lessons';
import { getLearnerById } from '$lib/server/data/learners';
import { getDueVocab, getVocabByLearnerId } from '$lib/server/data/vocabulary';
import { testLanguagePair } from '$lib/server/language-tester';
import { generateLessonPlan } from '$lib/server/lessons';
import { buildTutorSystemPrompt } from '$lib/server/prompts/tutor';
import { translatePromptSections } from '$lib/server/prompts/translate-prompt';
import { evaluatePronunciation } from '$lib/server/pronunciation';
import { detectToneErrors } from '$lib/server/tones';
import { CEFR_LEVELS } from '$lib/constants';
import type {
	AIService,
	AnalyzeConversationInput,
	ChatInput,
	ChatOutput,
	CodeSwitchInput,
	DetectTonesInput,
	EvalPronunciationInput,
	GenerateLessonInput,
	GenerateQuizInput,
	LanguageTestInput,
	LanguageTestSummary,
	SynthesizeInput,
	TranslatePromptInput,
	TranscribeInput,
	TranscriptionResult,
	CefrLevel,
	LessonPlan,
	PronunciationEvaluation,
	ToneAnalysis,
	DetectedSwitch
} from '$lib/types';

type StoredMessage = {
	role: 'system' | 'user' | 'assistant';
	content: string;
	timestamp?: string;
};

type QuizModality = 'listen_to_meaning' | 'read_to_meaning' | 'meaning_to_word' | 'fill_blank';

function isCefrLevel(value: string): value is CefrLevel {
	return CEFR_LEVELS.includes(value as CefrLevel);
}

function coerceStoredMessage(raw: Record<string, unknown>): StoredMessage | null {
	const role = raw.role;
	const content = raw.content;

	if (role !== 'system' && role !== 'user' && role !== 'assistant') return null;
	if (typeof content !== 'string' || content.trim().length === 0) return null;

	const timestamp = typeof raw.timestamp === 'string' ? raw.timestamp : undefined;
	return { role, content, timestamp };
}

function toConversationHistory(messages: StoredMessage[], lessonLanguage: string): string {
	const roleLabels =
		lessonLanguage === 'th'
			? { user: 'ผู้เรียน', assistant: 'ครู', system: 'ระบบ' }
			: lessonLanguage === 'hi'
				? { user: 'शिक्षार्थी', assistant: 'शिक्षक', system: 'प्रणाली' }
				: { user: 'Learner', assistant: 'Tutor', system: 'System' };

	return messages
		.map((message) => {
			const speaker = roleLabels[message.role];
			return `${speaker}: ${message.content}`;
		})
		.join('\n');
}

function toModelMessages(
	systemPrompt: string,
	messages: StoredMessage[]
): OpenAI.ChatCompletionMessageParam[] {
	const modelMessages: OpenAI.ChatCompletionMessageParam[] = [
		{ role: 'system', content: systemPrompt }
	];

	for (const message of messages) {
		if (message.role === 'system') continue;
		modelMessages.push({ role: message.role, content: message.content });
	}

	return modelMessages;
}

function getModality(cefrLevel: CefrLevel): QuizModality {
	if (cefrLevel === 'A1') return 'listen_to_meaning';
	if (cefrLevel === 'A2') return 'read_to_meaning';
	if (cefrLevel === 'B2' || cefrLevel === 'C1' || cefrLevel === 'C2') return 'fill_blank';
	return 'meaning_to_word';
}

function getQuizPrompt(
	quizType: GenerateQuizInput['quizType'],
	vocabWords: string[],
	effectiveCefrLevel: CefrLevel,
	targetLangName: string,
	lessonLangName: string
): string {
	const modalityForLevel = getModality(effectiveCefrLevel);

	if (quizType === 'multiple_choice') {
		return `Generate exactly 5 adaptive multiple-choice questions for ${targetLangName} vocabulary.
Vocabulary source words: ${JSON.stringify(vocabWords)}
Learner CEFR level: ${effectiveCefrLevel}
Question modality: ${modalityForLevel}

Language constraints:
- Target language script/words: ${targetLangName}
- Meanings, instructions, and user-facing explanations: ${lessonLangName}

Output JSON ONLY in this shape:
{
  "questions": [
    {
      "word": "target language word",
      "romanization": "romanized pronunciation",
      "meaning": "meaning in ${lessonLangName}",
      "question_text": "question shown in ${lessonLangName}",
      "question_audio": "optional text for audio prompt",
      "audio_text": "text to play via TTS for the target word",
      "options": [
        { "text": "option text", "audio_text": "optional text to play" },
        { "text": "option text", "audio_text": "optional text to play" },
        { "text": "option text", "audio_text": "optional text to play" },
        { "text": "option text", "audio_text": "optional text to play" }
      ],
      "correct_index": 0,
      "quiz_modality": "listen_to_meaning | read_to_meaning | meaning_to_word"
    }
  ]
}

Pedagogical requirements by CEFR:
- A1 (listen_to_meaning): learner hears the target word only. Set question_audio to the target word. question_text asks "What did you hear?" in ${lessonLangName}. options.text are meanings in ${lessonLangName}. options.audio_text should be absent.
- A2 (read_to_meaning): show target word + romanization and ask meaning in ${lessonLangName}. options.text are meanings in ${lessonLangName}. question_audio can be the target word. options.audio_text should be absent.
- B1/C1/C2 (meaning_to_word): question_text is a meaning/gloss in ${lessonLangName}. options.text are target-language words. include options.audio_text as the target word for each option.

Hard constraints:
- Exactly 4 options per question.
- Exactly one correct answer.
- Options must be plausible distractors.
- Keep consistent with the selected CEFR modality.
- Do not include markdown or commentary.`;
	}

	if (quizType === 'fill_in_blank') {
		return `Generate exactly 5 fill-in-the-blank questions for these ${targetLangName} words: ${JSON.stringify(vocabWords)}.
Learner CEFR level: ${effectiveCefrLevel}

Language constraints:
- Sentences in ${targetLangName}
- Instructions and hints in ${lessonLangName}

Return JSON ONLY:
{
  "questions": [
    {
      "sentence": "${targetLangName} sentence containing ___ blank",
      "answer": "target language word that fills the blank",
      "hint": "brief hint in ${lessonLangName}",
      "word": "target language word",
      "romanization": "romanized pronunciation",
      "meaning": "meaning in ${lessonLangName}",
      "audio_text": "text to play via TTS for the answer",
      "quiz_modality": "fill_blank"
    }
  ]
}

Hard constraints:
- Use each target word at most once.
- Keep sentences short and natural.
- Ensure answer exactly matches word.
- Output valid JSON only.`;
	}

	return `Generate a matching quiz pairing these ${targetLangName} words with their meanings: ${JSON.stringify(vocabWords)}.
Meanings should be in ${lessonLangName}.
Return JSON: { "questions": [{ "pairs": [{ "word": "string", "meaning": "string" }] }] }`;
}

function extractVocabWordsFromLessonPlan(plan: Record<string, unknown>): string[] {
	const vocabTargets = plan.vocabulary_targets;
	if (!Array.isArray(vocabTargets)) return [];

	const words: string[] = [];
	for (const target of vocabTargets) {
		if (typeof target === 'string' && target.trim().length > 0) {
			words.push(target.trim());
			continue;
		}

		if (typeof target !== 'object' || target === null) continue;
		const word = (target as Record<string, unknown>).word;
		if (typeof word === 'string' && word.trim().length > 0) {
			words.push(word.trim());
		}
	}

	return words;
}

export class LocalAIService implements AIService {
	async generateLesson(input: GenerateLessonInput): Promise<LessonPlan> {
		return generateLessonPlan(input.learnerId, input.week, input.day, input.theme);
	}

	async generateQuiz(input: GenerateQuizInput): Promise<Record<string, unknown>> {
		const learner = await getLearnerById(input.learnerId);
		if (!learner) throw new Error('Learner not found');

		const effectiveCefrLevel = input.cefrLevel ?? learner.cefrLevel;
		if (!isCefrLevel(effectiveCefrLevel)) {
			throw new Error('Learner CEFR level is invalid');
		}

		const targetLang = learner.targetLanguage;
		const languageNames = await getLanguageNames();
		const lessonLangName = languageNames[learner.lessonLanguage] ?? learner.lessonLanguage;
		const targetLangName = languageNames[targetLang] ?? targetLang;

		let vocabWords: string[] = [];
		if (input.lessonId) {
			const lesson = await getLessonById(input.lessonId);
			if (lesson) {
				const plan = lesson.plan as Record<string, unknown>;
				vocabWords = extractVocabWordsFromLessonPlan(plan);
			}
		}

		if (vocabWords.length === 0) {
			const dueCards = await getDueVocab(input.learnerId, 10);
			vocabWords = dueCards.map((card) => card.word);
		}

		if (vocabWords.length === 0) {
			throw new Error('No vocabulary available for quiz');
		}

		const quizPrompt = getQuizPrompt(
			input.quizType,
			vocabWords,
			effectiveCefrLevel,
			targetLangName,
			lessonLangName
		);

		const messages = [
			{
				role: 'system' as const,
				content: `You are a ${targetLangName} language quiz generator. Output valid JSON only.`
			},
			{ role: 'user' as const, content: quizPrompt }
		];

		const quiz = await chatJSON<Record<string, unknown>>(messages, 'quiz', targetLang, {
			onUsage: (u) =>
				trackUsage({
					learnerId: input.learnerId,
					task: 'quiz',
					...u
				}).catch((error) => console.error('Quiz cost tracking failed:', error))
		});

		return {
			quizType: input.quizType,
			words: vocabWords,
			...quiz
		};
	}

	async synthesize(input: SynthesizeInput): Promise<Buffer> {
		return synthesize(input.text, input.instructions, input.voice);
	}

	async transcribe(input: TranscribeInput): Promise<TranscriptionResult> {
		return transcribe(input.audio, input.language);
	}

	async evaluatePronunciation(input: EvalPronunciationInput): Promise<PronunciationEvaluation> {
		return evaluatePronunciation(
			input.transcript,
			input.expected,
			input.language,
			input.lessonLanguage,
			input.learnerId
		);
	}

	async detectToneErrors(input: DetectTonesInput): Promise<ToneAnalysis> {
		return detectToneErrors(input.transcript, input.expected, input.language, input.learnerId);
	}

	async chat(input: ChatInput): Promise<ChatOutput> {
		const learnerId = input.learnerId.trim();
		const message = input.message.trim();
		const requestedConversationId = input.conversationId?.trim();
		const requestedScenario = input.scenario?.trim();

		if (!learnerId || !message) {
			throw new Error('learnerId and message required');
		}

		const learner = await getLearnerById(learnerId);
		if (!learner) throw new Error('Learner not found');

		if (
			typeof learner.targetLanguage !== 'string' ||
			typeof learner.lessonLanguage !== 'string' ||
			typeof learner.cefrLevel !== 'string' ||
			!isCefrLevel(learner.cefrLevel)
		) {
			throw new Error('Learner language profile invalid');
		}

		const targetLanguage = learner.targetLanguage.trim().toLowerCase();
		const lessonLanguage = learner.lessonLanguage.trim().toLowerCase();
		const languageNames = await getLanguageNames();
		const targetLanguageExists = Boolean(languageNames[targetLanguage]);
		const lessonLanguageExists = Boolean(languageNames[lessonLanguage]);

		if (!targetLanguageExists || !lessonLanguageExists) {
			throw new Error('Learner language profile invalid');
		}

		const cefrLevel = learner.cefrLevel as CefrLevel;

		const existingConversation = requestedConversationId
			? await getConversationById(requestedConversationId)
			: null;

		if (requestedConversationId && !existingConversation) {
			throw new Error('Conversation not found');
		}

		if (existingConversation && existingConversation.learnerId !== learner.id) {
			throw new Error('Conversation does not belong to learner');
		}

		const conversation =
			existingConversation ??
			(await createConversation({
				learnerId: learner.id,
				scenario: requestedScenario
			}));

		if (!conversation) {
			throw new Error('Failed to initialize conversation');
		}

		const isInitiation = message === '[START]';

		const userMessage: StoredMessage = {
			role: 'user',
			content: isInitiation ? '' : message,
			timestamp: new Date().toISOString()
		};

		if (!isInitiation) {
			const conversationAfterUserAppend = await appendMessage(conversation.id, userMessage);
			if (!conversationAfterUserAppend) {
				throw new Error('Failed to persist user message');
			}
		}

		const vocabRows = await getVocabByLearnerId(learner.id);
		const knownVocab = vocabRows
			.map((row) => row.word)
			.filter((word) => typeof word === 'string' && word.trim().length > 0);

		const currentConversation = await getConversationById(conversation.id);
		if (!currentConversation) throw new Error('Conversation no longer exists');

		const rawMessages = Array.isArray(currentConversation.messages)
			? currentConversation.messages
			: [];
		const storedMessages = rawMessages
			.filter((raw): raw is Record<string, unknown> => typeof raw === 'object' && raw !== null)
			.map((raw) => coerceStoredMessage(raw))
			.filter((raw): raw is StoredMessage => raw !== null);

		const systemPrompt = await buildTutorSystemPrompt({
			targetLanguage,
			lessonLanguage,
			cefrLevel,
			learnerName: learner.name,
			knownVocab,
			scenario: requestedScenario ?? currentConversation.scenario ?? undefined,
			conversationHistory: toConversationHistory(storedMessages, lessonLanguage)
		});

		const modelMessages = toModelMessages(systemPrompt, storedMessages);
		if (isInitiation) {
			modelMessages.push({
				role: 'user',
				content: 'Please start the conversation. Greet me and set the scene for our practice.'
			});
		}

		const response = await chat(modelMessages, 'conversation', targetLanguage, {
			onUsage: (u) =>
				trackUsage({
					learnerId,
					task: 'conversation',
					...u
				}).catch((error) => console.error('Conversation cost tracking failed:', error))
		});

		if (response.trim().length > 0) {
			await appendMessage(conversation.id, {
				role: 'assistant',
				content: response,
				timestamp: new Date().toISOString()
			});
		}

		return {
			response,
			conversationId: conversation.id
		};
	}

	async analyzeConversation(input: AnalyzeConversationInput) {
		return analyzeConversation(input.conversationId, input.learnerId);
	}

	async detectCodeSwitches(input: CodeSwitchInput): Promise<DetectedSwitch[]> {
		return detectCodeSwitches(
			input.message,
			input.targetLanguage,
			input.lessonLanguage,
			input.learnerId
		);
	}

	async translatePromptSections(input: TranslatePromptInput) {
		return translatePromptSections(input.targetLanguageCode, input.targetLanguageName);
	}

	async testLanguagePair(input: LanguageTestInput): Promise<LanguageTestSummary> {
		return testLanguagePair(
			input.targetLanguage,
			input.sourceLanguage,
			input.targetLanguageName,
			input.sourceLanguageName,
			input.testCount
		);
	}
}
