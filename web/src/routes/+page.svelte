<script lang="ts">
	import { Avatar, Button } from "@ftcvanguard/design";
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

<div class="flex flex-row h-full w-full">
    <div class="flex min-h-screen w-14 shrink-0 flex-col justify-between border-r bg-chrome py-4">
        <div class="grid gap-1">
            <div class="relative grid h-10 place-items-center before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-r-full before:bg-alliance-blue">
                <ClipboardClock class="size-6 transition-transform duration-200 active:scale-95" />
            </div>
            <div class="grid h-10 place-items-center">
                <Podium class="size-6 transition-transform duration-200 active:scale-95" />
            </div>
        </div>
        <div class="grid h-10 place-items-center">
            <Avatar src={teamImage} alt="team image" />
        </div>
    </div>
    <div class="flex min-w-0 flex-1" bind:this={container}>
        <div class="flex h-full min-h-screen min-w-0 shrink-0 flex-col gap-3 p-2" style:width={`calc((100% - var(--spacing)) * ${leftWidth / 100})`}>
            <ScheduleCard stripe="red"/>
            <ScheduleCard stripe="none"/>
        </div>
        <div class="w-[1px] shrink-0 touch-none cursor-col-resize bg-border" role="separator" aria-label="Resize panels" aria-orientation="vertical" onpointerdown={startResize} onpointermove={resize}></div>
        <div class="flex h-full min-h-screen min-w-0 flex-1 bg-chrome">
            u won the match yayyy
        </div>
    </div>
</div>
