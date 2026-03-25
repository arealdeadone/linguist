<script lang="ts">
	import { page } from '$app/stores';
	import { goto, invalidateAll, onNavigate } from '$app/navigation';
	import { getActiveLearner, clearLearner, loadLearner } from '$lib/stores/learner.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { showToast } from '$lib/stores/toast.svelte';
	import type { LayoutData } from './$types';
	import type { Snippet } from 'svelte';

	let { data, children }: { data: LayoutData; children: Snippet } = $props();

	const activeLearner = $derived(getActiveLearner());

	let hasLoggedOut = $state(false);

	$effect(() => {
		if (hasLoggedOut || !data.learnerId || activeLearner) return;
		loadLearner(data.learnerId).catch(() => {
			showToast('Could not restore learner session. Please log in again.', 'error');
		});
	});

	const navItems = [
		{ href: '/', label: 'Home', icon: 'home' },
		{ href: '/dashboard', label: 'Dashboard', icon: 'bar-chart' },
		{ href: '/learn', label: 'Learn', icon: 'book' },
		{ href: '/review', label: 'Review', icon: 'refresh' },
		{ href: '/write', label: 'Write', icon: 'pencil' },
		{ href: '/converse', label: 'Converse', icon: 'chat' }
	] as const;

	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			try {
				document.startViewTransition(async () => {
					resolve();
					await navigation.complete;
				});
			} catch (e) {
				console.error('View transition failed:', e);
				resolve();
			}
		});
	});

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}

	async function switchProfile() {
		hasLoggedOut = true;
		clearLearner();
		try {
			await fetch('/api/profile', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'logout' })
			});
			await invalidateAll();
			await goto('/');
		} catch {
			showToast('Could not switch profile. Please try again.', 'error');
			hasLoggedOut = false;
		}
	}
</script>

<Toast />

<header
	class="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-primary-900 px-5 py-3.5 text-white shadow-lg shadow-primary-950/20"
>
	<div>
		<h1 class="font-display text-xl tracking-tight">Linguist</h1>
		{#if !activeLearner}
			<p class="text-xs text-primary-300">Log in to start learning</p>
		{/if}
	</div>
	<div class="flex items-center gap-3">
		{#if activeLearner}
			<span class="text-sm text-primary-200">{activeLearner.name}</span>
			<button
				onclick={switchProfile}
				class="flex items-center gap-1.5 rounded-lg bg-primary-800 px-2.5 py-1.5 text-xs text-primary-300 transition-colors hover:bg-primary-700 hover:text-white"
			>
				<svg
					class="h-3.5 w-3.5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
					<circle cx="8.5" cy="7" r="4" />
					<path d="M20 8v6M23 11h-6" />
				</svg>
				Switch
			</button>
		{/if}
	</div>
</header>

<main class="min-h-screen px-4 pt-16 {activeLearner ? 'pb-20 md:pb-6 md:pl-56' : 'pb-6'}">
	{@render children()}
</main>

{#if activeLearner}
	<nav
		class="fixed bottom-0 left-0 right-0 z-50 flex border-t border-surface-200 bg-white/95 backdrop-blur-sm md:hidden"
	>
		{#each navItems as item}
			{@const active = isActive(item.href, $page.url.pathname)}
			<a
				href={item.href}
				class="relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-colors duration-200
					{active ? 'text-primary-600 font-semibold' : 'text-surface-400'}"
			>
				{#if active}
					<span
						class="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary-500"
					></span>
				{/if}
				<svg
					class="h-5 w-5"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					{#if item.icon === 'home'}
						<path
							d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"
						/>
					{:else if item.icon === 'bar-chart'}
						<line x1="18" y1="20" x2="18" y2="10" />
						<line x1="12" y1="20" x2="12" y2="4" />
						<line x1="6" y1="20" x2="6" y2="14" />
					{:else if item.icon === 'book'}
						<path
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					{:else if item.icon === 'refresh'}
						<path
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					{:else if item.icon === 'pencil'}
						<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
						<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
					{:else if item.icon === 'chat'}
						<path
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					{/if}
				</svg>
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
{/if}

{#if activeLearner}
	<aside
		class="fixed top-14 bottom-0 left-0 z-40 hidden w-52 flex-col border-r border-surface-200 bg-white px-3 py-5 md:flex"
	>
		{#each navItems as item}
			{@const active = isActive(item.href, $page.url.pathname)}
			<a
				href={item.href}
				class="mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200
					{active
					? 'bg-primary-50 text-primary-700 font-medium shadow-sm shadow-primary-100'
					: 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'}"
			>
				<svg
					class="h-5 w-5 shrink-0"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					{#if item.icon === 'home'}
						<path
							d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"
						/>
					{:else if item.icon === 'bar-chart'}
						<line x1="18" y1="20" x2="18" y2="10" />
						<line x1="12" y1="20" x2="12" y2="4" />
						<line x1="6" y1="20" x2="6" y2="14" />
					{:else if item.icon === 'book'}
						<path
							d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
						/>
					{:else if item.icon === 'refresh'}
						<path
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					{:else if item.icon === 'pencil'}
						<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
						<path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
					{:else if item.icon === 'chat'}
						<path
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					{/if}
				</svg>
				<span>{item.label}</span>
			</a>
		{/each}

		<div class="mt-auto rounded-xl bg-primary-50 px-3 py-3">
			<p class="text-xs font-medium text-primary-700">Linguist</p>
			<p class="text-xs text-primary-400">AI Language Learning</p>
		</div>
	</aside>
{/if}
