import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAIService } from '$lib/server/ai-service';

interface ChatRequestBody {
	conversationId?: string;
	message?: string;
	scenario?: string;
}

function getStatusForChatError(message: string): number {
	if (message === 'message required' || message === 'Learner language profile invalid') {
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

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const learnerId = locals.learnerId;
		if (!learnerId) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		const body = (await request.json()) as ChatRequestBody;
		const message = body.message?.trim();
		const conversationId = body.conversationId?.trim();
		const scenario = body.scenario?.trim();

		if (!message) {
			return json({ error: 'message required' }, { status: 400 });
		}

		const result = await getAIService().chat({ learnerId, message, conversationId, scenario });

		return json({ response: result.response, conversationId: result.conversationId });
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Chat failed';
		return json({ error: msg }, { status: getStatusForChatError(msg) });
	}
};
