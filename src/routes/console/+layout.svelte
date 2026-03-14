<script lang="ts">
	import { db } from '$lib/db/connection.svelte.js';
	import { base } from '$app/paths';

	let { children } = $props();

	const navLinks = [
		{ href: `${base}/console/property`, label: '🏠 Property' },
		{ href: `${base}/console/vehicle`, label: '🚗 Vehicle' },
		{ href: `${base}/console/projections`, label: '📈 Projections' },
		{ href: `${base}/console/reports`, label: '📊 Reports' }
	];
</script>

<div class="min-h-screen bg-gray-50">
	<nav class="bg-white border-b border-gray-200 shadow-sm">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-14">
				<div class="flex items-center gap-6">
					<a href="{base}/" class="text-lg font-bold text-primary-700">FinPlan</a>
					<div class="flex gap-1">
						{#each navLinks as link}
							<a
								href={link.href}
								class="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
							>
								{link.label}
							</a>
						{/each}
					</div>
				</div>
				<div class="text-sm text-gray-400">
					{#if db.isOpen}
						<span class="text-primary-600 font-medium">● {db.fileName}</span>
					{:else}
						<span class="text-gray-400">No database open</span>
					{/if}
				</div>
			</div>
		</div>
	</nav>

	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{#if !db.isOpen}
			<div class="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
				<p class="text-amber-800 font-medium">No database open.</p>
				<p class="text-amber-600 text-sm mt-1">
					<a href="{base}/" class="underline">Return to home</a> to open or create a database.
				</p>
			</div>
		{:else}
			{@render children()}
		{/if}
	</main>
</div>
