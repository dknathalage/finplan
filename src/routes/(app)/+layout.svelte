<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { base } from '$app/paths';
	import { db, tryRestore, reconnect, initNew, openExisting } from '$lib/db/connection.svelte.js';

	let { children } = $props();

	let restoring = $state(true);
	let storedFileName = $state<string | null>(null);
	let error = $state('');

	onMount(async () => {
		try {
			const pending = await tryRestore();
			if (pending) {
				storedFileName = pending;
			}
		} catch (e) {
			console.warn('restore failed', e);
		}
		restoring = false;
	});

	async function handleReconnect() {
		error = '';
		try {
			await reconnect();
		} catch (e) {
			error = 'Could not reconnect. Please open the file manually.';
		}
	}

	async function handleOpenExisting() {
		error = '';
		try {
			await openExisting();
		} catch (e: unknown) {
			if (e instanceof Error && e.name !== 'AbortError') {
				error = 'Failed to open file.';
			}
		}
	}

	async function handleCreateNew() {
		error = '';
		try {
			await initNew();
		} catch (e: unknown) {
			if (e instanceof Error && e.name !== 'AbortError') {
				error = 'Failed to create database.';
			}
		}
	}

	const navItems = [
		{ href: `${base}/console`, label: 'Dashboard', icon: '📊', exact: true },
		{ href: `${base}/console/scenarios`, label: 'Scenarios', icon: '🔄' },
		{ href: `${base}/console/profile`, label: 'Profile', icon: '💼' },
		{ href: `${base}/console/property`, label: 'Property', icon: '🏠' },
		{ href: `${base}/console/vehicle`, label: 'Vehicle', icon: '🚗' },
		{ href: `${base}/console/projections`, label: 'Projections', icon: '📈' },
		{ href: `${base}/console/reports`, label: 'Reports', icon: '📋' }
	];

	function isActive(href: string, exact = false) {
		const path = $page.url.pathname;
		if (exact) return path === href;
		return path === href || path.startsWith(href + '/');
	}
</script>

{#if restoring}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<p class="text-gray-500">Loading…</p>
	</div>
{:else if !db.isOpen}
	<!-- FileGate -->
	<div class="flex min-h-screen items-center justify-center bg-gray-50 p-4">
		<div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
			<div class="mb-6 text-center">
				<div class="mb-3 text-5xl">💰</div>
				<h1 class="text-2xl font-bold text-gray-900">FinPlan</h1>
				<p class="mt-1 text-sm text-gray-500">Local-first financial planning</p>
			</div>

			{#if storedFileName}
				<div class="mb-4 rounded-lg border border-primary-200 bg-primary-50 p-4">
					<p class="text-sm text-primary-800">
						Last used: <span class="font-medium">{storedFileName}</span>
					</p>
					<button
						onclick={handleReconnect}
						class="mt-2 w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 active:bg-primary-800"
					>
						Reopen {storedFileName}
					</button>
				</div>
				<p class="mb-4 text-center text-xs text-gray-400">— or —</p>
			{/if}

			<div class="space-y-3">
				<button
					onclick={handleOpenExisting}
					class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100"
				>
					📂 Open Existing Database
				</button>
				<button
					onclick={handleCreateNew}
					class="w-full rounded-lg bg-primary-600 px-4 py-3 text-sm font-medium text-white hover:bg-primary-700 active:bg-primary-800"
				>
					✨ Create New Database
				</button>
			</div>

			{#if error}
				<p class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
			{/if}
		</div>
	</div>
{:else}
	<div class="flex min-h-screen bg-gray-50">
		<!-- Sidebar (desktop) -->
		<aside class="hidden w-56 shrink-0 flex-col border-r border-gray-200 bg-white lg:flex">
			<div class="border-b border-gray-200 p-5">
				<div class="flex items-center gap-2">
					<span class="text-2xl">💰</span>
					<div>
						<h1 class="text-base font-bold text-gray-900">FinPlan</h1>
						<p class="truncate text-xs text-gray-400">{db.fileName}</p>
					</div>
				</div>
			</div>
			<nav class="flex-1 space-y-1 p-3">
				{#each navItems as item}
					<a
						href={item.href}
						class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
							{isActive(item.href, item.exact)
							? 'bg-primary-50 text-primary-700'
							: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}"
					>
						<span class="text-base">{item.icon}</span>
						{item.label}
					</a>
				{/each}
			</nav>
		</aside>

		<!-- Main content -->
		<div class="flex flex-1 flex-col overflow-hidden">
			<main class="flex-1 overflow-auto pb-20 lg:pb-0">
				{@render children()}
			</main>
		</div>

		<!-- Bottom tab nav (mobile) -->
		<nav class="fixed bottom-0 left-0 right-0 z-50 flex border-t border-gray-200 bg-white lg:hidden">
			{#each navItems as item}
				<a
					href={item.href}
					class="flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors
						{isActive(item.href, item.exact)
						? 'text-primary-600'
						: 'text-gray-500 hover:text-gray-700'}"
				>
					<span class="text-lg">{item.icon}</span>
					<span class="text-[10px]">{item.label}</span>
				</a>
			{/each}
		</nav>
	</div>
{/if}
