<script lang="ts">
	import { showToast } from '$lib/stores/toast.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	$effect(() => {
		if (form?.error) {
			showToast(form.error, 'error');
		}
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12 text-gray-100">
	<div
		class="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl shadow-black/30"
	>
		<div>
			<h1 class="text-2xl font-bold text-white">Admin Login</h1>
			<p class="mt-2 text-sm text-gray-400">Sign in with your Supabase admin account.</p>
		</div>

		<form method="POST" action="?/login" class="mt-6 space-y-4">
			<div>
				<label
					for="email"
					class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400"
				>
					Email
				</label>
				<input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					placeholder="admin@example.com"
				/>
			</div>

			<div>
				<label
					for="password"
					class="mb-1.5 block text-xs font-medium uppercase tracking-wide text-gray-400"
				>
					Password
				</label>
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					placeholder="••••••••"
				/>
			</div>

			<button
				type="submit"
				class="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
			>
				Sign in
			</button>
		</form>

		<div class="mt-6 border-t border-gray-800 pt-5">
			<a href="/" class="text-xs text-gray-500 transition-colors hover:text-gray-300"
				>← Back to App</a
			>
		</div>
	</div>
</div>
