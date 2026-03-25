import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies }) => {
	const learnerId = cookies.get('learner_id');
	return { learnerId: learnerId ?? null };
};
