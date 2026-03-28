import type { TutorPromptSections } from '$lib/server/prompts/types';
import {
	HI_TUTOR_PROMPT_SECTIONS,
	TH_TUTOR_PROMPT_SECTIONS
} from '$lib/server/prompts/seed-prompts';
import {
	appendMessage,
	createConversation,
	getConversationById,
	getDueVocab,
	getLearnerById,
	getLessonById,
	getVocabByLearnerId,
	saveAnalysis
} from '$lib/server/data';
import { getLanguageNames } from '$lib/server/data/languages';
import { getDefaultRoutingForLanguage } from '$lib/server/ai';
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
	ConversationAnalysis,
	CefrLevel
} from '$lib/types';

type FixtureVocab = {
	word: string;
	romanization: string;
	meaning: string;
	scene_description: string;
};

const ZH_A1_FIXTURES: FixtureVocab[] = [
	{
		word: '你好',
		romanization: 'nǐ hǎo',
		meaning: 'नमस्ते',
		scene_description: 'सुबह आप पड़ोसी से मिलते हैं और मुस्कुराकर विनम्रता से कहते हैं — 你好।'
	},
	{
		word: '谢谢',
		romanization: 'xiè xie',
		meaning: 'धन्यवाद',
		scene_description: 'किसी ने आपको गर्म चाय दी, आप हल्का सिर झुकाकर धन्यवाद कहते हैं।'
	},
	{
		word: '再见',
		romanization: 'zài jiàn',
		meaning: 'फिर मिलेंगे',
		scene_description: 'शाम को दोस्त घर जा रहा है, आप दरवाज़े से हाथ हिलाकर विदा करते हैं।'
	},
	{
		word: '多少',
		romanization: 'duō shao',
		meaning: 'कितना',
		scene_description: 'आप बाज़ार में फल खरीदते समय दुकानदार से कीमत पूछते हैं — कितना?'
	},
	{
		word: '钱',
		romanization: 'qián',
		meaning: 'पैसा',
		scene_description: 'आप जेब से सिक्के निकालकर गिनते हैं और दुकानदार को देते हैं।'
	}
];

const TE_A1_FIXTURES: FixtureVocab[] = [
	{
		word: 'నమస్కారం',
		romanization: 'namaskāram',
		meaning: 'สวัสดี',
		scene_description: 'ตอนเช้าคุณพบเพื่อน แล้วยกมือไหว้ทักทายอย่างสุภาพ'
	},
	{
		word: 'ధన్యవాదాలు',
		romanization: 'dhanyavādālu',
		meaning: 'ขอบคุณ',
		scene_description: 'มีคนช่วยถือของให้ คุณหันไปยิ้มแล้วพูดขอบคุณ'
	},
	{
		word: 'నేను',
		romanization: 'nēnu',
		meaning: 'ฉัน',
		scene_description: 'คุณชี้ไปที่ตัวเองขณะแนะนำตัวว่า “ฉันชื่อ...”'
	},
	{
		word: 'నీవు',
		romanization: 'nīvu',
		meaning: 'คุณ',
		scene_description: 'คุณชี้ไปที่เพื่อนตรงหน้าเพื่อถามว่า “คุณจะไปไหน?”'
	},
	{
		word: 'ఒకటి',
		romanization: 'okaṭi',
		meaning: 'หนึ่ง',
		scene_description: 'คุณชูนิ้วหนึ่งนิ้วเพื่อบอกจำนวนอย่างชัดเจน'
	}
];

function normalizeCefrLevel(value: string): CefrLevel {
	if (
		value === 'A1' ||
		value === 'A2' ||
		value === 'B1' ||
		value === 'B2' ||
		value === 'C1' ||
		value === 'C2'
	) {
		return value;
	}
	return 'A1';
}

function getFixtureVocab(targetLanguage: string): FixtureVocab[] {
	return targetLanguage === 'te' ? TE_A1_FIXTURES : ZH_A1_FIXTURES;
}

function getDefaultTheme(targetLanguage: string, lessonLanguage: string): string {
	if (targetLanguage === 'te' && lessonLanguage === 'th') {
		return 'การทักทายและคำใช้ในชีวิตประจำวัน';
	}
	if (targetLanguage === 'zh' && lessonLanguage === 'hi') {
		return 'अभिवादन और रोज़मर्रा की बातचीत';
	}
	return targetLanguage === 'te' ? 'Daily Telugu Basics' : 'Daily Mandarin Basics';
}

