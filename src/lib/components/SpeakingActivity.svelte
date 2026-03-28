<script lang="ts">
	import AudioPlayer from './AudioPlayer.svelte';
	import AudioRecorder from './AudioRecorder.svelte';
	import PronunciationFeedback from './PronunciationFeedback.svelte';

	interface PronunciationCorrection {
		word: string;
		expected: string;
		got: string;
		issue: string;
	}

	interface ToneError {
		expected: string;
		got: string;
		pinyin: string;
		expectedTone: number;
		actualTone: number;
	}

	interface PronunciationEvaluation {
		score: number;
		correct: boolean;
		feedback: string;
		corrections: PronunciationCorrection[];
		toneErrors?: ToneError[];
	}

	interface SttResponse {
		text: string;
		language: string;
	}

	let {
		targetPhrase,
		romanization,
		language,
		lessonLanguage,
		audioUrl,
		onComplete
	}: {
		targetPhrase: string;
		romanization?: string;
		language: string;
		lessonLanguage: string;
		audioUrl?: string;
		onComplete: (result?: { score: number; correct: boolean }) => void;
	} = $props();

	let transcript = $state('');
	let evaluation = $state<PronunciationEvaluation | null>(null);
	let isProcessing = $state(false);
	let error = $state<string | null>(null);
	let isSystemError = $state(false);

	async function handleRecordingComplete(blob: Blob): Promise<void> {
		isProcessing = true;
		error = null;
		isSystemError = false;
		evaluation = null;

		try {
			const formData = new FormData();
			const mime = blob.type && blob.type.length > 0 ? blob.type : 'audio/webm';
			const ext = mime.includes('wav')
				? 'wav'
				: mime.includes('mp4') || mime.includes('m4a')
					? 'mp4'
					: 'webm';
			formData.append('audio', new File([blob], `recording.${ext}`, { type: mime }));
			formData.append('language', language);

			const sttResponse = await fetch('/api/speech/stt', {
				method: 'POST',
				body: formData
			});

			if (!sttResponse.ok) {
				const errData = await sttResponse.json().catch((e: unknown) => {
					console.error('Failed to parse STT error response:', e);
					return {};
				});
				const errMsg = (errData as { error?: string }).error;
				isSystemError = true;
				throw new Error(
					errMsg ?? 'Speech recognition service is temporarily unavailable. Please try again.'
				);
			}

			const sttPayload = (await sttResponse.json()) as SttResponse;
			transcript = sttPayload.text?.trim() ?? '';

			if (!transcript) {
				isSystemError = false;
				throw new Error(
					'No speech was detected. Please speak louder and closer to the microphone.'
				);
			}

			const evaluationResponse = await fetch('/api/speech/evaluate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					transcript,
					expected: targetPhrase,
					language,
					lessonLanguage
				})
			});

			if (!evaluationResponse.ok) {
				const errData = await evaluationResponse.json().catch((e: unknown) => {
					console.error('Failed to parse evaluation error response:', e);
					return {};
				});
				const errMsg = (errData as { error?: string }).error;
				isSystemError = true;
				throw new Error(
					errMsg ??
						'Evaluation service is temporarily unavailable. Your recording was captured — please try again.'
				);
			}

			const evalResult = (await evaluationResponse.json()) as PronunciationEvaluation & {
				systemError?: boolean;
			};

			if (evalResult.score === -1 || evalResult.systemError) {
				isSystemError = true;
				error = evalResult.feedback;
				return;
			}

			evaluation = evalResult;
		} catch (err: unknown) {
			error =
				err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
		} finally {
			isProcessing = false;
		}
	}

	function tryAgain(): void {
		transcript = '';
		evaluation = null;
		error = null;
		isSystemError = false;
	}

	function goNext(): void {
		if (!evaluation) return;
		onComplete({ score: evaluation.score, correct: evaluation.correct });
	}

	function skip(): void {
		onComplete();
	}
</script>

<div class="space-y-5 rounded-2xl border border-surface-200 bg-white p-4 shadow-sm sm:p-6">
	<div class="space-y-3 text-center">
		<p class="text-xs font-semibold uppercase tracking-wide text-surface-400">Listen and repeat</p>
		<p class="font-display text-4xl text-surface-900 sm:text-5xl">{targetPhrase}</p>
		{#if romanization}
			<p class="text-base text-primary-600">{romanization}</p>
		{/if}
		<div class="flex justify-center pt-1">
			<AudioPlayer text={targetPhrase} {language} {audioUrl} size="lg" />
		</div>
	</div>

	<div class="rounded-xl bg-surface-50 p-4 text-center">
		<p class="mb-3 text-sm font-medium text-surface-600">Your turn</p>
		<AudioRecorder onRecordingComplete={handleRecordingComplete} />
	</div>

	{#if isProcessing}
		<div
			class="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-700"
		>
			Processing your pronunciation...
		</div>
	{/if}

	{#if transcript}
		<div class="rounded-xl border border-surface-200 bg-surface-50 px-4 py-3">
			<p class="text-xs font-semibold uppercase tracking-wide text-surface-400">Transcript heard</p>
			<p class="mt-1 text-base text-surface-800">{transcript}</p>
		</div>
	{/if}

	{#if error}
		<div
			class="rounded-xl border px-4 py-3 text-sm {isSystemError
				? 'border-amber-200 bg-amber-50 text-amber-800'
				: 'border-surface-200 bg-surface-50 text-surface-700'}"
		>
			<div class="flex items-start gap-2">
				{#if isSystemError}
					<span class="shrink-0 text-lg">⚠️</span>
				{:else}
					<span class="shrink-0 text-lg">🎤</span>
				{/if}
				<div>
					<p>{error}</p>
					{#if isSystemError}
						<p class="mt-1 text-xs opacity-70">This is a system issue, not your pronunciation.</p>
					{/if}
				</div>
			</div>
			<button
				onclick={tryAgain}
				class="mt-3 w-full rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm transition hover:shadow-md active:scale-95 {isSystemError
					? 'text-amber-700 border border-amber-200'
					: 'text-surface-700 border border-surface-200'}"
			>
				Try Again
			</button>
			<button
				onclick={skip}
				class="mt-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-surface-400 transition hover:text-surface-600"
			>
				Skip Word
			</button>
		</div>
	{/if}

	{#if evaluation}
		<PronunciationFeedback {evaluation} />

		<div class="flex gap-3">
			<button
				onclick={tryAgain}
				class="flex-1 rounded-xl border border-surface-200 px-4 py-3 text-sm font-medium text-surface-600 transition hover:bg-surface-50"
			>
				Try Again
			</button>
			<button
				onclick={goNext}
				class="flex-1 rounded-xl bg-primary-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-primary-700"
			>
				Next
			</button>
		</div>
	{/if}
</div>
