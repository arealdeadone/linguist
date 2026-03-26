<script lang="ts">
	import { showToast } from '$lib/stores/toast.svelte';

	const blobCache = new Map<string, string>();

	let {
		text,
		language = 'zh',
		size = 'md',
		audioUrl
	}: { text: string; language?: string; size?: 'sm' | 'md' | 'lg'; audioUrl?: string } = $props();

	let isLoading = $state(false);
	let isPlaying = $state(false);

	const sizeMap = {
		sm: 'h-8 w-8',
		md: 'h-10 w-10',
		lg: 'h-14 w-14'
	} as const;

	const iconSizeMap = {
		sm: 'h-3.5 w-3.5',
		md: 'h-4.5 w-4.5',
		lg: 'h-6 w-6'
	} as const;

	async function play() {
		if (isLoading || isPlaying) return;
		isLoading = true;
		try {
			let url: string;

			if (audioUrl) {
				url = audioUrl;
			} else if (blobCache.has(text)) {
				url = blobCache.get(text)!;
			} else {
				const res = await fetch('/api/speech/tts', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ text, language })
				});
				if (!res.ok) throw new Error('TTS failed');
				const blob = await res.blob();
				url = URL.createObjectURL(blob);
				blobCache.set(text, url);
			}

			const audio = new Audio(url);
			isLoading = false;
			isPlaying = true;
			audio.onended = () => {
				isPlaying = false;
			};
			audio.onerror = () => {
				isPlaying = false;
			};
			await audio.play();
		} catch {
			isLoading = false;
			isPlaying = false;
			showToast('Audio playback failed. Please try again.', 'error');
		}
	}
</script>

<button
	onclick={(e) => {
		e.stopPropagation();
		play();
	}}
	disabled={isLoading}
	class="group relative flex shrink-0 items-center justify-center rounded-full
		transition-all duration-300 {sizeMap[size]}
		{isPlaying
		? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 scale-110'
		: 'bg-primary-50 text-primary-600 hover:bg-primary-100 hover:shadow-md hover:shadow-primary-200/40 active:scale-95'}
		{isLoading ? 'animate-pulse' : ''}"
	aria-label="Play audio for {text}"
>
	{#if isLoading}
		<svg class="animate-spin {iconSizeMap[size]}" viewBox="0 0 24 24" fill="none">
			<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
			<path
				class="opacity-75"
				fill="currentColor"
				d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
			/>
		</svg>
	{:else if isPlaying}
		<div class="flex items-end gap-0.5 {iconSizeMap[size]}">
			<span
				class="inline-block w-0.5 animate-[wave_0.6s_ease-in-out_infinite] rounded-full bg-white"
				style="height: 40%"
			></span>
			<span
				class="inline-block w-0.5 animate-[wave_0.6s_ease-in-out_0.15s_infinite] rounded-full bg-white"
				style="height: 70%"
			></span>
			<span
				class="inline-block w-0.5 animate-[wave_0.6s_ease-in-out_0.3s_infinite] rounded-full bg-white"
				style="height: 100%"
			></span>
			<span
				class="inline-block w-0.5 animate-[wave_0.6s_ease-in-out_0.15s_infinite] rounded-full bg-white"
				style="height: 60%"
			></span>
			<span
				class="inline-block w-0.5 animate-[wave_0.6s_ease-in-out_0s_infinite] rounded-full bg-white"
				style="height: 35%"
			></span>
		</div>
	{:else}
		<svg
			class="{iconSizeMap[size]} transition-transform duration-200 group-hover:scale-110"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
		>
			<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
			<path d="M15.54 8.46a5 5 0 010 7.07" />
			<path d="M19.07 4.93a10 10 0 010 14.14" />
		</svg>
	{/if}
</button>

<style>
	@keyframes wave {
		0%,
		100% {
			transform: scaleY(0.4);
		}
		50% {
			transform: scaleY(1);
		}
	}
</style>