function getLessonObjectives(targetLanguage: string): string[] {
	if (targetLanguage === 'te') {
		return ['แนะนำตัวเองสั้น ๆ ได้', 'ใช้คำทักทายและคำขอบคุณได้', 'ถาม-ตอบจำนวนพื้นฐานได้'];
	}
	return ['सरल अभिवादन बोलना', 'धन्यवाद और विदाई का प्रयोग', 'कीमत पूछने के छोटे वाक्य बनाना'];
}

function getColloquialPhrase(targetLanguage: string): string {
	return targetLanguage === 'te'
		? 'పర్లేదు (parlēdu) - ไม่เป็นไร'
		: '慢慢来 (màn màn lái) - आराम से, धीरे-धीरे';
}

function getCulturalNote(targetLanguage: string): string {
	return targetLanguage === 'te'
		? 'ในวัฒนธรรมเตลูกู การใช้คำสุภาพและน้ำเสียงนุ่มนวลช่วยให้การสนทนาดูเป็นมิตรขึ้น'
		: 'मंदारिन में पहली मुलाकात में छोटा, विनम्र अभिवादन और हल्की मुस्कान बहुत सामान्य है।';
}

function pickOptions(correctMeaning: string, lessonLanguage: string): string[] {
	if (lessonLanguage === 'th') {
		return [correctMeaning, 'ลาก่อน', 'กิน', 'บ้าน'];
	}
	if (lessonLanguage === 'hi') {
		return [correctMeaning, 'फिर मिलेंगे', 'खाना', 'घर'];
	}
	return [correctMeaning, 'goodbye', 'eat', 'home'];
}

function extractLessonWords(plan: Record<string, unknown>): string[] {
	const rawTargets = plan.vocabulary_targets;
	if (!Array.isArray(rawTargets)) return [];

	const words: string[] = [];
	for (const target of rawTargets) {
		if (typeof target === 'string' && target.trim().length > 0) {
			words.push(target.trim());
			continue;
		}
		if (!target || typeof target !== 'object') continue;
		const word = (target as Record<string, unknown>).word;
		if (typeof word === 'string' && word.trim().length > 0) {
			words.push(word.trim());
		}
	}

	return words;
}

function buildMockAudioBuffer(input: SynthesizeInput): Buffer {
	const id3Header = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x21]);
	const frameHeader = Buffer.from([0xff, 0xfb, 0x90, 0x64]);
	const payload = Buffer.alloc(1300, 0);
	const source = `${input.text}|${input.instructions ?? ''}|${input.voice ?? 'coral'}`;
	const sourceBytes = Buffer.from(source, 'utf8');

	for (let i = 0; i < payload.length; i++) {
		payload[i] = sourceBytes[i % sourceBytes.length] ?? 0;
	}

	return Buffer.concat([id3Header, frameHeader, payload]);
}

function pronunciationFeedback(lessonLanguage: string, correct: boolean): string {
	if (lessonLanguage === 'th') {
		return correct
			? 'ออกเสียงดีมาก ชัดเจนและเป็นธรรมชาติ'
			: 'ลองออกเสียงใหม่อีกครั้ง เน้นเสียงพยางค์หลักให้ชัดขึ้น';
	}
	if (lessonLanguage === 'hi') {
		return correct
			? 'बहुत अच्छा उच्चारण! आवाज़ साफ़ और स्वाभाविक है।'
			: 'फिर से बोलकर देखिए, मुख्य ध्वनि पर थोड़ा और ज़ोर दें।';
	}
	return correct ? 'Good pronunciation.' : 'Try again with clearer pronunciation.';
}

