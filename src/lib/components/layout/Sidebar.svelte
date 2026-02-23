<script lang="ts">
	import { VIEW_DEFINITIONS, type ViewId } from "./views";

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
						<path stroke-width="0.1" fill="currentColor" d="M12,1A11,11,0,1,0,23,12,11.013,11.013,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9.01,9.01,0,0,1,12,21Zm6-9a1,1,0,0,1-1,1H12a1,1,0,0,1-1-1V6a1,1,0,0,1,2,0v5h4A1,1,0,0,1,18,12Z"></path>
					</svg>
				{:else if view.id === "rankings"}
					<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
						<path d="M9 7H4.6C4.03995 7 3.75992 7 3.54601 7.10899C3.35785 7.20487 3.20487 7.35785 3.10899 7.54601C3 7.75992 3 8.03995 3 8.6V19.4C3 19.9601 3 20.2401 3.10899 20.454C3.20487 20.6422 3.35785 20.7951 3.54601 20.891C3.75992 21 4.03995 21 4.6 21H9M9 21H15M9 21L9 4.6C9 4.03995 9 3.75992 9.10899 3.54601C9.20487 3.35785 9.35785 3.20487 9.54601 3.10899C9.75992 3 10.0399 3 10.6 3L13.4 3C13.9601 3 14.2401 3 14.454 3.10899C14.6422 3.20487 14.7951 3.35785 14.891 3.54601C15 3.75992 15 4.03995 15 4.6V21M15 11H19.4C19.9601 11 20.2401 11 20.454 11.109C20.6422 11.2049 20.7951 11.3578 20.891 11.546C21 11.7599 21 12.0399 21 12.6V19.4C21 19.9601 21 20.2401 20.891 20.454C20.7951 20.6422 20.6422 20.7951 20.454 20.891C20.2401 21 19.9601 21 19.4 21H15" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"></path>
					</svg>
				{:else if view.id === "settings"}
					<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
						<g stroke-width="1.608" fill="none" fill-rule="evenodd" stroke="currentColor">
							<circle stroke-width="1.608" stroke-linecap="round" cx="12" cy="12" r="3"></circle>
							<path d="M10.069,3.36281 C10.7151,1.54573 13.2849,1.54573 13.931,3.3628 C14.338,4.5071 15.6451,5.04852 16.742,4.52713 C18.4837,3.69918 20.3008,5.51625 19.4729,7.25803 C18.9515,8.35491 19.4929,9.66203 20.6372,10.069 C22.4543,10.7151 22.4543,13.2849 20.6372,13.931 C19.4929,14.338 18.9515,15.6451 19.4729,16.742 C20.3008,18.4837 18.4837,20.3008 16.742,19.4729 C15.6451,18.9515 14.338,19.4929 13.931,20.6372 C13.2849,22.4543 10.7151,22.4543 10.069,20.6372 C9.66203,19.4929 8.35491,18.9515 7.25803,19.4729 C5.51625,20.3008 3.69918,18.4837 4.52713,16.742 C5.04852,15.6451 4.5071,14.338 3.3628,13.931 C1.54573,13.2849 1.54573,10.7151 3.36281,10.069 C4.5071,9.66203 5.04852,8.35491 4.52713,7.25803 C3.69918,5.51625 5.51625,3.69918 7.25803,4.52713 C8.35491,5.04852 9.66203,4.5071 10.069,3.36281 Z" stroke-width="1.608" stroke-linecap="round"></path>
						</g>
					</svg>
				{:else if view.id === "about"}
					<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
						<path d="M12 16V12M12 8H12.01M7.8 21H16.2C17.8802 21 18.7202 21 19.362 20.673C19.9265 20.3854 20.3854 19.9265 20.673 19.362C21 18.7202 21 17.8802 21 16.2V7.8C21 6.11984 21 5.27976 20.673 4.63803C20.3854 4.07354 19.9265 3.6146 19.362 3.32698C18.7202 3 17.8802 3 16.2 3H7.8C6.11984 3 5.27976 3 4.63803 3.32698C4.07354 3.6146 3.6146 4.07354 3.32698 4.63803C3 5.27976 3 6.11984 3 7.8V16.2C3 17.8802 3 18.7202 3.32698 19.362C3.6146 19.9265 4.07354 20.3854 4.63803 20.673C5.27976 21 6.11984 21 7.8 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
					</svg>
				{:else if view.id === "admin"}
					<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
						<path fill-rule="evenodd" clip-rule="evenodd" fill="currentColor" d="M8.00001 5V8.00415C7.50208 8.01124 7.05704 8.03041 6.67222 8.08214C6.0167 8.17028 5.38835 8.36902 4.87869 8.87868C4.36902 9.38835 4.17028 10.0167 4.08215 10.6722C3.99991 11.2839 3.99995 12.0477 4 12.9342V17.0658C3.99995 17.9523 3.99991 18.7161 4.08215 19.3278C4.17028 19.9833 4.36902 20.6117 4.87869 21.1213C5.38835 21.631 6.0167 21.8297 6.67222 21.9179C7.28387 22.0001 8.0477 22.0001 8.93417 22H15.0659C15.9523 22.0001 16.7161 22.0001 17.3278 21.9179C17.9833 21.8297 18.6117 21.631 19.1213 21.1213C19.631 20.6117 19.8297 19.9833 19.9179 19.3278C20.0001 18.7161 20.0001 17.9523 20 17.0658V12.9342C20.0001 12.0477 20.0001 11.2839 19.9179 10.6722C19.8297 10.0167 19.631 9.38835 19.1213 8.87868C18.6117 8.36902 17.9833 8.17028 17.3278 8.08215C16.943 8.03041 16.4979 8.01124 16 8.00415V5C16 3.34315 14.6569 2 13 2H11C9.34316 2 8.00001 3.34315 8.00001 5ZM11 4C10.4477 4 10 4.44772 10 5V8L14 8V5C14 4.44772 13.5523 4 13 4H11ZM12 13C10.8954 13 10 13.8954 10 15C10 16.1046 10.8954 17 12 17C13.1046 17 14 16.1046 14 15C14 13.8954 13.1046 13 12 13Z"></path>
					</svg>
				{:else if view.id === "logout"}
					<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
						<path stroke-width="0.5" fill="currentColor" d="M7.707,8.707,5.414,11H17a1,1,0,0,1,0,2H5.414l2.293,2.293a1,1,0,1,1-1.414,1.414l-4-4a1,1,0,0,1,0-1.414l4-4A1,1,0,1,1,7.707,8.707ZM21,1H13a1,1,0,0,0,0,2h7V21H13a1,1,0,0,0,0,2h8a1,1,0,0,0,1-1V2A1,1,0,0,0,21,1Z"></path>
					</svg>
				{/if}
			</button>
		{/each}
	</nav>
</aside>

<style>
	#sidebar {
		grid-area: sidebar;
		background-color: #181818;
		display: flex;
		flex-direction: column;
		border-right: 1px solid #2b2b2b;
		z-index: 1;
		width: 48px;
		flex: 0 0 48px;
	}

	.nav {
		display: flex;
		flex-direction: column;
		height: 100%;
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
        color: #868686;
    }

    .sidebar-button svg {
        width: 24px;
        height: 24px;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.2s;
    }

    .sidebar-button:active svg {
        transform: scale(0.85);
    }

    .sidebar-button:focus-visible {
        outline: 2px solid #0078d4;
        outline-offset: -2px;
    }

	.sidebar-button:hover {
		color: #d7d7d7;
	}

	.sidebar-active {
		border-left: 2px solid #0078d4;
		color: #d7d7d7;
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
