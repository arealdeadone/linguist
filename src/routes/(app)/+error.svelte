<script lang="ts">
	import { page } from '$app/stores';
	import { getNetworkStatus } from '$lib/stores/network.svelte';

	const isOnline = $derived(getNetworkStatus());
	const statusCode = $derived($page.status);
	const errorMessage = $derived($page.error?.message ?? 'An unknown error occurred');

	const titleByStatus: Record<number, string> = {
		404: 'Page not found',
		500: 'Something went wrong',
		503: 'Service unavailable'
	};

	const friendlyTitle = $derived(titleByStatus[statusCode] ?? `Error ${statusCode}`);
</script>

<div class="mx-auto flex min-h-[calc(100vh-9rem)] max-w-2xl items-center px-4 py-8">
	<div
		class="w-full rounded-3xl border border-primary-100 bg-white p-8 shadow-xl shadow-primary-900/5 md:p-10"
	>
		<div
			class="mb-6 inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold tracking-wide text-primary-600 uppercase"
		>
			Error {statusCode}
		</div>

		<h1 class="font-display text-3xl text-surface-900 md:text-4xl">{friendlyTitle}</h1>
		<p class="mt-3 text-surface-500">{errorMessage}</p>

		{#if !isOnline}
			<div
				class="mt-5 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-surface-700"
			>
				You appear to be offline. Please check your connection and try again.
			</div>
		{/if}

		<div class="mt-8 flex flex-wrap gap-3">
			<a
				href="/"
				class="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-primary-700 hover:shadow-md active:scale-[0.98]"
			>
				Go Home
			</a>
		</div>
	</div>
</div>
