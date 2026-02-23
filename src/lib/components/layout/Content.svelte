<script lang="ts">
	import RankingsView from "./views/RankingsView.svelte";
	import ScheduleView from "./views/ScheduleView.svelte";
	import SettingsView from "./views/SettingsView.svelte";
	import AboutView from "./views/AboutView.svelte";
	import AdminView from "./views/AdminView.svelte";
	import LogoutView from "./views/LogoutView.svelte";
	import type { ViewId } from "./views";

	let { selectedView }: { selectedView: ViewId } = $props();

	const viewComponents: Record<ViewId, typeof RankingsView> = {
		schedule: ScheduleView,
		rankings: RankingsView,
		settings: SettingsView,
		about: AboutView,
		admin: AdminView,
		logout: LogoutView
	};

	const ActiveView = $derived(viewComponents[selectedView] ?? ScheduleView);
</script>

<main class="content">
	<ActiveView />
</main>

<style>
	.content {
		flex: 1;
		min-width: 0;
		background: #181818;
		display: flex;
		flex-direction: column;
	}
</style>
