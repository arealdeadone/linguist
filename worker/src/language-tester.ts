import type { TaskType } from '@linguist/ai-core';
import { getLanguageNames } from './data/languages';
import { getDefaultRoutingForLanguage, synthesize, transcribe } from './ai';
import { trackUsage } from './cost-tracker';
import OpenAI from 'openai';
import { config } from './config';
import type { LanguageTestSummary, LanguageTestResult } from './types';

function getValidatedModelRouting(
	targetLanguage: string,
	candidate: unknown
): Record<TaskType, string> {
	const defaults = getDefaultRoutingForLanguage(targetLanguage);
	if (!candidate || typeof candidate !== 'object') return defaults;

	const candidateRecord = candidate as Record<string, unknown>;
	const validated = {} as Record<TaskType, string>;

	for (const [task, defaultModel] of Object.entries(defaults) as [TaskType, string][]) {
		const maybeModel = candidateRecord[task];
		validated[task] =
			typeof maybeModel === 'string' && maybeModel.trim() ? maybeModel.trim() : defaultModel;
	}

	return validated;
}

function getClient(): OpenAI {
	return new OpenAI({
		apiKey: config.genaiApiKey,
		baseURL: config.genaiBaseUrl
	});
}

async function generateTestSentences(
	targetLanguage: string,
	targetLanguageName: string,
	sourceLanguageName: string,
	testCount: number
): Promise<string[]> {
	const client = getClient();

	const response = await client.chat.completions.create({
		model: 'gpt-4o',
		messages: [
			{
				role: 'system',
				content: `You generate test sentences for language learning evaluation. Return ONLY valid JSON.`
			},
			{
				role: 'user',
				content: `Generate ${testCount} short, natural sentences in ${targetLanguageName} (language code: ${targetLanguage}) suitable for pronunciation practice at beginner-to-intermediate level. These will be used to test if TTS and STT work for this language. The learner's instruction language would be ${sourceLanguageName}.

Return JSON: {"sentences": ["sentence1", "sentence2", ...]}`
			}
		],
		temperature: 0.3
	});

	const content = response.choices[0]?.message?.content ?? '';
	const jsonMatch = content.match(/\{[\s\S]*\}/);
	if (!jsonMatch) throw new Error('Failed to generate test sentences');

	const parsed = JSON.parse(jsonMatch[0]) as { sentences: string[] };
	if (!Array.isArray(parsed.sentences) || parsed.sentences.length === 0) {
		throw new Error('No sentences generated');
	}

	if (response.usage) {
		trackUsage({
			task: 'language_test_generation',
			model: 'gpt-4o',
			inputTokens: response.usage.prompt_tokens ?? 0,
			outputTokens: response.usage.completion_tokens ?? 0
		}).catch((e) => console.error('Cost tracking failed:', e));
	}

	return parsed.sentences.filter((s) => typeof s === 'string' && s.trim()).slice(0, testCount);
}

async function runAgentEvaluation(
	targetLanguage: string,
	targetLanguageName: string,
	sourceLanguage: string,
	sourceLanguageName: string,
	results: LanguageTestResult[]
): Promise<{
	recommendation: 'viable' | 'marginal' | 'not_viable';
	reasoning: string;
	agentAnalysis: string;
	modelRouting: Record<TaskType, string>;
}> {
	const client = getClient();

	const resultsForAgent = results.map((r, i) => ({
		test: i + 1,
		sentence: r.sentence,
		sttTranscript: r.sttTranscript,
		evalScore: r.evalScore,
		ttsLatencyMs: r.ttsLatencyMs,
		sttLatencyMs: r.sttLatencyMs,
		evalLatencyMs: r.evalLatencyMs,
		roundTripSuccess: r.roundTripSuccess,
		evalFeedback: r.evalFeedback
	}));

	const response = await client.chat.completions.create({
		model: 'gpt-4o',
		messages: [
			{
				role: 'system',
				content: `You are a language technology evaluation agent. Your job is to analyze TTS→STT→pronunciation evaluation round-trip test results and determine if a language pair is viable for a language learning app.

Return ONLY valid JSON:
{
  "recommendation": "viable" | "marginal" | "not_viable",
  "reasoning": "2-3 sentence summary of why",
  "agentAnalysis": "Detailed paragraph",
  "modelRouting": {
    "lesson_generation": "recommended model name from available list",
    "conversation": "recommended model name",
    "grammar_evaluation": "recommended model name",
    "flashcard": "recommended model name",
    "quiz": "recommended model name",
    "summary": "recommended model name",
    "code_switch": "recommended model name"
  }
}`
			},
			{
				role: 'user',
				content: `Evaluate this language pair for a learning app:

Target language: ${targetLanguageName} (${targetLanguage})
Source/instruction language: ${sourceLanguageName} (${sourceLanguage})

Round-trip test results (${results.length} sentences):
${JSON.stringify(resultsForAgent, null, 2)}`
			}
		],
		temperature: 0.2
	});

	const content = response.choices[0]?.message?.content ?? '';

	if (response.usage) {
		trackUsage({
			task: 'language_test_agent_evaluation',
			model: 'gpt-4o',
			inputTokens: response.usage.prompt_tokens ?? 0,
			outputTokens: response.usage.completion_tokens ?? 0
		}).catch((e) => console.error('Cost tracking failed:', e));
	}

	const jsonMatch = content.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		return {
			recommendation: 'not_viable',
			reasoning: 'Agent evaluation failed to produce results.',
			agentAnalysis: `Raw response: ${content.slice(0, 500)}`,
			modelRouting: getDefaultRoutingForLanguage(targetLanguage)
		};
	}

	try {
		const parsed = JSON.parse(jsonMatch[0]) as {
			recommendation: string;
			reasoning: string;
			agentAnalysis: string;
			modelRouting?: unknown;
		};

		const rec = ['viable', 'marginal', 'not_viable'].includes(parsed.recommendation)
			? (parsed.recommendation as 'viable' | 'marginal' | 'not_viable')
			: 'not_viable';

		return {
			recommendation: rec,
			reasoning: parsed.reasoning || 'No reasoning provided.',
			agentAnalysis: parsed.agentAnalysis || 'No detailed analysis provided.',
			modelRouting: getValidatedModelRouting(targetLanguage, parsed.modelRouting)
		};
	} catch (error) {
		console.error('Failed to parse language test agent evaluation JSON:', error);
		return {
			recommendation: 'not_viable',
			reasoning: 'Agent evaluation returned unparseable results.',
			agentAnalysis: content.slice(0, 500),
			modelRouting: getDefaultRoutingForLanguage(targetLanguage)
		};
	}
}

