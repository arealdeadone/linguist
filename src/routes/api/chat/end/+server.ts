import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { completeConversation } from '$lib/server/data/conversations';

interface EndConversationBody {
	conversationId?: string;
}

export const POST: RequestHandler = async ({ request }) => {
	const body = (await request.json()) as EndConversationBody;
	const conversationId = body.conversationId?.trim();

	if (!conversationId) {
		return json({ error: 'conversationId required' }, { status: 400 });
	}

	const conversation = await completeConversation(conversationId);
	if (!conversation) {
		return json({ error: 'Not found' }, { status: 404 });
	}

	return json(conversation);
};
