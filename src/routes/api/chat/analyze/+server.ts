import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAIService } from '$lib/server/ai-service';

export const POST: RequestHandler = async ({ request, locals }) => {
	const learnerId = locals.learnerId;
	if (!learnerId) {
		return json({ error: 'Not authenticated' }, { status: 401 });
	}

	const { conversationId } = await request.json();
	if (!conversationId) {
		return json({ error: 'conversationId required' }, { status: 400 });
	}

	try {
		const analysis = await getAIService().analyzeConversation({ conversationId, learnerId });
		return json(analysis);
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Analysis failed';
		return json({ error: msg }, { status: 500 });
	}
};
