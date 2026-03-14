<script lang="ts">
	import { repositories } from '$lib/repositories/index.js';
	import { calculateTotalCost, compareVehicleOptions } from '$lib/calc/vehicle.js';
	import type { Vehicle, CreateVehicleInput } from '$lib/repositories/types.js';

	// ── Form state ──────────────────────────────────────────────────────────────
	let name = $state('');
	let purchasePrice = $state(35000);
	let purchaseMethod = $state<'cash' | 'finance' | 'lease'>('finance');
	let financeRate = $state(7.0);
	let financeTermMonths = $state(60);
	let annualRunningCost = $state(3000);
	let analysisPeriod = $state(5);

	let saving = $state(false);
	let saveError = $state('');

	// ── Saved vehicles ───────────────────────────────────────────────────────────
	let savedVehicles = $state<Vehicle[]>([]);

	function loadVehicles() {
		savedVehicles = repositories.vehicles.getAll();
	}
	loadVehicles();

	// ── Live analysis ────────────────────────────────────────────────────────────
	const liveVehicle = $derived<Vehicle>({
		id: '__preview__',
		name: name || 'Preview',
		purchase_price: purchasePrice,
		purchase_method: purchaseMethod,
		finance_rate: purchaseMethod !== 'cash' ? financeRate : undefined,
		finance_term_months: purchaseMethod !== 'cash' ? financeTermMonths : undefined,
		annual_running_cost: annualRunningCost
	});

	const liveAnalysis = $derived(calculateTotalCost(liveVehicle, analysisPeriod));
	const totalInterest = $derived(
		purchaseMethod !== 'cash' && liveAnalysis.monthlyPayment > 0
			? liveAnalysis.monthlyPayment * financeTermMonths - purchasePrice
			: 0
	);

	// ── Comparison ───────────────────────────────────────────────────────────────
	const comparison = $derived(compareVehicleOptions(savedVehicles, analysisPeriod));
	const cheapestId = $derived(comparison.length > 0 ? comparison[0].vehicle.id : null);

	// ── Helpers ──────────────────────────────────────────────────────────────────
	function fmt(n: number) {
		return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
	}

	function methodLabel(m: string) {
		return { cash: 'Cash', finance: 'Finance', lease: 'Lease' }[m] ?? m;
	}

	// ── Save ─────────────────────────────────────────────────────────────────────
	async function handleSave() {
		if (!name.trim()) { saveError = 'Vehicle name is required.'; return; }
		saveError = '';
		saving = true;
		const input: CreateVehicleInput = {
			name: name.trim(),
			purchase_price: purchasePrice,
			purchase_method: purchaseMethod,
			finance_rate: purchaseMethod !== 'cash' ? financeRate : undefined,
			finance_term_months: purchaseMethod !== 'cash' ? financeTermMonths : undefined,
			annual_running_cost: annualRunningCost
		};
		try {
			await repositories.vehicles.create(input);
			loadVehicles();
			name = '';
		} catch (e: unknown) {
			saveError = e instanceof Error ? e.message : 'Failed to save.';
		} finally {
			saving = false;
		}
	}

	async function handleDelete(id: string) {
		await repositories.vehicles.delete(id);
		loadVehicles();
	}
</script>