function toPromptSections(input: TranslatePromptInput): TutorPromptSections {
	if (input.targetLanguageCode === 'hi') {
		return { ...HI_TUTOR_PROMPT_SECTIONS };
	}
	if (input.targetLanguageCode === 'th') {
		return { ...TH_TUTOR_PROMPT_SECTIONS };
	}

	return {
		role: `Role: You are a warm and encouraging ${input.targetLanguageName} conversation tutor for {learnerName}.`,
		mainLanguage: `Primary speaking language: ${input.targetLanguageName}`,
		explanationLanguage: `Explanation language: ${input.targetLanguageName}`,
		languageRules: [
			`Use ${input.targetLanguageName} for all normal tutor responses.`,
			'Keep responses concise and level-appropriate.',
			'Never switch to English unless explicitly requested by the learner profile.'
		],
		i1Policy: [
			'Prioritize already-known vocabulary.',
			'Introduce at most 1-2 new words per turn.',
			'Recycle each new word in a following sentence.'
		],
		errorCorrection: [
			'Correct at most one issue per turn.',
			'Prefer recasts over long explanations.'
		],
		responseStyle: [
			'Friendly, short, and conversational.',
			'End with a simple follow-up question.'
		],
		avoidList: ['Avoid long grammar lectures.', 'Avoid overwhelming vocabulary density.'],
		codeSwitching: [
			'Understand mixed-language learner input.',
			'Respond with natural target-language reformulations.'
		],
		cefrStyles: {
			A1: 'Very short and concrete sentences.',
			A2: 'Simple linked sentences on familiar topics.',
			B1: 'Moderate detail and natural connectors.',
			B2: 'More nuanced, fluent discussion.',
			C1: 'Complex ideas with register control.',
			C2: 'Highly fluent and precise expression.'
		},
		languageLabels: {
			[input.targetLanguageCode]: input.targetLanguageName,
			en: 'English'
		}
	};
}

export class MockAIService implements AIService {
	async generateLesson(input: GenerateLessonInput): Promise<LessonPlan> {
		const learner = await getLearnerById(input.learnerId);
		if (!learner) throw new Error('Learner not found');

		const fixtureVocab = getFixtureVocab(learner.targetLanguage);
		const level = normalizeCefrLevel(learner.cefrLevel);

		return {
			id: crypto.randomUUID(),
			cefr_level: level,
			week: input.week,
			day: input.day,
			theme: input.theme?.trim() || getDefaultTheme(learner.targetLanguage, learner.lessonLanguage),
			duration_minutes: 25,
			learning_objectives: getLessonObjectives(learner.targetLanguage),
			vocabulary_targets: fixtureVocab.map((item) => ({ ...item })),
			review_words:
				learner.targetLanguage === 'te' ? ['మంచి', 'అన్నం', 'డబ్బు'] : ['我', '你', '好'],
			activities:
				learner.targetLanguage === 'te'
					? [
							{ type: 'listening', duration_min: 5 },
							{ type: 'speaking', duration_min: 7 },
							{ type: 'conversation', duration_min: 8 },
							{ type: 'quiz', duration_min: 5 }
						]
					: [
							{ type: 'listening', duration_min: 5 },
							{ type: 'vocabulary_tpr', duration_min: 7 },
							{ type: 'conversation', duration_min: 8 },
							{ type: 'quiz', duration_min: 5 }
						],
			colloquial_phrase: getColloquialPhrase(learner.targetLanguage),
			cultural_note: getCulturalNote(learner.targetLanguage)
		};
	}

	async generateQuiz(input: GenerateQuizInput): Promise<Record<string, unknown>> {
		const learner = await getLearnerById(input.learnerId);
		if (!learner) throw new Error('Learner not found');

		const effectiveCefr = normalizeCefrLevel(input.cefrLevel ?? learner.cefrLevel);
		let vocabWords: string[] = [];

		if (input.lessonId) {
			const lesson = await getLessonById(input.lessonId);
			if (lesson) {
				const plan = lesson.plan as Record<string, unknown>;
				vocabWords = extractLessonWords(plan);
			}
		}

		if (vocabWords.length === 0) {
			const due = await getDueVocab(input.learnerId, 10);
			vocabWords = due.map((card) => card.word);
		}

		if (vocabWords.length === 0) {
			const allVocab = await getVocabByLearnerId(input.learnerId);
			vocabWords = allVocab.slice(0, 10).map((row) => row.word);
		}

		if (vocabWords.length === 0) throw new Error('No vocabulary available for quiz');

		const fixtureByWord = new Map(
			getFixtureVocab(learner.targetLanguage).map((item) => [item.word, item])
		);
		const words = vocabWords.slice(0, 5);

		const questions = words.map((word, index) => {
			const fixture = fixtureByWord.get(word) ?? {
				word,
				romanization: word,
				meaning: learner.lessonLanguage === 'th' ? 'ความหมาย' : 'अर्थ',
				scene_description:
					learner.lessonLanguage === 'th' ? 'ฉากการใช้งานในชีวิตจริง' : 'दैनिक जीवन का दृश्य'
			};
			const options = pickOptions(fixture.meaning, learner.lessonLanguage).map((text) => ({
				text
			}));

			return {
				word: fixture.word,
				romanization: fixture.romanization,
				meaning: fixture.meaning,
				question_text:
					learner.lessonLanguage === 'th'
						? `ข้อ ${index + 1}: คำนี้หมายถึงอะไร?`
						: `प्रश्न ${index + 1}: इस शब्द का अर्थ क्या है?`,
				options,
				correct_index: 0,
				quiz_modality: effectiveCefr === 'A1' ? 'listen_to_meaning' : 'read_to_meaning'
			};
		});

		return {
			quizType: input.quizType,
			words,
			questions
		};
	}

