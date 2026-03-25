<script lang="ts">
	import { onDestroy } from 'svelte';

	let {
		onRecordingComplete,
		maxDurationMs = 30000
	}: { onRecordingComplete: (blob: Blob) => void; maxDurationMs?: number } = $props();

	let status = $state<'idle' | 'requesting' | 'recording' | 'done'>('idle');
	let elapsed = $state(0);
	let error = $state<string | null>(null);
	let timerInterval: ReturnType<typeof setInterval> | null = null;
	let resetTimeout: ReturnType<typeof setTimeout> | null = null;
	let mediaRecorder: MediaRecorder | null = null;
	let mediaStream: MediaStream | null = null;
	let startedAt = 0;
	let chunks: Blob[] = [];

	function clearTimer(): void {
		if (timerInterval) {
			clearInterval(timerInterval);
			timerInterval = null;
		}
	}

	function clearResetTimeout(): void {
		if (resetTimeout) {
			clearTimeout(resetTimeout);
			resetTimeout = null;
		}
	}

	function stopTracks(): void {
		if (mediaStream) {
			mediaStream.getTracks().forEach((track) => track.stop());
			mediaStream = null;
		}
	}

	function formatElapsed(ms: number): string {
		const totalSeconds = Math.floor(ms / 1000);
		const minutes = Math.floor(totalSeconds / 60)
			.toString()
			.padStart(2, '0');
		const seconds = (totalSeconds % 60).toString().padStart(2, '0');
		return `${minutes}:${seconds}`;
	}

	async function start(): Promise<void> {
		if (status !== 'idle') return;

		error = null;
		elapsed = 0;
		chunks = [];
		status = 'requesting';

		try {
			if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
				throw new Error('Microphone is not supported on this device');
			}

			mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const preferredMimeType =
				typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
					? 'audio/webm'
					: undefined;

			mediaRecorder = preferredMimeType
				? new MediaRecorder(mediaStream, { mimeType: preferredMimeType })
				: new MediaRecorder(mediaStream);

			mediaRecorder.ondataavailable = (event: BlobEvent) => {
				if (event.data.size > 0) {
					chunks.push(event.data);
				}
			};

			mediaRecorder.onerror = () => {
				error = 'Recording failed. Please try again.';
				status = 'idle';
				clearTimer();
				stopTracks();
				mediaRecorder = null;
			};

			mediaRecorder.onstop = () => {
				clearTimer();
				stopTracks();

				const mimeType = mediaRecorder?.mimeType || 'audio/webm';
				const blob = new Blob(chunks, { type: mimeType });
				chunks = [];
				mediaRecorder = null;

				if (blob.size > 0) {
					onRecordingComplete(blob);
					status = 'done';
				} else {
					error = 'No audio was captured. Please try again.';
					status = 'idle';
				}

				elapsed = 0;

				clearResetTimeout();
				if (status === 'done') {
					resetTimeout = setTimeout(() => {
						status = 'idle';
					}, 900);
				}
			};

			mediaRecorder.start();
			startedAt = Date.now();
			status = 'recording';

			timerInterval = setInterval(() => {
				elapsed = Date.now() - startedAt;
				if (elapsed >= maxDurationMs) {
					stop();
				}
			}, 100);
		} catch (err: unknown) {
			status = 'idle';
			stopTracks();
			mediaRecorder = null;
			clearTimer();
			if (err instanceof Error) {
				error =
					err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
						? 'Microphone access denied'
						: err.message;
			} else {
				error = 'Unable to access microphone';
			}
		}
	}

	function stop(): void {
		if (status !== 'recording' || !mediaRecorder) return;
		mediaRecorder.stop();
	}

	onDestroy(() => {
		clearTimer();
		clearResetTimeout();
		if (mediaRecorder && mediaRecorder.state !== 'inactive') {
			mediaRecorder.stop();
		}
		stopTracks();
	});
</script>

<div class="flex flex-col items-center gap-3">
	<button
		onclick={status === 'recording' ? stop : start}
		disabled={status === 'requesting' || status === 'done'}
		class="relative flex min-h-16 min-w-16 items-center justify-center rounded-full transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70
			{status === 'recording'
				? 'bg-error text-white shadow-xl shadow-error/30 animate-pulse'
				: 'bg-error/10 text-error hover:bg-error/15'}"
		aria-label={status === 'recording' ? 'Stop recording' : 'Start recording'}
	>
		{#if status === 'requesting'}
			<svg class="h-7 w-7 animate-spin" viewBox="0 0 24 24" fill="none">
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
				<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
			</svg>
		{:else if status === 'recording'}
			<div class="h-4 w-4 rounded-full bg-white"></div>
		{:else if status === 'done'}
			<svg
				class="h-7 w-7"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<polyline points="20 6 9 17 4 12" />
			</svg>
		{:else}
			<svg
				class="h-7 w-7"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
			>
				<path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
				<path d="M19 10v2a7 7 0 01-14 0v-2" />
				<line x1="12" y1="19" x2="12" y2="22" />
				<line x1="8" y1="22" x2="16" y2="22" />
			</svg>
		{/if}
	</button>

	{#if status === 'recording'}
		<p class="text-sm font-medium text-error">{formatElapsed(elapsed)}</p>
	{:else if status === 'done'}
		<p class="text-sm font-medium text-success">Recording complete</p>
	{/if}

	{#if error}
		<p class="max-w-xs text-center text-sm text-error">{error}</p>
	{/if}
</div>