<div class="space-y-8">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">🚗 Vehicle Analysis</h1>
		<p class="text-gray-500 text-sm mt-1">Compare total cost of ownership across different vehicles and purchase methods.</p>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
		<!-- ── Input Form ── -->
		<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
			<h2 class="text-lg font-semibold text-gray-800">Vehicle Details</h2>

			<div>
				<label for="veh-name" class="block text-sm font-medium text-gray-700 mb-1">Vehicle Name</label>
				<input
					id="veh-name"
					type="text"
					bind:value={name}
					placeholder="e.g. Toyota Corolla 2025"
					class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
				/>
			</div>

			<div>
				<label for="veh-price" class="block text-sm font-medium text-gray-700 mb-1">Purchase Price (AUD)</label>
				<input
					id="veh-price"
					type="number"
					bind:value={purchasePrice}
					min="0"
					step="1000"
					class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
				/>
			</div>

			<div>
				<p class="block text-sm font-medium text-gray-700 mb-1">Purchase Method</p>
				<div class="flex gap-2">
					{#each ['cash', 'finance', 'lease'] as m}
						<button
							type="button"
							onclick={() => (purchaseMethod = m as 'cash' | 'finance' | 'lease')}
							class="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors {purchaseMethod === m
								? 'bg-primary-600 text-white border-primary-600'
								: 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}"
						>
							{methodLabel(m)}
						</button>
					{/each}
				</div>
			</div>

			{#if purchaseMethod !== 'cash'}
				<div class="grid grid-cols-2 gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
					<div>
						<label for="veh-rate" class="block text-sm font-medium text-gray-700 mb-1">Interest Rate % p.a.</label>
						<input
							id="veh-rate"
							type="number"
							bind:value={financeRate}
							min="0"
							max="30"
							step="0.1"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
						/>
					</div>
					<div>
						<label for="veh-term" class="block text-sm font-medium text-gray-700 mb-1">Term (months)</label>
						<input
							id="veh-term"
							type="number"
							bind:value={financeTermMonths}
							min="12"
							max="84"
							step="12"
							class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
						/>
					</div>
				</div>
			{/if}

			<div>
				<label for="veh-running" class="block text-sm font-medium text-gray-700 mb-1">Annual Running Costs (insurance + rego + fuel + servicing)</label>
				<input
					id="veh-running"
					type="number"
					bind:value={annualRunningCost}
					min="0"
					step="100"
					class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
				/>
			</div>

			<div>
				<p class="block text-sm font-medium text-gray-700 mb-2">Analysis Period</p>
				<div class="flex gap-2">
					{#each [3, 5, 7] as y}
						<button
							type="button"
							onclick={() => (analysisPeriod = y)}
							class="flex-1 py-2 rounded-lg text-sm font-medium border transition-colors {analysisPeriod === y
								? 'bg-primary-600 text-white border-primary-600'
								: 'bg-white text-gray-600 border-gray-300 hover:border-primary-400'}"
						>
							{y} years
						</button>
					{/each}
				</div>
			</div>

			{#if saveError}
				<p class="text-red-600 text-sm">{saveError}</p>
			{/if}

			<button
				onclick={handleSave}
				disabled={saving}
				class="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
			>
				{saving ? 'Saving…' : '💾 Save Vehicle'}
			</button>
		</div>

		<!-- ── Results Panel ── -->
		<div class="space-y-4">
			<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
				<h3 class="font-semibold text-gray-700 mb-3">💰 Cost Summary ({analysisPeriod}-Year Analysis)</h3>
				<div class="space-y-2 text-sm">
					{#if purchaseMethod !== 'cash' && liveAnalysis.monthlyPayment > 0}
						<div class="flex justify-between">
							<span class="text-gray-600">Monthly Payment</span>
							<span class="font-medium">{fmt(liveAnalysis.monthlyPayment)}/mo</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Total Interest Paid</span>
							<span class="font-medium text-red-600">{fmt(totalInterest)}</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-600">Total Finance Cost ({analysisPeriod}yr)</span>
							<span class="font-medium">{fmt(liveAnalysis.totalFinanceCost)}</span>
						</div>
					{:else if purchaseMethod === 'cash'}
						<div class="flex justify-between">
							<span class="text-gray-600">Upfront Cost</span>
							<span class="font-medium">{fmt(liveAnalysis.upfrontCost)}</span>
						</div>
					{/if}
					<div class="flex justify-between">
						<span class="text-gray-600">Running Costs ({analysisPeriod}yr)</span>
						<span class="font-medium">{fmt(liveAnalysis.totalRunningCost)}</span>
					</div>
					<div class="flex justify-between border-t border-gray-100 pt-2 mt-2">
						<span class="font-bold text-gray-800 text-base">Grand Total ({analysisPeriod}yr)</span>
						<span class="font-bold text-gray-900 text-base">{fmt(liveAnalysis.totalCostOfOwnership)}</span>
					</div>
					<div class="flex justify-between text-gray-500">
						<span>Annual Cost (avg)</span>
						<span>{fmt(liveAnalysis.annualCost)}/yr</span>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- ── Saved Vehicles Comparison ── -->
	{#if savedVehicles.length > 0}
		<div class="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
			<h2 class="text-lg font-semibold text-gray-800 mb-4">Vehicle Comparison ({analysisPeriod}-Year Period)</h2>

			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="text-left text-gray-500 border-b border-gray-100">
							<th class="pb-2 pr-4 font-medium">Vehicle</th>
							<th class="pb-2 pr-4 font-medium">Method</th>
							<th class="pb-2 pr-4 font-medium text-right">Monthly Cost</th>
							<th class="pb-2 pr-4 font-medium text-right">Total {analysisPeriod}yr Cost</th>
							<th class="pb-2 font-medium">Action</th>
						</tr>
					</thead>
					<tbody>
						{#each comparison as { vehicle: v, summary: s }}
							<tr class="border-b border-gray-50 hover:bg-gray-50 {v.id === cheapestId ? 'bg-primary-50' : ''}">
								<td class="py-2 pr-4 font-medium text-gray-800">
									{v.name}
									{#if v.id === cheapestId}
										<span class="ml-2 text-xs text-primary-600 font-semibold">✓ cheapest</span>
									{/if}
								</td>
								<td class="py-2 pr-4">
									<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
										{methodLabel(v.purchase_method)}
									</span>
								</td>
								<td class="py-2 pr-4 text-right {v.id === cheapestId ? 'text-primary-600 font-semibold' : ''}">
									{s.monthlyPayment > 0 ? fmt(s.monthlyPayment) + '/mo' : '—'}
								</td>
								<td class="py-2 pr-4 text-right font-medium {v.id === cheapestId ? 'text-primary-700 font-bold' : ''}">
									{fmt(s.totalCostOfOwnership)}
								</td>
								<td class="py-2">
									<button
										onclick={() => handleDelete(v.id)}
										class="text-red-500 hover:text-red-700 text-xs font-medium"
									>
										Delete
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
