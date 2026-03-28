<script lang="ts">
	import { onDestroy, tick } from 'svelte';
	import { fly, fade } from 'svelte/transition';
	import {
		getChat,
		sendMessage,
		sendAudioMessage,
		endSession,
		clearChat
	} from '$lib/stores/chat.svelte';
	import { playTTS, getRecordingState } from '$lib/stores/audio.svelte';
	import AudioRecorder from './AudioRecorder.svelte';

	let {
		learnerId,
		scenario,
		targetLanguage,
		onSessionEnd
	}: {
		learnerId: string;
		scenario?: string;
		targetLanguage: string;
		onSessionEnd?: () => void;
	} = $props();

	const chat = getChat();
	const audioState = $derived(getRecordingState());

	let inputText = $state('');
	let messagesContainer: HTMLDivElement | undefined = $state();
	let showRecorder = $state(false);
	let isEnding = $state(false);
	let playingMessageIndex = $state<number | null>(null);
	let lastAutoPlayedIndex = $state(-1);
	let audioUnlocked = $state(false);

	const canSend = $derived(inputText.trim().length > 0 && !chat.isStreaming);

	function unlockAudio(): void {
		if (audioUnlocked) return;
		const ctx = new AudioContext();
		ctx
			.resume()
			.then(() => ctx.close())
			.catch((e) => console.error('AudioContext unlock failed:', e));
		audioUnlocked = true;
	}

	async function scrollToBottom(): Promise<void> {
		await tick();
		if (messagesContainer) {
			messagesContainer.scrollTop = messagesContainer.scrollHeight;
		}
	}

	$effect(() => {
		if (chat.messages.length > 0 || chat.isStreaming) {
			scrollToBottom();
		}
	});

	$effect(() => {
		const msgs = chat.messages;
		if (msgs.length > 0 && !chat.isStreaming) {
			const lastIdx = msgs.length - 1;
			const lastMsg = msgs[lastIdx];
			if (lastMsg.role === 'assistant' && lastIdx > lastAutoPlayedIndex) {
				lastAutoPlayedIndex = lastIdx;
				playTTS(lastMsg.content);
			}
		}
	});

	async function handleSend(): Promise<void> {
		const text = inputText.trim();
		if (!text || chat.isStreaming) return;
		unlockAudio();
		inputText = '';
		await sendMessage(text, learnerId, scenario);
	}

	function handleKeydown(e: KeyboardEvent): void {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	async function handleRecordingComplete(blob: Blob): Promise<void> {
		showRecorder = false;
		unlockAudio();
		await sendAudioMessage(blob, learnerId, targetLanguage, scenario);
	}

	async function handlePlayTTS(text: string, index: number): Promise<void> {
		playingMessageIndex = index;
		await playTTS(text);
		playingMessageIndex = null;
	}

	async function handleEndSession(): Promise<void> {
		isEnding = true;
		await endSession(learnerId);
		isEnding = false;
		if (onSessionEnd) onSessionEnd();
	}

	function formatTime(date: Date): string {
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	onDestroy(() => {
		clearChat();
	});
</script>

<div class="flex h-full flex-col">
	<div
		class="flex items-center justify-between border-b border-surface-200 bg-white/90 px-4 py-3 backdrop-blur-sm"
	>
		<div class="flex items-center gap-3">
			<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100">
				<svg
					class="h-5 w-5 text-primary-600"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path
						d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
					/>
				</svg>
			</div>
			<div>
				<p class="text-sm font-semibold text-surface-800">AI Tutor</p>
				{#if chat.isStreaming}
					<p class="text-xs text-success">thinking…</p>
				{:else}
					<p class="text-xs text-surface-400">online</p>
				{/if}
			</div>
		</div>

		<button
			onclick={handleEndSession}
			disabled={isEnding || chat.isAnalyzing || chat.messages.length === 0}
			class="flex items-center gap-1.5 rounded-xl border border-error/20 bg-error/5 px-3 py-2 text-xs font-medium text-error transition-all hover:bg-error/10 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
		>
			{#if isEnding || chat.isAnalyzing}
				<svg class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
					<circle
						class="opacity-25"
						cx="12"
						cy="12"
						r="10"
						stroke="currentColor"
						stroke-width="3"
					/>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
					/>
				</svg>
				Analyzing…
			{:else}
				<svg
					class="h-3.5 w-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
					<line x1="9" y1="9" x2="15" y2="15" />
					<line x1="15" y1="9" x2="9" y2="15" />
				</svg>
				End Session
			{/if}
		</button>
	</div>

	<div
		bind:this={messagesContainer}
		class="flex-1 overflow-y-auto scroll-smooth px-4 py-4"
		style="scrollbar-width: thin; scrollbar-color: var(--color-surface-300) transparent;"
	>
		{#if chat.messages.length === 0 && !chat.isStreaming}
			<div
				class="flex h-full flex-col items-center justify-center px-6"
				in:fade={{ duration: 300 }}
			>
				<div class="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary-50">
					<svg
						class="h-10 w-10 text-primary-400"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					</svg>
				</div>
				<p class="mt-5 text-center font-display text-lg text-surface-700">
					Start your conversation
				</p>
				<p class="mt-2 max-w-xs text-center text-sm text-surface-400">
					Type a message or tap the microphone to begin practicing
				</p>
			</div>
		{:else}
			<div class="space-y-3">
				{#each chat.messages.filter((m) => m.content !== '[START]') as msg, i (i)}
					<div
						class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}"
						in:fly={{ y: 12, duration: 200, delay: 30 }}
					>
						<div
							class="group relative max-w-[85%] {msg.role === 'user'
								? 'rounded-2xl rounded-br-md bg-primary-600 px-4 py-3 text-white shadow-sm shadow-primary-600/20'
								: 'rounded-2xl rounded-bl-md border border-surface-100 bg-white px-4 py-3 text-surface-800 shadow-sm'}"
						>
							<p class="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
							<div
								class="mt-1.5 flex items-center gap-2 {msg.role === 'user'
									? 'justify-end'
									: 'justify-between'}"
							>
								{#if msg.role === 'assistant'}
									<button
										onclick={() => handlePlayTTS(msg.content, i)}
										disabled={audioState.isPlaying}
										class="flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-primary-500 disabled:opacity-40"
										aria-label="Play audio"
									>
										{#if playingMessageIndex === i}
											<svg
												class="h-3.5 w-3.5 animate-pulse"
												viewBox="0 0 24 24"
												fill="currentColor"
											>
												<rect x="4" y="4" width="4" height="16" rx="1" />
												<rect x="10" y="7" width="4" height="10" rx="1" />
												<rect x="16" y="2" width="4" height="20" rx="1" />
											</svg>
										{:else}
											<svg
												class="h-3.5 w-3.5"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												stroke-width="2"
												stroke-linecap="round"
												stroke-linejoin="round"
											>
												<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
												<path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
											</svg>
										{/if}
									</button>
								{/if}
								<span
									class="text-[10px] {msg.role === 'user'
										? 'text-primary-200'
										: 'text-surface-300'}"
								>
									{formatTime(msg.timestamp)}
								</span>
							</div>
						</div>
					</div>
				{/each}

				{#if chat.isStreaming}
					<div class="flex justify-start" in:fade={{ duration: 150 }}>
						<div
							class="rounded-2xl rounded-bl-md border border-surface-100 bg-white px-5 py-4 shadow-sm"
						>
							<div class="flex items-center gap-1.5">
								<span
									class="h-2 w-2 animate-bounce rounded-full bg-surface-300"
									style="animation-delay: 0ms"
								></span>
								<span
									class="h-2 w-2 animate-bounce rounded-full bg-surface-300"
									style="animation-delay: 150ms"
								></span>
								<span
									class="h-2 w-2 animate-bounce rounded-full bg-surface-300"
									style="animation-delay: 300ms"
								></span>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if chat.error}
		<div
			class="mx-4 mb-2 rounded-xl bg-error/10 px-4 py-2.5 text-xs text-error"
			in:fly={{ y: 8, duration: 200 }}
		>
			{chat.error}
		</div>
	{/if}

	{#if showRecorder}
		<div
			class="border-t border-surface-200 bg-surface-50 px-4 py-4"
			in:fly={{ y: 20, duration: 200 }}
		>
			<div class="flex items-center justify-between">
				<button
					onclick={() => (showRecorder = false)}
					class="rounded-lg px-3 py-1.5 text-xs font-medium text-surface-500 transition-colors hover:bg-surface-200"
				>
					Cancel
				</button>
				<AudioRecorder onRecordingComplete={handleRecordingComplete} maxDurationMs={60000} />
				<div class="w-16"></div>
			</div>
		</div>
	{:else}
		<div class="border-t border-surface-200 bg-white px-3 py-3">
			<div class="flex items-end gap-2">
				<button
					onclick={() => (showRecorder = true)}
					disabled={chat.isStreaming}
					class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-error/10 text-error transition-all hover:bg-error/15 active:scale-95 disabled:opacity-40"
					aria-label="Record audio"
				>
					<svg
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
						<path d="M19 10v2a7 7 0 01-14 0v-2" />
						<line x1="12" y1="19" x2="12" y2="23" />
						<line x1="8" y1="23" x2="16" y2="23" />
					</svg>
				</button>

				<div class="relative flex-1">
					<input
						type="text"
						bind:value={inputText}
						onkeydown={handleKeydown}
						disabled={chat.isStreaming}
						placeholder="Type a message…"
						class="w-full rounded-xl border border-surface-200 bg-surface-50 px-4 py-3 pr-12 text-sm text-surface-800 placeholder:text-surface-400 focus:border-primary-300 focus:bg-white focus:ring-2 focus:ring-primary-100 focus:outline-none disabled:opacity-50"
					/>
				</div>

				<button
					onclick={handleSend}
					disabled={!canSend}
					class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-600 text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:shadow-none"
					aria-label="Send message"
				>
					<svg
						class="h-5 w-5"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="22" y1="2" x2="11" y2="13" />
						<polygon points="22 2 15 22 11 13 2 9 22 2" />
					</svg>
				</button>
			</div>
		</div>
	{/if}
</div>
