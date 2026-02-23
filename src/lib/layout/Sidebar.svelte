<script lang="ts">
	import { VIEW_DEFINITIONS, type ViewId } from "./../views/views.ts";

	let {
		selectedView,
		onSelect
	}: {
		selectedView: ViewId;
		onSelect: (view: ViewId) => void;
	} = $props();
</script>

<aside class="sidebar" id="sidebar">
	<nav class="nav" aria-label="View selection">
		{#each VIEW_DEFINITIONS as view (view.id)}
			<button
				type="button"
				class="sidebar-button"
				id={`button-${view.id}`}
				class:sidebar-active={selectedView === view.id}
				onclick={() => onSelect(view.id)}
				aria-pressed={selectedView === view.id}
				title={view.label}
				style={view.id === "admin" ? "display: none;" : ""}
			>
				{#if view.id === "schedule"}
					<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
						<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path stroke-width="0.1" d="M12,1A11,11,0,1,0,23,12,11.013,11.013,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9.01,9.01,0,0,1,12,21Zm6-9a1,1,0,0,1-1,1H12a1,1,0,0,1-1-1V6a1,1,0,0,1,2,0v5h4A1,1,0,0,1,18,12Z"></path></g></svg>
					</svg>
				{:else if view.id === "rankings"}
					<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
						<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 2em; height: 2em;"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"><path d="M9 7H4.6C4.03995 7 3.75992 7 3.54601 7.10899C3.35785 7.20487 3.20487 7.35785 3.10899 7.54601C3 7.75992 3 8.03995 3 8.6V19.4C3 19.9601 3 20.2401 3.10899 20.454C3.20487 20.6422 3.35785 20.7951 3.54601 20.891C3.75992 21 4.03995 21 4.6 21H9M9 21H15M9 21L9 4.6C9 4.03995 9 3.75992 9.10899 3.54601C9.20487 3.35785 9.35785 3.20487 9.54601 3.10899C9.75992 3 10.0399 3 10.6 3L13.4 3C13.9601 3 14.2401 3 14.454 3.10899C14.6422 3.20487 14.7951 3.35785 14.891 3.54601C15 3.75992 15 4.03995 15 4.6V21M15 11H19.4C19.9601 11 20.2401 11 20.454 11.109C20.6422 11.2049 20.7951 11.3578 20.891 11.546C21 11.7599 21 12.0399 21 12.6V19.4C21 19.9601 21 20.2401 20.891 20.454C20.7951 20.6422 20.6422 20.7951 20.454 20.891C20.2401 21 19.9601 21 19.4 21H15" stroke="#181818" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
					</svg>
				{/if}
			</button>
		{/each}
	</nav>
</aside>

<style>
	#sidebar {
		width: 48px;
		border-right: 1px solid #2b2b2b;
	}

	.sidebar-button {
		width: 100%;
		height: 48px;
		background: none;
		border: none;
		border-left: 2px solid transparent;
		border-right: 2px solid transparent;
		box-sizing: border-box;
		cursor: pointer;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 8px 0;
		-webkit-tap-highlight-color: transparent;
	}

	.sidebar-button svg {
		width: 24px;
		height: 24px;
		stroke: #868686;
		fill: #868686;
		transition: stroke 0.1s, fill 0.1s;
		transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 0.2s;
	}

	.sidebar-button:hover svg {
		stroke: #d7d7d7;
		fill: #d7d7d7;
	}

	.sidebar-button:active svg {
		transform: scale(0.85);
	}


	.sidebar-active {
		border-left: 2px solid #0078d4;
	}

	.sidebar-active svg {
		stroke: #d7d7d7;
		fill: #d7d7d7;
	}

	#button-settings {
		margin-top: auto;
	}

	#button-settings svg {
		transition: transform 0.2s ease-out;
	}

	#button-settings:hover svg {
		transform: rotate(22.5deg);
	}

	#button-logout svg {
		width: 21px;
		height: 21px;
	}
</style>
