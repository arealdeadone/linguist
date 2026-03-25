const LESSON_CACHE = 'linguist-lessons';

export async function precacheLesson(lessonId: string): Promise<void> {
	const cache = await caches.open(LESSON_CACHE);

	const lessonUrl = `/api/lessons/${lessonId}`;
	const lessonRes = await fetch(lessonUrl);
	if (!lessonRes.ok) throw new Error('Failed to fetch lesson');

	await cache.put(lessonUrl, lessonRes.clone());

	const lesson = await lessonRes.json();
	const plan = lesson.plan;
	if (!plan?.vocabulary_targets) return;

	const vocabWords: string[] = Array.isArray(plan.vocabulary_targets)
		? plan.vocabulary_targets
				.map((v: { word?: string } | string) => (typeof v === 'string' ? v : (v.word ?? '')))
				.filter(Boolean)
		: [];

	const ttsPromises = vocabWords.map(async (word) => {
		const ttsRes = await fetch('/api/speech/tts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text: word })
		});
		if (ttsRes.ok) {
			const cacheKey = new Request(`/api/speech/tts?text=${encodeURIComponent(word)}`);
			await cache.put(cacheKey, ttsRes);
		}
	});

	await Promise.allSettled(ttsPromises);
}

export async function isLessonCached(lessonId: string): Promise<boolean> {
	try {
		const cache = await caches.open(LESSON_CACHE);
		const match = await cache.match(`/api/lessons/${lessonId}`);
		return !!match;
	} catch (e) {
		console.error('Lesson precache failed:', e);
		return false;
	}
}

export async function removeLessonCache(lessonId: string): Promise<void> {
	const cache = await caches.open(LESSON_CACHE);
	await cache.delete(`/api/lessons/${lessonId}`);
}
