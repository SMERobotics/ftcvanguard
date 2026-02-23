<script lang="ts">
	import RankingsView from "./../views/RankingsView.svelte";
	import ScheduleView from "./../views/ScheduleView.svelte";
	import type { ViewId } from "./../views/views.ts";

	let { selectedView }: { selectedView: ViewId } = $props();

	const viewComponents: Record<ViewId, typeof RankingsView> = {
		schedule: ScheduleView,
		rankings: RankingsView,
	};

	const ActiveView = $derived(viewComponents[selectedView] ?? ScheduleView);
</script>

<content class="content">
	<ActiveView />
</content>

<style>
	.content {
		flex: 1;
		min-width: 0;
		background: #181818;
		display: flex;
		flex-direction: column;
	}
</style>
