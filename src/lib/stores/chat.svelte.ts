import type { ConversationAnalysis } from '$lib/types/conversation';

export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
	timestamp: Date;
	audioUrl?: string;
}

let messages = $state<ChatMessage[]>([]);
let isStreaming = $state(false);
let currentStreamText = $state('');
let conversationId = $state<string | null>(null);
let error = $state<string | null>(null);
let analysis = $state<ConversationAnalysis | null>(null);
let isAnalyzing = $state(false);

export function getChat() {
	return {
		get messages() {
			return messages;
		},
		get isStreaming() {
			return isStreaming;
		},
		get currentStreamText() {
			return currentStreamText;
		},
		get conversationId() {
			return conversationId;
		},
		get error() {
			return error;
		},
		get analysis() {
			return analysis;
		},
		get isAnalyzing() {
			return isAnalyzing;
		}
	};
}

export async function sendMessage(
	text: string,
	learnerId: string,
	scenario?: string
): Promise<void> {
	messages = [...messages, { role: 'user', content: text, timestamp: new Date() }];

	isStreaming = true;
	currentStreamText = '';
	error = null;

	try {
		const res = await fetch('/api/chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				learnerId,
				message: text,
				conversationId: conversationId ?? undefined,
				scenario
			})
		});

		if (!res.ok) {
			const errBody = (await res.json()) as { error?: string };
			throw new Error(errBody.error ?? 'Chat request failed');
		}

		const result = (await res.json()) as { response: string; conversationId: string };

		if (result.conversationId) {
			conversationId = result.conversationId;
		}

		if (result.response?.trim().length > 0) {
			messages = [
				...messages,
				{ role: 'assistant', content: result.response, timestamp: new Date() }
			];
		}
	} catch (err) {
		error = err instanceof Error ? err.message : 'Failed to send message';
	} finally {
		currentStreamText = '';
		isStreaming = false;
	}
}

export async function sendAudioMessage(
	blob: Blob,
	learnerId: string,
	language: string,
	scenario?: string
): Promise<void> {
	error = null;
	isStreaming = true;

	try {
		const formData = new FormData();
		const mime = blob.type && blob.type.length > 0 ? blob.type : 'audio/webm';
		const ext = mime.includes('wav') ? 'wav' : mime.includes('mp4') ? 'mp4' : 'webm';
		formData.append('audio', new File([blob], `recording.${ext}`, { type: mime }));
		formData.append('language', language);

		const res = await fetch('/api/speech/stt', {
			method: 'POST',
			body: formData
		});

		if (!res.ok) {
			throw new Error('Transcription failed');
		}

		const result = (await res.json()) as { text: string };
		if (!result.text?.trim()) {
			throw new Error('No speech detected');
		}

		isStreaming = false;
		await sendMessage(result.text, learnerId, scenario);
	} catch (err) {
		error = err instanceof Error ? err.message : 'Audio processing failed';
		isStreaming = false;
	}
}

export async function endSession(learnerId: string): Promise<ConversationAnalysis | null> {
	if (!conversationId) return null;

	try {
		await fetch('/api/chat/end', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ conversationId })
		});

		isAnalyzing = true;

		const res = await fetch('/api/chat/analyze', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ conversationId, learnerId })
		});

		if (res.ok) {
			analysis = (await res.json()) as ConversationAnalysis;
			return analysis;
		}

		return null;
	} catch (e) {
		error = e instanceof Error ? e.message : 'Session analysis failed';
		return null;
	} finally {
		isAnalyzing = false;
	}
}

export async function initiateConversation(learnerId: string, scenario?: string): Promise<void> {
	await sendMessage('[START]', learnerId, scenario);
}

export function clearChat(): void {
	messages = [];
	conversationId = null;
	currentStreamText = '';
	error = null;
	analysis = null;
	isAnalyzing = false;
	isStreaming = false;
}
