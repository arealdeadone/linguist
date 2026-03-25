<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { showToast } from '$lib/stores/toast.svelte';

	let { data } = $props();

	let showAddForm = $state(false);
	let addName = $state('');
	let addPin = $state('');
	let addTarget = $state('');
	let addLesson = $state('');
	let isSubmitting = $state(false);

	const langOptions = $derived(data.languages as Array<{ value: string; label: string }>);

	const cefrOptions = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

	async function addUser() {
		if (!addName.trim()) return;
		isSubmitting = true;
		try {
			const res = await fetch('/admin/api/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: addName.trim(),
					pin: addPin.trim() || undefined,
					targetLanguage: addTarget,
					lessonLanguage: addLesson
				})
			});
			if (!res.ok) {
				const err = await res.json();
				showToast(`Failed: ${err.error ?? 'Unknown error'}`, 'error');
				return;
			}
			addName = '';
			addPin = '';
			showAddForm = false;
			await invalidateAll();
			showToast('Learner created.', 'success');
		} catch (error) {
			console.error('Create learner failed:', error);
			showToast('Failed to create learner.', 'error');
		} finally {
			isSubmitting = false;
		}
	}

	async function resetUser(id: string, name: string) {
		if (
			!confirm(
				`Reset all progress for "${name}"? This deletes vocab, lessons, conversations, and resets CEFR to A1.`
			)
		)
			return;
		const res = await fetch(`/admin/api/users/${id}/reset`, { method: 'POST' });
		if (!res.ok) {
			const err = (await res.json()) as { error?: string };
			showToast(err.error ?? 'Reset failed', 'error');
			return;
		}
		await invalidateAll();
		showToast(`Reset ${name}.`, 'success');
	}

	async function deleteUser(id: string, name: string) {
		if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
		const res = await fetch(`/admin/api/users/${id}`, { method: 'DELETE' });
		if (!res.ok) {
			const err = (await res.json()) as { error?: string };
			showToast(err.error ?? 'Delete failed', 'error');
			return;
		}
		await invalidateAll();
		showToast(`Deleted ${name}.`, 'success');
	}

	async function updateCefr(id: string, cefrLevel: string): Promise<void> {
		try {
			const res = await fetch(`/admin/api/users/${id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cefrLevel })
			});

			if (!res.ok) {
				const err = (await res.json()) as { error?: string };
				showToast(err.error ?? 'Failed to update CEFR.', 'error');
				await invalidateAll();
				return;
			}

			await invalidateAll();
			showToast('CEFR updated.', 'success');
		} catch (error) {
			console.error('Failed to update CEFR:', error);
			showToast('Failed to update CEFR.', 'error');
			await invalidateAll();
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-2xl font-bold text-white">Users</h2>
			<p class="mt-1 text-sm text-gray-500">
				{data.users.length} learner{data.users.length !== 1 ? 's' : ''}
			</p>
		</div>
		<button
			onclick={() => (showAddForm = !showAddForm)}
			class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
		>
			{showAddForm ? 'Cancel' : '+ Add User'}
		</button>
	</div>

	{#if showAddForm}
		<div class="rounded-xl border border-gray-800 bg-gray-900 p-5">
			<h3 class="mb-4 text-sm font-semibold text-white">New Learner</h3>
			<div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<div>
					<label for="add-name" class="mb-1 block text-xs text-gray-400">Name</label>
					<input
						id="add-name"
						type="text"
						bind:value={addName}
						placeholder="Learner name"
						class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label for="add-pin" class="mb-1 block text-xs text-gray-400">PIN (optional)</label>
					<input
						id="add-pin"
						type="text"
						bind:value={addPin}
						placeholder="4-digit PIN"
						maxlength={4}
						class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					/>
				</div>
				<div>
					<label for="add-target" class="mb-1 block text-xs text-gray-400">Target Language</label>
					<select
						id="add-target"
						bind:value={addTarget}
						class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					>
						{#each langOptions as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label for="add-lesson" class="mb-1 block text-xs text-gray-400">Lesson Language</label>
					<select
						id="add-lesson"
						bind:value={addLesson}
						class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					>
						{#each langOptions as opt}
							<option value={opt.value}>{opt.label}</option>
						{/each}
					</select>
				</div>
			</div>
			<div class="mt-4 flex justify-end">
				<button
					onclick={addUser}
					disabled={!addName.trim() || isSubmitting}
					class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
				>
					{isSubmitting ? 'Creating...' : 'Create Learner'}
				</button>
			</div>
		</div>
	{/if}

	<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
		<table class="w-full text-left text-sm">
			<thead>
				<tr class="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500">
					<th class="px-4 py-3">Name</th>
					<th class="px-4 py-3">PIN</th>
					<th class="px-4 py-3">Target</th>
					<th class="px-4 py-3">Lesson</th>
					<th class="px-4 py-3">CEFR</th>
					<th class="px-4 py-3 text-right">Vocab</th>
					<th class="px-4 py-3 text-right">Due</th>
					<th class="px-4 py-3 text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-800">
				{#each data.users as user (user.id)}
					<tr class="transition-colors hover:bg-gray-800/50">
						<td class="px-4 py-3 font-medium text-white">{user.name}</td>
						<td class="px-4 py-3 font-mono text-gray-400">—</td>
						<td class="px-4 py-3 text-gray-300">{user.targetLanguage}</td>
						<td class="px-4 py-3 text-gray-300">{user.lessonLanguage}</td>
						<td class="px-4 py-3">
							<select
								value={user.cefrLevel}
								onchange={(e) => updateCefr(user.id, (e.currentTarget as HTMLSelectElement).value)}
								class="rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs font-medium text-indigo-300 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
							>
								{#each cefrOptions as option}
									<option value={option}>{option}</option>
								{/each}
							</select>
						</td>
						<td class="px-4 py-3 text-right font-mono text-gray-300">{user.vocabCount}</td>
						<td
							class="px-4 py-3 text-right font-mono {user.dueCount > 0
								? 'text-amber-400'
								: 'text-gray-500'}"
						>
							{user.dueCount}
						</td>
						<td class="px-4 py-3 text-right">
							<div class="flex justify-end gap-2">
								<button
									onclick={() => resetUser(user.id, user.name)}
									class="rounded px-2.5 py-1 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-400/10"
								>
									Reset
								</button>
								<button
									onclick={() => deleteUser(user.id, user.name)}
									class="rounded px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-400/10"
								>
									Delete
								</button>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="8" class="px-4 py-8 text-center text-gray-500">No users yet</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
