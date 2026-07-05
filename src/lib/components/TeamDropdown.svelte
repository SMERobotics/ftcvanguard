<script lang="ts">
    import { ChevronDown } from "@lucide/svelte";

    import { currentTeam } from "../states/team-state.svelte";

    let open = $state(false);
    let root: HTMLDivElement;

    function close() {
        open = false;
    }

    function toggle() {
        open = !open;
    }

    $effect(() => {
        if (!open || typeof document === "undefined") {
            return;
        }

        function handlePointerDown(event: PointerEvent) {
            if (!root.contains(event.target as Node)) {
                close();
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") {
                close();
            }
        }

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    });
</script>

<div class="relative" bind:this={root}>
    <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onclick={toggle}
        class="ml-[8px] flex items-center rounded-md bg-transparent py-[5px] pl-[10px] pr-[8px] font-sans text-sm text-(--inactive) hover:bg-(--border) hover:text-(--active)"
    >
        <span class="h-5 w-5 mr-[5px] bg-contain bg-center bg-norepeat inline-block team team-{currentTeam?.state}"></span>
        <span>{currentTeam?.state}</span>
        <ChevronDown class="ml-[4px] h-[15px] w-[15px] text-(--detail)" />
    </button>

    {#if open}
        <div
            class="absolute top-[35px] z-20 w-[256px] rounded-md border border-(--border) bg-(--immediate) p-[7px]"
            role="menu"
        >
            <button
                type="button"
                role="menuitem"
                onclick={close}
                class="w-full rounded-[4px] bg-transparent font-sans text-sm text-(--inactive) hover:bg-(--menu-hover) hover:text-(--active) py-[5px] flex-col"
            >
                <!-- TODO: maybe consider swapping places of team name and role? -->
                <div class="flex h-[24px] items-center pl-[10px] pr-[8px]">
                    <span class="h-5 w-5 mr-[5px] bg-contain bg-center bg-norepeat inline-block team team-{currentTeam?.state}"></span>
                    <span>{currentTeam?.state}</span>
                    <span class="ml-auto text-(--detail)">SME Cavalry</span>
                </div>
                <div class="flex h-[20px] items-center pl-[10px] pr-[8px]">
                    <span class="ml-[25px] text-(--detail)">Team Captain</span>
                </div>
            </button>
            <button
            type="button"
            role="menuitem"
            onclick={close}
            class="w-full rounded-[4px] bg-transparent font-sans text-sm text-(--inactive) hover:bg-(--menu-hover) hover:text-(--active) py-[5px] flex-col"
        >
            <!-- TODO: maybe consider swapping places of team name and role? -->
            <div class="flex h-[24px] items-center pl-[10px] pr-[8px]">
                <span class="h-5 w-5 mr-[5px] bg-contain bg-center bg-norepeat inline-block team team-6547"></span>
                <span>6547</span>
                <span class="ml-auto text-(--detail)">Cobalt Colts</span>
            </div>
            <div class="flex h-[20px] items-center pl-[10px] pr-[8px]">
                <span class="ml-[25px] text-(--detail)">Guest</span>
            </div>
        </button>
        </div>
    {/if}
</div>

<style>
    :where(.team) {
        background-image: url("data:image/png;base64,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");
    }
</style>
