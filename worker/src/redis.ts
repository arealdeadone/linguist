import Redis from 'ioredis';
import { createHash } from 'crypto';
import { config } from './config';
import { TTS_CACHE_TTL_SECONDS } from '@linguist/ai-core';

let _redis: Redis | null = null;

function getRedis(): Redis {
	if (!_redis) {
		_redis = new Redis(config.redisUrl);
	}
	return _redis;
}

function ttsCacheKey(text: string, voice: string): string {
	const hash = createHash('sha256').update(`${text}:${voice}`).digest('hex');
	return `tts:${hash}`;
}

export async function getCachedTTS(text: string, voice: string): Promise<Buffer | null> {
	const key = ttsCacheKey(text, voice);
	const cached = await getRedis().getBuffer(key);
	return cached;
}

export async function cacheTTS(text: string, voice: string, audio: Buffer): Promise<void> {
	const key = ttsCacheKey(text, voice);
	await getRedis().setex(key, TTS_CACHE_TTL_SECONDS, audio);
}

export async function closeRedis(): Promise<void> {
	if (_redis) {
		await _redis.quit();
		_redis = null;
	}
}
