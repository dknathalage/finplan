<script lang="ts">
	import { onMount } from 'svelte';
	import { repositories } from '$lib/repositories';
	import { calculateNetWorth } from '$lib/calc/projections';
	import type { Asset, Liability, AssetType, LiabilityType } from '$lib/repositories';

	const ASSET_TYPES: AssetType[] = ['property', 'cash', 'shares', 'super', 'vehicle', 'other'];
	const LIABILITY_TYPES: LiabilityType[] = ['mortgage', 'personal_loan', 'car_loan', 'credit_card', 'student_loan', 'other'];

	// Donut chart colours per asset type
	const TYPE_COLORS: Record<AssetType, string> = {
		property: '#16a34a',
		cash:     '#3b82f6',
		shares:   '#8b5cf6',
		super:    '#f59e0b',
		vehicle:  '#ef4444',
		other:    '#6b7280'
	};

	let assets = $state<Asset[]>([]);
	let liabilities = $state<Liability[]>([]);

	let nw = $derived(calculateNetWorth(assets, liabilities));
	let totalMonthlyDebt = $derived(liabilities.reduce((s, l) => s + l.monthly_payment, 0));

	// New asset form
	let newAsset = $state({ name: '', value: '', type: 'cash' as AssetType, as_of: new Date().toISOString().slice(0, 10), notes: '' });
	let addingAsset = $state(false);

	// Edit asset
	let editAssetId = $state<string | null>(null);
	let editAsset = $state({ name: '', value: '', type: 'cash' as AssetType, as_of: '', notes: '' });

	// New liability form
	let newLiability = $state({ name: '', balance: '', interest_rate: '', monthly_payment: '', type: 'other' as LiabilityType, notes: '' });
	let addingLiability = $state(false);

	// Edit liability
	let editLiabilityId = $state<string | null>(null);
	let editLiability = $state({ name: '', balance: '', interest_rate: '', monthly_payment: '', type: 'other' as LiabilityType, notes: '' });

	function loadData() {
		assets = repositories.assets.getAll();
		liabilities = repositories.liabilities.getAll();
	}

	onMount(loadData);

	// Donut chart data
	let donutSegments = $derived.by(() => {
		if (nw.totalAssets === 0) return [];
		const byType: Partial<Record<AssetType, number>> = {};
		for (const a of assets) {
			byType[a.type] = (byType[a.type] ?? 0) + a.value;
		}
		let angle = 0;
		const r = 80;
		const cx = 100;
		const cy = 100;
		return ASSET_TYPES.filter((t) => (byType[t] ?? 0) > 0).map((t) => {
			const pct = (byType[t]! / nw.totalAssets) * 360;
			const startAngle = angle;
			angle += pct;
			const endAngle = angle;
			const start = polarToXY(cx, cy, r, startAngle - 90);
			const end = polarToXY(cx, cy, r, endAngle - 90);
			const large = pct > 180 ? 1 : 0;
			return {
				type: t,
				color: TYPE_COLORS[t],
				value: byType[t]!,
				pct: (byType[t]! / nw.totalAssets) * 100,
				d: `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`
			};
		});
	});

	function polarToXY(cx: number, cy: number, r: number, deg: number) {
		const rad = (deg * Math.PI) / 180;
		return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
	}

	function fmt(n: number) {
		const abs = Math.abs(n);
		const sign = n < 0 ? '-' : '';
		if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
		if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
		return `${sign}$${abs.toFixed(2)}`;
	}

	// Assets CRUD
	async function addAsset() {
		if (!newAsset.name || !newAsset.value) return;
		await repositories.assets.create({
			name: newAsset.name,
			value: parseFloat(newAsset.value),
			type: newAsset.type,
			as_of: newAsset.as_of,
			notes: newAsset.notes || undefined
		});
		newAsset = { name: '', value: '', type: 'cash', as_of: new Date().toISOString().slice(0, 10), notes: '' };
		addingAsset = false;
		loadData();
	}

	function startEditAsset(a: Asset) {
		editAssetId = a.id;
		editAsset = { name: a.name, value: String(a.value), type: a.type, as_of: a.as_of, notes: a.notes ?? '' };
	}

	async function saveEditAsset(a: Asset) {
		await repositories.assets.update(a.id, {
			name: editAsset.name,
			value: parseFloat(editAsset.value),
			type: editAsset.type,
			as_of: editAsset.as_of,
			notes: editAsset.notes || undefined
		});
		editAssetId = null;
		loadData();
	}

	async function deleteAsset(id: string) {
		await repositories.assets.delete(id);
		loadData();
	}

	// Liabilities CRUD
	async function addLiability() {
		if (!newLiability.name || !newLiability.balance) return;
		await repositories.liabilities.create({
			name: newLiability.name,
			balance: parseFloat(newLiability.balance),
			interest_rate: parseFloat(newLiability.interest_rate) || 0,
			monthly_payment: parseFloat(newLiability.monthly_payment) || 0,
			type: newLiability.type,
			notes: newLiability.notes || undefined
		});
		newLiability = { name: '', balance: '', interest_rate: '', monthly_payment: '', type: 'other', notes: '' };
		addingLiability = false;
		loadData();
	}

	function startEditLiability(l: Liability) {
		editLiabilityId = l.id;
		editLiability = { name: l.name, balance: String(l.balance), interest_rate: String(l.interest_rate), monthly_payment: String(l.monthly_payment), type: l.type, notes: l.notes ?? '' };
	}

	async function saveEditLiability(l: Liability) {
		await repositories.liabilities.update(l.id, {
			name: editLiability.name,
			balance: parseFloat(editLiability.balance),
			interest_rate: parseFloat(editLiability.interest_rate) || 0,
			monthly_payment: parseFloat(editLiability.monthly_payment) || 0,
			type: editLiability.type,
			notes: editLiability.notes || undefined
		});
		editLiabilityId = null;
		loadData();
	}

	async function deleteLiability(id: string) {
		await repositories.liabilities.delete(id);
		loadData();
	}
