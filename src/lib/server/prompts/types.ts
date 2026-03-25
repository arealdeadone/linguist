export interface TutorPromptSections {
	role: string;
	mainLanguage: string;
	explanationLanguage: string;
	languageRules: string[];
	i1Policy: string[];
	errorCorrection: string[];
	responseStyle: string[];
	avoidList: string[];
	codeSwitching: string[];
	cefrStyles: Record<string, string>;
	languageLabels: Record<string, string>;
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isStringRecord(value: unknown): value is Record<string, string> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	return Object.values(value).every((entry) => typeof entry === 'string');
}

export function isTutorPromptSections(value: unknown): value is TutorPromptSections {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;

	const candidate = value as Record<string, unknown>;

	return (
		typeof candidate.role === 'string' &&
		typeof candidate.mainLanguage === 'string' &&
		typeof candidate.explanationLanguage === 'string' &&
		isStringArray(candidate.languageRules) &&
		isStringArray(candidate.i1Policy) &&
		isStringArray(candidate.errorCorrection) &&
		isStringArray(candidate.responseStyle) &&
		isStringArray(candidate.avoidList) &&
		isStringArray(candidate.codeSwitching) &&
		isStringRecord(candidate.cefrStyles) &&
		isStringRecord(candidate.languageLabels)
	);
}