	async synthesize(input: SynthesizeInput): Promise<Buffer> {
		return buildMockAudioBuffer(input);
	}

	async transcribe(input: TranscribeInput): Promise<TranscriptionResult> {
		const language = input.language.trim().toLowerCase();
		if (language === 'te') {
			return { text: 'నమస్కారం, నేను బాగున్నాను', language };
		}
		if (language === 'zh') {
			return { text: '你好，我很好', language };
		}
		return { text: 'mock transcription ready', language };
	}

	async evaluatePronunciation(input: EvalPronunciationInput): Promise<PronunciationEvaluation> {
		const normalizedTranscript = input.transcript.trim();
		const normalizedExpected = input.expected.trim();
		const correct = normalizedTranscript.includes(normalizedExpected);
		const score = correct ? 90 : 30;

		return {
			score,
			correct,
			feedback: pronunciationFeedback(input.lessonLanguage, correct),
			corrections: correct
				? []
				: [
						{
							word: normalizedExpected,
							expected: normalizedExpected,
							got: normalizedTranscript,
							issue:
								input.lessonLanguage === 'th'
									? 'จังหวะเสียงและพยางค์ยังไม่ตรง'
									: input.lessonLanguage === 'hi'
										? 'ध्वनि और उच्चारण लय में अंतर है'
										: 'Pronunciation mismatch'
						}
					],
			toneErrors: []
		};
	}

	async detectToneErrors(_input: DetectTonesInput): Promise<ToneAnalysis> {
		return {
			toneErrors: [],
			hasToneErrors: false
		};
	}

	async chat(input: ChatInput): Promise<ChatOutput> {
		const learner = await getLearnerById(input.learnerId);
		if (!learner) throw new Error('Learner not found');

		const message = input.message.trim();
		if (!message) throw new Error('message required');

		let conversation = input.conversationId
			? await getConversationById(input.conversationId)
			: null;

		if (input.conversationId && !conversation) {
			throw new Error('Conversation not found');
		}

		if (conversation && conversation.learnerId !== learner.id) {
			throw new Error('Conversation does not belong to learner');
		}

		if (!conversation) {
			conversation = await createConversation({
				learnerId: learner.id,
				scenario: input.scenario?.trim() || undefined
			});
		}

		const timestamp = new Date().toISOString();
		if (message !== '[START]') {
			await appendMessage(conversation.id, { role: 'user', content: message, timestamp });
		}

		const response =
			learner.lessonLanguage === 'th'
				? message === '[START]'
					? 'สวัสดีค่ะ วันนี้เราจะฝึกบทสนทนาเตลูกูแบบง่าย ๆ พร้อมไหมคะ?'
					: `ดีมากค่ะ! คุณพูดว่า "${message}" ได้ชัดเจน ลองตอบอีกประโยคหนึ่งได้ไหม?`
				: learner.lessonLanguage === 'hi'
					? message === '[START]'
						? 'नमस्ते! आज हम सरल मंदारिन बातचीत का अभ्यास करेंगे। तैयार हैं?'
						: `बहुत बढ़िया! आपने "${message}" सही कहा। अब एक और छोटा वाक्य बोलिए।`
					: `Great start. You said "${message}" clearly. Can you continue?`;

		await appendMessage(conversation.id, {
			role: 'assistant',
			content: response,
			timestamp: new Date().toISOString()
		});

		return {
			response,
			conversationId: conversation.id
		};
	}

