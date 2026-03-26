<script lang="ts">
	import { showToast } from '$lib/stores/toast.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	$effect(() => {
		if (form?.error) {
			showToast(form.error, 'error');
			resetCaptcha();
		}
	});

	let captchaToken = $state('');
	let captchaWidgetId = $state<string | null>(null);

	function onCaptchaVerify(token: string) {
		captchaToken = token;
	}

	function resetCaptcha() {
		captchaToken = '';
		if (captchaWidgetId !== null && window.hcaptcha) {
			window.hcaptcha.reset(captchaWidgetId);
		}
	}

	$effect(() => {
		if (typeof window === 'undefined') return;

		function renderWidget() {
			const el = document.getElementById('hcaptcha-container');
			if (!el || !window.hcaptcha) return;
			if (captchaWidgetId !== null) return;
			captchaWidgetId = window.hcaptcha.render('hcaptcha-container', {
				sitekey: '67969038-66d4-4566-97dc-f6a4df0cebe6',
				theme: 'dark',
				callback: onCaptchaVerify
			});
		}

		if (window.hcaptcha) {
			renderWidget();
		} else {
			window.onHcaptchaLoad = renderWidget;
		}
	});
</script>

<svelte:head>
	<script src="https://js.hcaptcha.com/1/api.js?onload=onHcaptchaLoad&render=explicit" async defer></script>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-12 text-gray-100">
	<div
		class="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-2xl shadow-black/30"
	>
		<div>
			<h1 class="text-2xl font-bold text-white">Login</h1>
			<p class="mt-2 text-sm text-gray-400">Sign in with your Supabase account.</p>
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
					placeholder="you@example.com"
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

			<input type="hidden" name="captchaToken" value={captchaToken} />

			<div id="hcaptcha-container" class="flex justify-center"></div>

			<button
				type="submit"
				disabled={!captchaToken}
				class="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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
