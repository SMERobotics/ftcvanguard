<script lang="ts">
	import Footer from "./Footer.svelte";
	import Header from "./Header.svelte";
	import Content from "./Content.svelte";
	import Sidebar from "./Sidebar.svelte";
	import type { ViewId } from "./../views/views.ts";

	let selectedView = $state<ViewId>("schedule");
</script>

<div class="app">
	<Header />
	<div class="content-row">
		<Sidebar
			{selectedView}
			onSelect={(view: ViewId) => {
				selectedView = view;
			}}
		/>
		<Content {selectedView} />
	</div>
	<Footer />
</div>

<style>
	.app {
		height: 100dvh;
		display: flex;
		flex-direction: column;
		background: #181818;
		box-sizing: border-box;
	}

	.content-row {
		flex: 1;
		display: flex;
		min-height: 0;
		background: #181818;
	}
</style>