	async analyzeConversation(input: AnalyzeConversationInput): Promise<ConversationAnalysis> {
		const conversation = await getConversationById(input.conversationId);
		if (!conversation) throw new Error('Conversation not found');

		const learner = await getLearnerById(input.learnerId);
		if (!learner) throw new Error('Learner not found');

		const learnerVocab = await getVocabByLearnerId(input.learnerId);
		const firstWord = learnerVocab[0]?.word;
		const secondWord = learnerVocab[1]?.word;

		const analysis: ConversationAnalysis = {
			words_used_correctly: firstWord ? [firstWord] : [],
			words_used_incorrectly: secondWord
				? [
						{
							word: secondWord,
							error:
								learner.lessonLanguage === 'th'
									? 'ใช้ตำแหน่งคำยังไม่เป็นธรรมชาติ'
									: 'शब्द का क्रम थोड़ा अस्वाभाविक था',
							correction:
								learner.lessonLanguage === 'th'
									? 'ลองวางคำนี้ไว้หน้าคำกริยาในประโยคถัดไป'
									: 'अगले वाक्य में इस शब्द को क्रिया से पहले रखें'
						}
					]
				: [],
			code_switches: [],
			new_patterns_demonstrated:
				learner.targetLanguage === 'te'
					? ['ประโยคแนะนำตัวสั้น ๆ', 'การถามคำถามแบบสุภาพ']
					: ['सरल परिचय वाक्य', 'विनम्र प्रश्न संरचना'],
			srs_updates: firstWord ? [{ word: firstWord, quality: 4 }] : [],
			suggested_focus_next_session:
				learner.lessonLanguage === 'th'
					? 'ฝึกถาม-ตอบสั้น ๆ โดยใช้สรรพนามให้คล่องขึ้น'
					: 'अगले सत्र में सर्वनाम और छोटे प्रश्न-उत्तर का अभ्यास करें'
		};

		await saveAnalysis(input.conversationId, analysis as unknown as Record<string, unknown>);
		return analysis;
	}

	async detectCodeSwitches(_input: CodeSwitchInput): Promise<DetectedSwitch[]> {
		return [];
	}

	async translatePromptSections(input: TranslatePromptInput): Promise<TutorPromptSections> {
		return toPromptSections(input);
	}

	async testLanguagePair(input: LanguageTestInput): Promise<LanguageTestSummary> {
		const languageNames = await getLanguageNames();
		const targetName = languageNames[input.targetLanguage] ?? input.targetLanguageName;
		const sourceName = languageNames[input.sourceLanguage] ?? input.sourceLanguageName;
		const count = Math.max(1, Math.min(input.testCount, 10));

		const results = Array.from({ length: count }, (_, index) => ({
			sentence:
				input.targetLanguage === 'te'
					? `నమస్కారం, ఇది పరీక్ష వాక్యం ${index + 1}`
					: `你好，这是测试句子 ${index + 1}`,
			ttsLatencyMs: 40 + index * 3,
			sttLatencyMs: 55 + index * 2,
			evalLatencyMs: 30 + index,
			sttTranscript:
				input.targetLanguage === 'te'
					? `నమస్కారం ఇది పరీక్ష ${index + 1}`
					: `你好 这是 测试 ${index + 1}`,
			evalScore: 92,
			evalFeedback:
				input.sourceLanguage === 'th'
					? 'ผลลัพธ์ดีมาก เสียงชัดและระบบตอบสนองเร็ว'
					: 'परिणाम बहुत अच्छे हैं, उच्चारण और लेटेंसी दोनों स्थिर हैं।',
			roundTripSuccess: true
		}));

		const averageLatencyMs =
			results.reduce(
				(sum, row) => sum + row.ttsLatencyMs + row.sttLatencyMs + row.evalLatencyMs,
				0
			) / results.length;

		return {
			results,
			averageScore: 92,
			successRate: 100,
			averageLatencyMs,
			recommendation: 'viable',
			reasoning:
				input.sourceLanguage === 'th'
					? `${targetName} กับ ${sourceName} มีคุณภาพเสียงและการถอดเสียงที่เสถียร เหมาะกับการใช้งานจริง`
					: `${targetName} और ${sourceName} के लिए राउंड-ट्रिप स्थिर है और सीखने के उपयोग के लिए उपयुक्त है।`,
			agentAnalysis:
				input.sourceLanguage === 'th'
					? 'TTS ฟังชัดเจน STT ใกล้เคียงข้อความต้นฉบับ และคะแนนประเมินสม่ำเสมอ จึงเหมาะสำหรับเปิดใช้ในระบบ'
					: 'TTS स्पष्ट है, STT पर्याप्त सटीक है, और मूल्यांकन स्कोर लगातार उच्च है; इसलिए यह भाषा-जोड़ी व्यवहार्य है।',
			modelRouting: getDefaultRoutingForLanguage(input.targetLanguage)
		};
	}
}
