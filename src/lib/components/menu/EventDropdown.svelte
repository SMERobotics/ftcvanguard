<script lang="ts">
    import { ChevronDown } from "@lucide/svelte";

    import { currentTeam } from "../../states/team-state.svelte";
    import { currentEvent } from "../../states/event-state.svelte";

    import { get } from "../../api";
    import EventDropdownOption from "./EventDropdownOption.svelte";

    type TeamEvent = {
        eventId: string;
        code: string;
        name: string;
        typeName: string;
        dateStart: string;
    };

    type EventsResponse = {
        events: TeamEvent[];
    };

    const eventDateFormatter = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });

    let events = $state<TeamEvent[]>([]);
    let selectedEvent = $state<TeamEvent | undefined>(undefined);

    async function loadEvents(teamNumber: number) {
        const response = await get<EventsResponse>(
            `/events/get?number=${teamNumber}`,
        );

        events = [...response.events].sort(
            (a, b) => Date.parse(a.dateStart) - Date.parse(b.dateStart),
        );

        if (events.length === 0) {
            selectedEvent = undefined;
            return;
        }

        selectEvent(events.findLast((event) => Date.parse(event.dateStart) <= Date.now()) ?? events[0]);
    }

    $effect(() => {
        void loadEvents(currentTeam.state);
    });

    let open = $state(false);
    let root: HTMLDivElement;

    function close() {
        open = false;
    }

    function toggle() {
        open = !open;
    }

    function formatDate(date: string) {
        return eventDateFormatter.format(new Date(date));
    }

    function selectEvent(event: TeamEvent) {
        selectedEvent = event;
        currentEvent.state = event.code;
        close();
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

<div class="relative select-none" bind:this={root}>
    <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onclick={toggle}
        class="ml-[8px] flex select-none items-center rounded-md bg-transparent py-[5px] pl-[10px] pr-[8px] font-sans text-sm text-(--inactive) hover:bg-(--border) hover:text-(--active)"
    >
        <span>{selectedEvent?.name ?? "No Events"}</span>
        <ChevronDown class="ml-[4px] h-[15px] w-[15px] text-(--detail)" />
    </button>

    {#if open}
        <div
            class="absolute top-[35px] z-20 w-[512px] rounded-md border border-(--border) bg-(--immediate) p-[7px]"
            role="menu"
        >
            {#if events.length === 0}
                <div class="select-none px-[10px] py-[8px] font-sans text-sm text-(--detail)">
                    low cortisol robotics, am I right?
                </div>
            {:else}
                {#each events as event (event.eventId)}
                    <EventDropdownOption
                        name={event.name}
                        code={event.code}
                        type={event.typeName}
                        date={formatDate(event.dateStart)}
                        onSelect={() => selectEvent(event)}
                    />
                {/each}
            {/if}
        </div>
    {/if}
</div>
