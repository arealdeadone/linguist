import { and, eq, inArray, ne } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { lessons, vocabulary } from '$lib/server/schema';

type LessonRow = typeof lessons.$inferSelect;

function extractVocabWords(plan: Record<string, unknown>): string[] {
	const targets = plan.vocabulary_targets;
	if (!Array.isArray(targets)) {
		return [];
	}

	const words = new Set<string>();
	for (const target of targets) {
		if (typeof target === 'string' && target.trim()) {
			words.add(target.trim());
			continue;
		}

		if (typeof target !== 'object' || target === null) {
			continue;
		}

		const word = (target as Record<string, unknown>).word;
		if (typeof word === 'string' && word.trim()) {
			words.add(word.trim());
		}
	}

	return [...words];
}

export function getLessonVocabCount(plan: Record<string, unknown>): number {
	return extractVocabWords(plan).length;
}

export async function deleteLessonAndOrphanedVocab(lesson: LessonRow): Promise<string[]> {
	const lessonPlan = lesson.plan as Record<string, unknown>;
	const lessonWords = extractVocabWords(lessonPlan);

	if (lessonWords.length > 0) {
		const otherLessons = await db
			.select({ plan: lessons.plan })
			.from(lessons)
			.where(and(eq(lessons.learnerId, lesson.learnerId), ne(lessons.id, lesson.id)));

		const wordsInOtherLessons = new Set<string>();
		for (const other of otherLessons) {
			const otherWords = extractVocabWords(other.plan as Record<string, unknown>);
			for (const word of otherWords) {
				wordsInOtherLessons.add(word);
			}
		}

		const orphanedWords = lessonWords.filter((word) => !wordsInOtherLessons.has(word));

		if (orphanedWords.length > 0) {
			await db
				.delete(vocabulary)
				.where(
					and(eq(vocabulary.learnerId, lesson.learnerId), inArray(vocabulary.word, orphanedWords))
				);
		}

		await db.delete(lessons).where(eq(lessons.id, lesson.id));
		return orphanedWords;
	}

	await db.delete(lessons).where(eq(lessons.id, lesson.id));
	return [];
}
