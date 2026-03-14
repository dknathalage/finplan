<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { base } from '$app/paths';
	import { repositories } from '$lib/repositories';
	import { calculateCashFlow } from '$lib/calc/projections';
	import type { Scenario } from '$lib/repositories';

	interface ScenarioWithFlow extends Scenario {
		monthlySurplus: number;
	}

	let scenarios = $state<ScenarioWithFlow[]>([]);
	let deleteConfirmId = $state<string | null>(null);

	function loadScenarios() {
		const all = repositories.scenarios.getAll();
		scenarios = all.map((s) => {
			const income = repositories.income.getByScenario(s.id);
			const expenses = repositories.expenses.getByScenario(s.id);
			const cf = calculateCashFlow(income, expenses);
			return { ...s, monthlySurplus: cf.monthlySurplus };
		});
	}

	onMount(loadScenarios);

	async function handleNew() {
		const id = await repositories.scenarios.create({
			name: 'New Scenario',
			description: '',
			is_baseline: scenarios.length === 0
		});
		goto(`${base}/console/scenarios/${id}`);
	}

	async function handleClone(s: ScenarioWithFlow) {
		const newId = await repositories.scenarios.create({
			name: s.name + ' (copy)',
			description: s.description ?? '',
			is_baseline: false
		});
		// clone income
		const income = repositories.income.getByScenario(s.id);
		for (const i of income) {
			await repositories.income.create({ ...i, scenario_id: newId });
		}
		// clone expenses
		const expenses = repositories.expenses.getByScenario(s.id);
		for (const e of expenses) {
			await repositories.expenses.create({ ...e, scenario_id: newId });
		}
		loadScenarios();
	}

	async function handleDelete(id: string) {
		await repositories.scenarios.delete(id);
		deleteConfirmId = null;
		loadScenarios();
	}

	function fmt(n: number) {
		const abs = Math.abs(n);
		const sign = n < 0 ? '-' : '+';
		if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k/mo`;
		return `${sign}$${abs.toFixed(0)}/mo`;
	}
</script>

<svelte:head><title>Scenarios — FinPlan</title></svelte:head>

<div class="p-6 lg:p-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold text-gray-900">Scenarios</h1>
		<button
			onclick={handleNew}
			class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 active:bg-primary-800"
		>
			+ New Scenario
		</button>
	</div>

	{#if scenarios.length === 0}
		<div class="rounded-2xl border border-dashed border-gray-300 p-12 text-center">
			<p class="text-4xl">🔄</p>
			<p class="mt-3 text-lg font-medium text-gray-700">No scenarios yet</p>
			<p class="mt-1 text-sm text-gray-500">Create your first scenario to start planning</p>
			<button
				onclick={handleNew}
				class="mt-4 rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700"
			>
				Create Scenario
			</button>
		</div>
	{:else}
		<div class="space-y-3">
			{#each scenarios as s}
				<div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
					<div class="flex items-start justify-between gap-4">
						<button
							onclick={() => goto(`${base}/console/scenarios/${s.id}`)}
							class="flex-1 text-left"
						>
							<div class="flex flex-wrap items-center gap-2">
								<span class="text-base font-semibold text-gray-900">{s.name}</span>
								{#if s.is_baseline}
									<span class="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">Baseline</span>
								{/if}
								<span
									class="rounded-full px-2 py-0.5 text-xs font-medium
										{s.monthlySurplus >= 0
										? 'bg-green-100 text-green-700'
										: 'bg-red-100 text-red-700'}"
								>
									{fmt(s.monthlySurplus)}
								</span>
							</div>
							{#if s.description}
								<p class="mt-1 text-sm text-gray-500">{s.description}</p>
							{/if}
						</button>

						<div class="flex shrink-0 gap-2">
							<button
								onclick={() => handleClone(s)}
								class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
								title="Clone scenario"
							>
								Clone
							</button>
							{#if deleteConfirmId === s.id}
								<div class="flex gap-1">
									<button
										onclick={() => handleDelete(s.id)}
										class="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
									>
										Confirm
									</button>
									<button
										onclick={() => (deleteConfirmId = null)}
										class="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
									>
										Cancel
									</button>
								</div>
							{:else}
								<button
									onclick={() => (deleteConfirmId = s.id)}
									class="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
								>
									Delete
								</button>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
