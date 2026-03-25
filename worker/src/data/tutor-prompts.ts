import { eq } from 'drizzle-orm';
import { db } from '../db';
import { tutorPrompts } from '../schema';
import type { TutorPromptSections } from '../prompts/types';
import { isTutorPromptSections } from '../prompts/types';

export async function getPromptForLanguage(language: string): Promise<TutorPromptSections | null> {
	const normalizedLanguage = language.trim().toLowerCase();
	const rows = await db
		.select({ sections: tutorPrompts.sections })
		.from(tutorPrompts)
		.where(eq(tutorPrompts.language, normalizedLanguage))
		.limit(1);

	const row = rows[0];
	if (!row) return null;

	if (!isTutorPromptSections(row.sections)) {
		console.error('Invalid tutor prompt sections found in DB for language:', normalizedLanguage);
		return null;
	}

	return row.sections;
}

export async function upsertPrompt(language: string, sections: TutorPromptSections): Promise<void> {
	const normalizedLanguage = language.trim().toLowerCase();

	await db
		.insert(tutorPrompts)
		.values({
			language: normalizedLanguage,
			sections,
			updatedAt: new Date()
		})
		.onConflictDoUpdate({
			target: tutorPrompts.language,
			set: {
				sections,
				updatedAt: new Date()
			}
		});
}
