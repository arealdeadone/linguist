<script lang="ts">
	let { currentLevel, nextLevel, onDismiss }: { currentLevel: string; nextLevel: string; onDismiss: () => void } = $props();

	let particles = Array.from({ length: 30 }, (_, i) => ({
		id: i,
		left: Math.random() * 100,
		delay: Math.random() * 2,
		duration: 1.5 + Math.random() * 2,
		color: ['#4f46e5', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'][i % 6],
		size: 6 + Math.random() * 8,
	}));

	setTimeout(onDismiss, 10000);
</script>

<div class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
	<div class="confetti-container">
		{#each particles as p (p.id)}
			<div
				class="confetti-particle"
				style="left: {p.left}%; animation-delay: {p.delay}s; animation-duration: {p.duration}s; background: {p.color}; width: {p.size}px; height: {p.size}px;"
			></div>
		{/each}
	</div>

	<div class="relative z-10 mx-4 max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl animate-scale-in">
		<div class="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-200">
			<span class="text-3xl font-bold text-white">{nextLevel}</span>
		</div>

		<h2 class="font-display text-2xl text-gray-900">Level Up!</h2>
		<p class="mt-2 text-gray-500">
			{currentLevel} → <span class="font-semibold text-indigo-600">{nextLevel}</span>
		</p>
		<p class="mt-1 text-sm text-gray-400">New scenarios and vocabulary unlocked</p>

		<button
			onclick={onDismiss}
			class="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-700 transition-all"
		>
			Continue Learning
		</button>
	</div>
</div>

<style>
	.confetti-container { position: fixed; inset: 0; pointer-events: none; overflow: hidden; }
	.confetti-particle {
		position: absolute;
		top: -20px;
		border-radius: 2px;
		animation: confetti-fall linear forwards;
	}
	@keyframes confetti-fall {
		0% { transform: translateY(0) rotate(0deg); opacity: 1; }
		100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
	}
	@keyframes scale-in {
		0% { transform: scale(0.8); opacity: 0; }
		100% { transform: scale(1); opacity: 1; }
	}
	.animate-scale-in { animation: scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
</style>