export async function testLanguagePair(
	targetLanguage: string,
	sourceLanguage: string,
	targetLanguageName?: string,
	sourceLanguageName?: string,
	testCount: number = 5
): Promise<LanguageTestSummary> {
	const normalizedTarget = targetLanguage.trim();
	const normalizedSource = sourceLanguage.trim();

	if (!normalizedTarget) throw new Error('targetLanguage is required');
	if (!normalizedSource) throw new Error('sourceLanguage is required');

	const targetName = targetLanguageName?.trim() || (await getLanguageNameFromDb(normalizedTarget));
	const sourceName = sourceLanguageName?.trim() || (await getLanguageNameFromDb(normalizedSource));
	const count = Math.min(Math.max(testCount, 1), 10);

	const sentences = await generateTestSentences(normalizedTarget, targetName, sourceName, count);
	const results: LanguageTestResult[] = [];

	for (const sentence of sentences) {
		let ttsLatencyMs = 0;
		let sttLatencyMs = 0;
		let evalLatencyMs = 0;

		try {
			const ttsStart = Date.now();
			const audio = await synthesize(sentence, `Speak this ${targetName} text clearly and naturally.`);
			ttsLatencyMs = Date.now() - ttsStart;

			const sttStart = Date.now();
			const stt = await transcribe(audio, normalizedTarget);
			sttLatencyMs = Date.now() - sttStart;

			const evalStart = Date.now();
			const client = getClient();
			const evalResponse = await client.chat.completions.create({
				model: 'gpt-4o',
				messages: [
					{
						role: 'system',
						content: `Compare these two ${targetName} texts and score pronunciation accuracy 0-100. Return JSON: {"score": number, "feedback": "brief feedback in ${sourceName}"}`
					},
					{
						role: 'user',
						content: `Original: "${sentence}"\nTranscribed: "${stt.text}"`
					}
				],
				temperature: 0.1
			});
			evalLatencyMs = Date.now() - evalStart;

			const evalContent = evalResponse.choices[0]?.message?.content ?? '';
			const evalJson = evalContent.match(/\{[\s\S]*\}/);
			let evalScore = 0;
			let evalFeedback = '';

			if (evalJson) {
				const parsed = JSON.parse(evalJson[0]) as { score: number; feedback: string };
				evalScore = Math.max(0, Math.min(100, parsed.score));
				evalFeedback = parsed.feedback || '';
			}

			results.push({
				sentence,
				ttsLatencyMs,
				sttLatencyMs,
				evalLatencyMs,
				sttTranscript: stt.text,
				evalScore,
				evalFeedback,
				roundTripSuccess: evalScore >= 70
			});
		} catch (error) {
			const msg = error instanceof Error ? error.message : 'Unknown error';
			console.error('Language test sentence failed:', { sentence, error: msg });
			results.push({
				sentence,
				ttsLatencyMs,
				sttLatencyMs,
				evalLatencyMs,
				sttTranscript: '',
				evalScore: 0,
				evalFeedback: `Test failed: ${msg}`,
				roundTripSuccess: false
			});
		}
	}

	const total = results.length || 1;
	const averageScore = results.reduce((sum, r) => sum + r.evalScore, 0) / total;
	const successRate = (results.filter((r) => r.roundTripSuccess).length / total) * 100;
	const averageLatencyMs =
		results.reduce((sum, r) => sum + r.ttsLatencyMs + r.sttLatencyMs + r.evalLatencyMs, 0) / total;

	const agentResult = await runAgentEvaluation(
		normalizedTarget,
		targetName,
		normalizedSource,
		sourceName,
		results
	);

	return {
		results,
		averageScore,
		successRate,
		averageLatencyMs,
		recommendation: agentResult.recommendation,
		reasoning: agentResult.reasoning,
		agentAnalysis: agentResult.agentAnalysis,
		modelRouting: agentResult.modelRouting
	};
}

async function getLanguageNameFromDb(code: string): Promise<string> {
	const languageNames = await getLanguageNames();
	return languageNames[code] ?? code;
}
