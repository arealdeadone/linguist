import OpenAI from 'openai';
import { config } from './config';
import {
	MODEL_ROUTING,
	GENAI_BASE_URL,
	STT_MODEL,
	TTS_MODEL,
	TTS_VOICE,
	type TaskType,
	type ChatOptions,
	type TranscriptionResult
} from '@linguist/ai-core';

let _client: OpenAI | null = null;
const routingCache = new Map<string, string>();
const routableTasks: TaskType[] = [
	'lesson_generation',
	'conversation',
	'grammar_evaluation',
	'flashcard',
	'quiz',
	'summary',
	'code_switch'
];
let routingLoaded = false;
let routingLoadPromise: Promise<void> | null = null;

function getClient(): OpenAI {
	if (!_client) {
		_client = new OpenAI({
			apiKey: config.genaiApiKey,
			baseURL: config.genaiBaseUrl || GENAI_BASE_URL
		});
	}

	return _client;
}

function normalizeLanguage(language: string): string {
	return language.trim().toLowerCase();
}

function routingKey(language: string, task: string): string {
	return `${language}:${task}`;
}

async function loadRoutingFromDb(): Promise<void> {
	const { db } = await import('./db');
	const { modelRouting } = await import('./schema');
	const rows = await db
		.select({ language: modelRouting.language, task: modelRouting.task, model: modelRouting.model })
		.from(modelRouting);

	routingCache.clear();
	for (const row of rows) {
		routingCache.set(routingKey(row.language, row.task), row.model);
	}

	routingLoaded = true;
}

async function ensureRoutingLoaded(): Promise<void> {
	if (routingLoaded) return;
	if (!routingLoadPromise) {
		routingLoadPromise = loadRoutingFromDb().finally(() => {
			routingLoadPromise = null;
		});
	}

	await routingLoadPromise;
}

function getHardcodedFallback(task: TaskType, language: string): string | null {
	const taskRoutes = MODEL_ROUTING[task];
	const routed = taskRoutes[language as keyof typeof taskRoutes];
	if (routed) return routed;
	return null;
}

export function getDefaultRoutingForLanguage(language: string): Record<TaskType, string> {
	const normalizedLanguage = normalizeLanguage(language);
	const defaults = {} as Record<TaskType, string>;

	for (const task of routableTasks) {
		const taskRoutes = MODEL_ROUTING[task];
		const model = taskRoutes[normalizedLanguage as keyof typeof taskRoutes] ?? taskRoutes.zh;
		defaults[task] = model;
	}

	return defaults;
}

export async function routeModel(task: TaskType, language: string): Promise<string> {
	const normalizedLanguage = normalizeLanguage(language);

	try {
		await ensureRoutingLoaded();
	} catch (error) {
		console.error('Failed to load model routing from DB:', error);
	}

	const key = routingKey(normalizedLanguage, task);
	const cached = routingCache.get(key);
	if (cached) return cached;

	const hardcoded = getHardcodedFallback(task, normalizedLanguage);
	if (hardcoded) {
		routingCache.set(key, hardcoded);
		return hardcoded;
	}

	throw new AIError(
		`No model routing configured for language "${normalizedLanguage}" and task "${task}". Add this language pair via the admin Language Test page first.`,
		true
	);
}

export function invalidateRoutingCache(): void {
	routingCache.clear();
	routingLoaded = false;
	routingLoadPromise = null;
}

export async function chat(
	messages: OpenAI.ChatCompletionMessageParam[],
	task: TaskType,
	language: string,
	options?: ChatOptions
): Promise<string> {
	const client = getClient();
	const model = await routeModel(task, language);

	const response = await client.chat.completions.create({
		model,
		messages,
		temperature: options?.temperature ?? 0.7,
		max_tokens: options?.max_tokens
	});

	if (options?.onUsage && response.usage) {
		options.onUsage({
			model,
			inputTokens: response.usage.prompt_tokens ?? 0,
			outputTokens: response.usage.completion_tokens ?? 0
		});
	}

	return response.choices[0]?.message?.content ?? '';
}

export class AIError extends Error {
	constructor(
		message: string,
		public readonly isSystemFailure: boolean = true
	) {
		super(message);
		this.name = 'AIError';
	}
}

