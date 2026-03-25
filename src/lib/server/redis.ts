import Redis from 'ioredis';
import { createHash } from 'crypto';
import { env } from '$env/dynamic/private';

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
	if (!env.REDIS_URL) return null;
	if (!redisClient) {
		redisClient = new Redis(env.REDIS_URL);
	}
	return redisClient;
}

// Key prefixes
const TTS_PREFIX = 'tts:';
const LESSON_PREFIX = 'lesson:';

const TTS_CACHE_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
const LESSON_CACHE_TTL = 60 * 60; // 1 hour in seconds

/**
 * Generate a deterministic cache key for TTS audio.
 * Key includes text, voice, and model to avoid collisions.
 */
function ttsCacheKey(text: string, voice: string, model: string): string {
	const hash = createHash('sha256').update(`${model}:${voice}:${text}`).digest('hex').slice(0, 16);
	return `${TTS_PREFIX}${hash}`;
}

/**
 * Cache TTS audio buffer in Redis.
 */
export async function cacheTTS(
	text: string,
	voice: string,
	model: string,
	audio: Buffer
): Promise<void> {
	const redis = getRedis();
	if (!redis) return;
	const key = ttsCacheKey(text, voice, model);
	await redis.setex(key, TTS_CACHE_TTL, audio);
}

/**
 * Retrieve cached TTS audio. Returns null on miss.
 */
export async function getCachedTTS(
	text: string,
	voice: string,
	model: string
): Promise<Buffer | null> {
	const redis = getRedis();
	if (!redis) return null;
	const key = ttsCacheKey(text, voice, model);
	const data = await redis.getBuffer(key);
	return data;
}

/**
 * Cache a lesson plan JSON.
 */
export async function cacheLesson(lessonId: string, plan: unknown): Promise<void> {
	const redis = getRedis();
	if (!redis) return;
	const key = `${LESSON_PREFIX}${lessonId}`;
	await redis.setex(key, LESSON_CACHE_TTL, JSON.stringify(plan));
}

/**
 * Retrieve a cached lesson plan. Returns null on miss.
 */
export async function getCachedLesson(lessonId: string): Promise<unknown | null> {
	const redis = getRedis();
	if (!redis) return null;
	const key = `${LESSON_PREFIX}${lessonId}`;
	const data = await redis.get(key);
	return data ? JSON.parse(data) : null;
}

/**
 * Delete a specific cache entry.
 */
export async function invalidateCache(key: string): Promise<void> {
	const redis = getRedis();
	if (!redis) return;
	await redis.del(key);
}

/**
 * Get Redis connection status for health checks.
 */
export async function redisHealthCheck(): Promise<boolean> {
	const redis = getRedis();
	if (!redis) return true;
	try {
		const pong = await redis.ping();
		return pong === 'PONG';
	} catch (e) {
		console.error('Redis health check failed:', e);
		return false;
	}
}

export { getRedis };
