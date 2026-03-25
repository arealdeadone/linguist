import type { CefrLevel } from '@linguist/ai-core';
import { getLanguageNames } from '../data/languages';
import { getPromptForLanguage } from '../data/tutor-prompts';
import { BASE_TEMPLATE } from './base-template';
import type { TutorPromptSections } from './types';

interface TutorPromptParams {
	targetLanguage: string;
	lessonLanguage: string;
	cefrLevel: CefrLevel;
	learnerName: string;
	knownVocab: string[];
	scenario?: string;
	conversationHistory?: string;
}

type TemplateValues = {
	learnerName: string;
	targetLanguageName: string;
	lessonLanguageName: string;
	vocabList: string;
};

function renderLine(template: string, values: TemplateValues): string {
	return template.replace(
		/\{(learnerName|targetLanguageName|lessonLanguageName|vocabList)\}/g,
		(_, key) => {
			return values[key as keyof TemplateValues];
		}
	);
}

function renderList(lines: string[], values: TemplateValues): string[] {
	return lines.map((line) => renderLine(line, values));
}

function getLanguageName(
	code: string,
	labels: Record<string, string>,
	fallbackNames: Record<string, string>
): string {
	return labels[code] ?? fallbackNames[code] ?? code;
}

export async function buildTutorSystemPrompt(params: TutorPromptParams): Promise<string> {
	const lessonLanguageCode = params.lessonLanguage.trim().toLowerCase();
	const targetLanguageCode = params.targetLanguage.trim().toLowerCase();
	const sections: TutorPromptSections =
		(await getPromptForLanguage(lessonLanguageCode)) ?? BASE_TEMPLATE;
	const languageNames = await getLanguageNames();

	const knownVocab = params.knownVocab.filter((word) => word.trim().length > 0);
	const values: TemplateValues = {
		learnerName: params.learnerName,
		targetLanguageName: getLanguageName(targetLanguageCode, sections.languageLabels, languageNames),
		lessonLanguageName: getLanguageName(lessonLanguageCode, sections.languageLabels, languageNames),
		vocabList: knownVocab.length > 0 ? knownVocab.join('、') : '—'
	};

	const cefrStyle =
		sections.cefrStyles[params.cefrLevel] ?? BASE_TEMPLATE.cefrStyles[params.cefrLevel];
	const scenarioBlock = params.scenario?.trim()
		? `Scenario: ${params.scenario.trim()}\nKeep the conversation natural in this context.`
		: '';
	const historyBlock = params.conversationHistory?.trim()
		? `Conversation history:\n${params.conversationHistory.trim()}\nContinue naturally from this flow.`
		: '';

	return [
		renderLine(sections.role, values),
		renderLine(sections.mainLanguage, values),
		renderLine(sections.explanationLanguage, values),
		'',
		'Language Rules (strict):',
		...renderList(sections.languageRules, values),
		'',
		`Learner level: CEFR ${params.cefrLevel}`,
		`Complexity guidance: ${cefrStyle}`,
		'',
		'i+1 Vocabulary Policy:',
		...renderList(sections.i1Policy, values),
		'',
		'Error Correction Policy:',
		...renderList(sections.errorCorrection, values),
		'',
		'Response Style:',
		...renderList(sections.responseStyle, values),
		scenarioBlock,
		historyBlock,
		'',
		'Avoid:',
		...renderList(sections.avoidList, values),
		'',
		'Code-Switching:',
		...renderList(sections.codeSwitching, values)
	]
		.filter((line) => line.length > 0)
		.join('\n');
}
