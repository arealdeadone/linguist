import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAIService } from '$lib/server/ai-service';

interface ChatRequestBody {
	conversationId?: string;
	message?: string;
	learnerId?: string;
	scenario?: string;
}

function getStatusForChatError(message: string): number {
	if (message === 'learnerId and message required' || message === 'Learner language profile invalid') {
		return 400;
	}

	if (message === 'Learner not found' || message === 'Conversation not found') {
		return 404;
	}

	if (message === 'Conversation no longer exists') {
		return 409;
	}

	if (
		message === 'Conversation does not belong to learner' ||
		message === 'Failed to initialize conversation' ||
		message === 'Failed to persist user message'
	) {
		return 500;
	}

	return 500;
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = (await request.json()) as ChatRequestBody;
		const learnerId = body.learnerId?.trim();
		const message = body.message?.trim();
		const conversationId = body.conversationId?.trim();
		const scenario = body.scenario?.trim();

		if (!learnerId || !message) {
			return json({ error: 'learnerId and message required' }, { status: 400 });
		}

		const result = await getAIService().chat({ learnerId, message, conversationId, scenario });

		return json({ response: result.response, conversationId: result.conversationId });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Chat failed';
		return json({ error: msg }, { status: getStatusForChatError(msg) });
	}
};
