<script lang="ts">
    import {Avatar, type SelectItem} from "@ftcvanguard/design";
    import {Select} from "@ftcvanguard/design";
    import { ClipboardClock, Podium, User } from "@lucide/svelte";
    import ScheduleCard from "#lib/components/schedule/ScheduleCard.svelte"
    import teamImage from "#lib/assets/team.png"

    let leftWidth = $state(30);
    let container: HTMLDivElement;

    function startResize(e: PointerEvent) {
        const handle = e.currentTarget as HTMLDivElement;
        handle.setPointerCapture(e.pointerId);
    }

    function resize(e: PointerEvent) {
        const handle = e.currentTarget as HTMLDivElement;
        if (!handle.hasPointerCapture(e.pointerId)) return;

        const { left, width } = container.getBoundingClientRect();
        const handleWidth = handle.offsetWidth;
        const position = e.clientX - left - handleWidth / 2;
        leftWidth = Math.max(25, Math.min(35, (position / (width - handleWidth)) * 100));
    }
</script>
<div class="flex min-w-0 flex-1" bind:this={container}>
    <div class="flex min-w-0 shrink-0 flex-col gap-3 overflow-auto p-2" style:width={`calc((100% - var(--spacing)) * ${leftWidth / 100})`}>
        <ScheduleCard stripe="red"/>
        <ScheduleCard stripe="none"/>
    </div>
    <div class="w-[1px] shrink-0 touch-none cursor-col-resize bg-border" role="separator" aria-label="Resize panels" aria-orientation="vertical" onpointerdown={startResize} onpointermove={resize}></div>
    <div class="flex min-w-0 flex-1 overflow-auto bg-chrome">
        u won the match yayyy
    </div>
</div>