</script>

<svelte:head><title>Profile — FinPlan</title></svelte:head>

<div class="p-6 lg:p-8 max-w-4xl">
	<h1 class="mb-2 text-2xl font-bold text-gray-900">Financial Profile</h1>

	<!-- Net Worth headline -->
	<div class="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm text-center">
		<p class="text-sm font-medium text-gray-500">Net Worth</p>
		<p class="mt-1 text-5xl font-bold {nw.netWorth >= 0 ? 'text-primary-600' : 'text-red-600'}">
			{fmt(nw.netWorth)}
		</p>
		<div class="mt-2 flex justify-center gap-6 text-sm text-gray-500">
			<span>Assets: <span class="font-semibold text-gray-700">{fmt(nw.totalAssets)}</span></span>
			<span>Liabilities: <span class="font-semibold text-gray-700">{fmt(nw.totalLiabilities)}</span></span>
		</div>
	</div>

	<!-- Assets section -->
	<div class="mb-6 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
		<div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
			<h2 class="text-base font-semibold text-gray-900">Assets <span class="ml-2 text-sm font-normal text-gray-500">total: {fmt(nw.totalAssets)}</span></h2>
			<button
				onclick={() => (addingAsset = true)}
				class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
			>
				+ Add
			</button>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
					<tr>
						<th class="px-4 py-2 text-left font-medium">Name</th>
						<th class="px-4 py-2 text-right font-medium">Value</th>
						<th class="px-4 py-2 text-left font-medium">Type</th>
						<th class="px-4 py-2 text-left font-medium">As Of</th>
						<th class="px-4 py-2 text-right font-medium">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each assets as a}
						{#if editAssetId === a.id}
							<tr class="bg-primary-50">
								<td class="px-4 py-2"><input bind:value={editAsset.name} class="w-full rounded border border-gray-300 px-2 py-1 text-sm" /></td>
								<td class="px-4 py-2"><input bind:value={editAsset.value} type="number" class="w-28 rounded border border-gray-300 px-2 py-1 text-sm text-right" /></td>
								<td class="px-4 py-2">
									<select bind:value={editAsset.type} class="rounded border border-gray-300 px-2 py-1 text-sm">
										{#each ASSET_TYPES as t}<option value={t}>{t}</option>{/each}
									</select>
								</td>
								<td class="px-4 py-2"><input bind:value={editAsset.as_of} type="date" class="rounded border border-gray-300 px-2 py-1 text-sm" /></td>
								<td class="px-4 py-2 text-right">
									<button onclick={() => saveEditAsset(a)} class="mr-1 rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700">Save</button>
									<button onclick={() => (editAssetId = null)} class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600">Cancel</button>
								</td>
							</tr>
						{:else}
							<tr class="hover:bg-gray-50">
								<td class="px-4 py-3 font-medium text-gray-900">{a.name}</td>
								<td class="px-4 py-3 text-right text-gray-700">{fmt(a.value)}</td>
								<td class="px-4 py-3 capitalize text-gray-500">{a.type}</td>
								<td class="px-4 py-3 text-gray-500">{a.as_of}</td>
								<td class="px-4 py-3 text-right">
									<button onclick={() => startEditAsset(a)} class="mr-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Edit</button>
									<button onclick={() => deleteAsset(a.id)} class="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Del</button>
								</td>
							</tr>
						{/if}
					{/each}

					{#if addingAsset}
						<tr class="bg-primary-50">
							<td class="px-4 py-2"><input bind:value={newAsset.name} placeholder="Name" class="w-full rounded border border-gray-300 px-2 py-1 text-sm" /></td>
							<td class="px-4 py-2"><input bind:value={newAsset.value} type="number" placeholder="0" class="w-28 rounded border border-gray-300 px-2 py-1 text-sm text-right" /></td>
							<td class="px-4 py-2">
								<select bind:value={newAsset.type} class="rounded border border-gray-300 px-2 py-1 text-sm">
									{#each ASSET_TYPES as t}<option value={t}>{t}</option>{/each}
								</select>
							</td>
							<td class="px-4 py-2"><input bind:value={newAsset.as_of} type="date" class="rounded border border-gray-300 px-2 py-1 text-sm" /></td>
							<td class="px-4 py-2 text-right">
								<button onclick={addAsset} class="mr-1 rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700">Save</button>
								<button onclick={() => (addingAsset = false)} class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600">Cancel</button>
							</td>
						</tr>
					{/if}

					{#if assets.length === 0 && !addingAsset}
						<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-gray-400">No assets yet</td></tr>
					{/if}
				</tbody>
			</table>
		</div>

		<!-- Asset donut chart -->
		{#if donutSegments.length > 0}
			<div class="border-t border-gray-200 p-6">
				<h3 class="mb-4 text-sm font-medium text-gray-700">Asset Mix</h3>
				<div class="flex flex-wrap items-center gap-8">
					<svg viewBox="0 0 200 200" class="w-40 h-40 shrink-0">
						{#each donutSegments as seg}
							<path d={seg.d} fill={seg.color} opacity="0.85" />
						{/each}
						<!-- Donut hole -->
						<circle cx="100" cy="100" r="50" fill="white" />
					</svg>
					<div class="flex flex-wrap gap-3">
						{#each donutSegments as seg}
							<div class="flex items-center gap-2 text-sm">
								<span class="inline-block h-3 w-3 rounded-full shrink-0" style="background:{seg.color}"></span>
								<span class="capitalize text-gray-600">{seg.type}</span>
								<span class="font-medium text-gray-800">{seg.pct.toFixed(1)}%</span>
								<span class="text-gray-400">({fmt(seg.value)})</span>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Liabilities section -->
	<div class="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
		<div class="flex items-center justify-between border-b border-gray-200 px-6 py-4">
			<div>
				<h2 class="text-base font-semibold text-gray-900">
					Liabilities
					<span class="ml-2 text-sm font-normal text-gray-500">balance: {fmt(nw.totalLiabilities)}</span>
				</h2>
				<p class="text-xs text-gray-500 mt-0.5">Total monthly debt service: <span class="font-medium">{fmt(totalMonthlyDebt)}/mo</span></p>
			</div>
			<button
				onclick={() => (addingLiability = true)}
				class="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
			>
				+ Add
			</button>
		</div>

		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead class="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
					<tr>
						<th class="px-4 py-2 text-left font-medium">Name</th>
						<th class="px-4 py-2 text-right font-medium">Balance</th>
						<th class="px-4 py-2 text-right font-medium">Rate %</th>
						<th class="px-4 py-2 text-right font-medium">Monthly Pmt</th>
						<th class="px-4 py-2 text-left font-medium">Type</th>
						<th class="px-4 py-2 text-right font-medium">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each liabilities as l}
						{#if editLiabilityId === l.id}
							<tr class="bg-primary-50">
								<td class="px-4 py-2"><input bind:value={editLiability.name} class="w-full rounded border border-gray-300 px-2 py-1 text-sm" /></td>
								<td class="px-4 py-2"><input bind:value={editLiability.balance} type="number" class="w-28 rounded border border-gray-300 px-2 py-1 text-sm text-right" /></td>
								<td class="px-4 py-2"><input bind:value={editLiability.interest_rate} type="number" step="0.01" class="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-right" /></td>
								<td class="px-4 py-2"><input bind:value={editLiability.monthly_payment} type="number" class="w-28 rounded border border-gray-300 px-2 py-1 text-sm text-right" /></td>
								<td class="px-4 py-2">
									<select bind:value={editLiability.type} class="rounded border border-gray-300 px-2 py-1 text-sm">
										{#each LIABILITY_TYPES as t}<option value={t}>{t}</option>{/each}
									</select>
								</td>
								<td class="px-4 py-2 text-right">
									<button onclick={() => saveEditLiability(l)} class="mr-1 rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700">Save</button>
									<button onclick={() => (editLiabilityId = null)} class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600">Cancel</button>
								</td>
							</tr>
						{:else}
							<tr class="hover:bg-gray-50">
								<td class="px-4 py-3 font-medium text-gray-900">{l.name}</td>
								<td class="px-4 py-3 text-right text-gray-700">{fmt(l.balance)}</td>
								<td class="px-4 py-3 text-right text-gray-500">{l.interest_rate}%</td>
								<td class="px-4 py-3 text-right text-gray-700">{fmt(l.monthly_payment)}/mo</td>
								<td class="px-4 py-3 capitalize text-gray-500">{l.type.replace('_', ' ')}</td>
								<td class="px-4 py-3 text-right">
									<button onclick={() => startEditLiability(l)} class="mr-1 rounded border border-gray-300 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50">Edit</button>
									<button onclick={() => deleteLiability(l.id)} class="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Del</button>
								</td>
							</tr>
						{/if}
					{/each}

					{#if addingLiability}
						<tr class="bg-primary-50">
							<td class="px-4 py-2"><input bind:value={newLiability.name} placeholder="Name" class="w-full rounded border border-gray-300 px-2 py-1 text-sm" /></td>
							<td class="px-4 py-2"><input bind:value={newLiability.balance} type="number" placeholder="0" class="w-28 rounded border border-gray-300 px-2 py-1 text-sm text-right" /></td>
							<td class="px-4 py-2"><input bind:value={newLiability.interest_rate} type="number" step="0.01" placeholder="0" class="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-right" /></td>
							<td class="px-4 py-2"><input bind:value={newLiability.monthly_payment} type="number" placeholder="0" class="w-28 rounded border border-gray-300 px-2 py-1 text-sm text-right" /></td>
							<td class="px-4 py-2">
								<select bind:value={newLiability.type} class="rounded border border-gray-300 px-2 py-1 text-sm">
									{#each LIABILITY_TYPES as t}<option value={t}>{t}</option>{/each}
								</select>
							</td>
							<td class="px-4 py-2 text-right">
								<button onclick={addLiability} class="mr-1 rounded bg-primary-600 px-2 py-1 text-xs text-white hover:bg-primary-700">Save</button>
								<button onclick={() => (addingLiability = false)} class="rounded border border-gray-300 px-2 py-1 text-xs text-gray-600">Cancel</button>
							</td>
						</tr>
					{/if}

					{#if liabilities.length === 0 && !addingLiability}
						<tr><td colspan="6" class="px-4 py-6 text-center text-sm text-gray-400">No liabilities yet</td></tr>
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
