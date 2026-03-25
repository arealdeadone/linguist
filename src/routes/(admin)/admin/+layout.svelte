<script lang="ts">
	import { page } from '$app/stores';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const navItems = [
		{ href: '/admin', label: 'Dashboard', icon: 'chart' },
		{ href: '/admin/users', label: 'Users', icon: 'users' },
		{ href: '/admin/lessons', label: 'Lessons', icon: 'book' },
		{ href: '/admin/language-test', label: 'Language Test', icon: 'language' }
	] as const;

	let currentPath = $derived($page.url.pathname);
</script>

<div class="flex min-h-screen bg-gray-950 text-gray-100">
	<aside class="flex w-56 flex-col border-r border-gray-800 bg-gray-900 px-4 py-6">
		<h1 class="mb-6 text-lg font-bold text-white">🔧 Admin</h1>
		<nav class="space-y-1">
			{#each navItems as item}
				{@const active =
					item.href === '/admin' ? currentPath === '/admin' : currentPath.startsWith(item.href)}
				<a
					href={item.href}
					class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors {active
						? 'bg-indigo-600/20 text-indigo-400'
						: 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}"
				>
					{#if item.icon === 'chart'}
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M3 13h2v8H3zM9 9h2v12H9zM15 5h2v16h-2zM21 1h2v20h-2z"
							/>
						</svg>
					{:else if item.icon === 'users'}
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
							/>
						</svg>
					{:else if item.icon === 'book'}
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
							/>
						</svg>
					{:else}
						<svg
							class="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M3 5h12M9 3v2m1 13-2-2m0 0 2-2m-2 2h13"
							/>
						</svg>
					{/if}
					{item.label}
				</a>
			{/each}
		</nav>
		<div class="mt-auto border-t border-gray-800 pt-6">
			<form method="POST" action="/login?/logout" class="mb-3">
				<button
					type="submit"
					class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-left text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:bg-gray-700 hover:text-white"
				>
					Logout
				</button>
			</form>
			<a href="/" class="text-xs text-gray-500 hover:text-gray-300">← Back to App</a>
		</div>
	</aside>
	<main class="flex-1 overflow-auto p-8">
		{@render children()}
	</main>
</div>
