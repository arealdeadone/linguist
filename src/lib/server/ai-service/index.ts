import { env } from '$env/dynamic/private';
import type { AIService } from '$lib/types';
import { LocalAIService } from './local';
import { QueueAIService } from './queue';

let _instance: AIService | null = null;

export function getAIService(): AIService {
	if (!_instance) {
		const mode = env.AI_MODE ?? 'local';
		if (mode === 'queue') {
			_instance = new QueueAIService();
		} else {
			_instance = new LocalAIService();
		}
	}

	return _instance;
}

export { LocalAIService, QueueAIService };
export type { AIService };