export async function chatJSON<T>(
	messages: OpenAI.ChatCompletionMessageParam[],
	task: TaskType,
	language: string,
	options?: ChatOptions
): Promise<T> {
	const client = getClient();
	const model = await routeModel(task, language);

	const isClaude = model.startsWith('claude');

	const augmentedMessages: OpenAI.ChatCompletionMessageParam[] = isClaude
		? [
				...messages,
				{
					role: 'user',
					content:
						'Respond with ONLY valid JSON. No markdown fences, no explanation, no text before or after the JSON object.'
				}
			]
		: messages;

	let content: string;
	try {
		const response = await client.chat.completions.create({
			model,
			messages: augmentedMessages,
			temperature: options?.temperature ?? 0.3,
			max_tokens: options?.max_tokens,
			...(isClaude ? {} : { response_format: { type: 'json_object' } })
		});

		if (options?.onUsage && response.usage) {
			options.onUsage({
				model,
				inputTokens: response.usage.prompt_tokens ?? 0,
				outputTokens: response.usage.completion_tokens ?? 0
			});
		}

		content = response.choices[0]?.message?.content ?? '';
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'AI service unavailable';
		throw new AIError(`AI request failed: ${msg}`, true);
	}

	if (!content.trim()) {
		throw new AIError('AI returned empty response', true);
	}

	const jsonMatch = content.match(/\{[\s\S]*\}/);
	if (!jsonMatch) {
		throw new AIError('AI response did not contain valid JSON', true);
	}

	try {
		return JSON.parse(jsonMatch[0]) as T;
	} catch (e) {
		console.error('chatJSON parse fallback failed:', e);
		throw new AIError('AI returned malformed JSON', true);
	}
}

export async function* chatStream(
	messages: OpenAI.ChatCompletionMessageParam[],
	task: TaskType,
	language: string,
	options?: ChatOptions
): AsyncGenerator<string> {
	const client = getClient();
	const model = await routeModel(task, language);

	const stream = await client.chat.completions.create({
		model,
		messages,
		temperature: options?.temperature ?? 0.7,
		max_tokens: options?.max_tokens,
		stream: true,
		stream_options: { include_usage: true }
	});

	let streamUsage: { prompt_tokens?: number | null; completion_tokens?: number | null } | null =
		null;

	for await (const chunk of stream) {
		if (chunk.usage) {
			streamUsage = chunk.usage;
		}

		const delta = chunk.choices[0]?.delta?.content;
		if (delta) yield delta;
	}

	if (options?.onUsage && streamUsage) {
		options.onUsage({
			model,
			inputTokens: streamUsage.prompt_tokens ?? 0,
			outputTokens: streamUsage.completion_tokens ?? 0
		});
	}
}

export async function transcribe(
	audio: Buffer | File,
	language: string
): Promise<TranscriptionResult> {
	const client = getClient();

	let file: File;
	if (audio instanceof File) {
		file = audio;
	} else {
		const { filetypeinfo } = await import('magic-bytes.js');
		const bytes = new Uint8Array(audio);
		const detected = filetypeinfo(bytes);
		const audioType = detected.find(
			(d: { mime?: string }) => d.mime?.startsWith('audio/') || d.mime?.startsWith('video/')
		);
		let ext = audioType?.extension ?? 'webm';
		let mime = audioType?.mime ?? 'audio/webm';

		if (ext === 'mkv' || mime === 'video/x-matroska') {
			ext = 'webm';
			mime = 'audio/webm';
		}

		file = new File([bytes], `audio.${ext}`, { type: mime });
	}

	const response = await client.audio.transcriptions.create({
		model: STT_MODEL,
		file,
		language
	});

	return {
		text: response.text,
		language
	};
}

export async function synthesize(
	text: string,
	instructions?: string,
	voice?: string
): Promise<Buffer> {
	const client = getClient();

	const response = await client.audio.speech.create({
		model: TTS_MODEL,
		voice: (voice ?? TTS_VOICE) as 'coral',
		input: text,
		...(instructions ? { instructions } : {})
	});

	const arrayBuffer = await response.arrayBuffer();
	return Buffer.from(arrayBuffer);
}

export type { OpenAI };
