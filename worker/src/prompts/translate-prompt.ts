import OpenAI from 'openai';
import { config } from '../config';
import { trackUsage } from '../cost-tracker';
import { BASE_TEMPLATE } from './base-template';
import { isTutorPromptSections } from './types';
import type { TutorPromptSections } from './types';

const TRANSLATION_MODEL = 'gpt-4o';

function getClient(): OpenAI {
	return new OpenAI({
		apiKey: config.genaiApiKey,
		baseURL: config.genaiBaseUrl
	});
}

function collectPlaceholders(sections: TutorPromptSections): Set<string> {
	const placeholders = new Set<string>();
	const values = Object.values(sections);

	for (const value of values) {
		if (typeof value === 'string') {
			const matches = value.match(/\{[a-zA-Z]+\}/g) ?? [];
			for (const match of matches) placeholders.add(match);
			continue;
		}

		if (Array.isArray(value)) {
			for (const item of value) {
				const matches = item.match(/\{[a-zA-Z]+\}/g) ?? [];
				for (const match of matches) placeholders.add(match);
			}
			continue;
		}

		for (const item of Object.values(value)) {
			if (typeof item !== 'string') continue;
			const matches = item.match(/\{[a-zA-Z]+\}/g) ?? [];
			for (const match of matches) placeholders.add(match);
		}
	}

	return placeholders;
}

function ensureTemplatePlaceholdersPreserved(sections: TutorPromptSections): void {
	const source = collectPlaceholders(BASE_TEMPLATE);
	const translated = collectPlaceholders(sections);

	for (const placeholder of source) {
		if (!translated.has(placeholder)) {
			throw new Error(`Translated prompt is missing placeholder ${placeholder}`);
		}
	}
}

export async function translatePromptSections(
	targetLanguageCode: string,
	targetLanguageName: string
): Promise<TutorPromptSections> {
	const client = getClient();
	const normalizedCode = targetLanguageCode.trim().toLowerCase();
	const normalizedName = targetLanguageName.trim();

	const response = await client.chat.completions.create({
		model: TRANSLATION_MODEL,
		messages: [
			{
				role: 'system',
				content:
					'You translate structured language-learning tutor prompts into a target language while preserving strict JSON structure and placeholders.'
			},
			{
				role: 'user',
				content: `Translate the following tutor prompt template into ${normalizedName} (${normalizedCode}).

Requirements:
- Output ONLY valid JSON object matching the same shape.
- Translate naturally (not literal word-by-word), adapting phrasing for the target language.
- Keep all placeholders exactly unchanged (for example: {learnerName}, {targetLanguageName}, {lessonLanguageName}, {vocabList}). Do not translate, rename, remove, or add placeholders.
- Translate all CEFR style descriptions to natural ${normalizedName}.
- Fill languageLabels with how this language naturally names these language codes: en, hi, th, zh, te, ja, ko, fr, de, es, ar, ru, pt.
- Keep rule numbering intact where present.

Template JSON:
${JSON.stringify(BASE_TEMPLATE, null, 2)}`
			}
		],
		temperature: 0.3,
		response_format: { type: 'json_object' }
	});

	if (response.usage) {
		trackUsage({
			task: 'prompt_translation',
			model: TRANSLATION_MODEL,
			inputTokens: response.usage.prompt_tokens ?? 0,
			outputTokens: response.usage.completion_tokens ?? 0,
			metadata: {
				targetLanguageCode: normalizedCode,
				targetLanguageName: normalizedName
			}
		}).catch((error: unknown) => {
			console.error('Cost tracking failed for prompt translation:', error);
		});
	}

	const content = response.choices[0]?.message?.content ?? '';
	if (!content.trim()) {
		throw new Error('Prompt translation returned empty response');
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch (error) {
		console.error('Failed to parse translated prompt JSON:', error);
		throw new Error('Prompt translation returned malformed JSON');
	}

	if (!isTutorPromptSections(parsed)) {
		throw new Error('Prompt translation returned invalid sections schema');
	}

	ensureTemplatePlaceholdersPreserved(parsed);
	return parsed;
}
