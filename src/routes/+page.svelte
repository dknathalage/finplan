<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	onMount(() => {
		goto('/console', { replaceState: true });
	});
</script>

<p class="p-8 text-gray-500">Loading FinPlan…</p>
