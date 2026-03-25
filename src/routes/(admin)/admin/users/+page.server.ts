import type { PageServerLoad } from './$types';
import { getLanguageNames } from '$lib/server/data/languages';
import { getAllLearners } from '$lib/server/data/learners';
import { getVocabCount, getDueCount } from '$lib/server/data/vocabulary';

export const load: PageServerLoad = async () => {
	const learners = await getAllLearners();
	const languageNames = await getLanguageNames();
	const users = await Promise.all(
		learners.map(async (l) => {
			const [vocabCount, dueCount] = await Promise.all([getVocabCount(l.id), getDueCount(l.id)]);
			return { ...l, vocabCount, dueCount };
		})
	);

	const languages = Object.entries(languageNames).map(([code, name]) => ({
		value: code,
		label: `${name} (${code})`
	}));

	return { users, languages };
};
