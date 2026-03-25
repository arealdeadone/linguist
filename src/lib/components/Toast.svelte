<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { dismissToast, getToasts } from '$lib/stores/toast.svelte';

	const toasts = $derived(getToasts());

	function toastClass(type: 'error' | 'success' | 'info'): string {
		if (type === 'success') return 'border-success/20 bg-success/10 text-success';
		if (type === 'info') return 'border-info/20 bg-info/10 text-info';
		return 'border-error/20 bg-error/10 text-error';
	}
</script>

<div
	class="pointer-events-none fixed top-4 left-1/2 z-[100] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4"
>
	{#each toasts as toast (toast.id)}
		<div
			class="pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm {toastClass(
				toast.type
			)}"
			in:fly={{ y: -12, duration: 180 }}
			out:fade={{ duration: 160 }}
		>
			<p class="flex-1 text-sm leading-relaxed">{toast.message}</p>
			<button
				onclick={() => dismissToast(toast.id)}
				class="rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
				aria-label="Dismiss notification"
			>
				<svg
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>
	{/each}
</div>
