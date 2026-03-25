import type { CefrLevel } from './lesson';

export interface Scenario {
	id: string;
	title: string;
	description: string;
	cefrLevel: CefrLevel;
	targetLanguage: string;
	systemPromptContext: string;
	suggestedVocab: string[];
}
