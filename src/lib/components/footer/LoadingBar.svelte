<script module lang="ts">
    import { writable } from "svelte/store";

    const loadingBarVisible = writable(false);
    let status = $state("");

    export function showLoadingBar(target: string) {
        loadingBarVisible.set(true);
        status = target;
    }

    export function hideLoadingBar() {
        loadingBarVisible.set(false);
        status = "";
    }

</script>

<div class="flex h-full select-none items-center justify-end pr-[13px]">
    {#if $loadingBarVisible}
        <span class="text-sm text-(--detail) mr-2">{status}</span>
        <div
            class="loading-bar h-[6px] max-w-[calc(100vw-24px)] overflow-hidden rounded-full"
            role="progressbar"
            aria-label="Loading"
        >
            <div class="loading-bar-fill h-full w-[38%] rounded-full"></div>
        </div>
    {/if}
</div>

<style>
    .loading-bar {
        width: 512px;
        background: rgb(255 255 255 / 6%);
    }

    .loading-bar-fill {
        background: linear-gradient(
            90deg,
            var(--primary),
            var(--primary-hover),
            var(--primary)
        );
        animation: loading-bar-slide 1.15s cubic-bezier(0.4, 0, 0.2, 1)
            infinite;
        will-change: transform;
    }

    @keyframes loading-bar-slide {
        from {
            transform: translateX(-110%);
        }

        to {
            transform: translateX(270%);
        }
    }
</style>
