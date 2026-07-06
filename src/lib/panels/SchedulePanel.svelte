<script lang="ts">
    import { onMount, tick } from "svelte";

    import {
        Hash,
        Sword,
        Swords,
    } from "@lucide/svelte";

    import IconButton from "../../lib/components/IconButton.svelte";

    import { currentEvent } from "../states/event-state.svelte";
    import { currentTeam } from "../states/team-state.svelte";

    import { type MatchResult, type Alliance } from "../types/match.types";

    import ScheduleCard from "../components/schedule/ScheduleCard.svelte";

    import { get } from "../api";
    
    // api schema returns

    interface ScheduleTeam {
        teamNumber: number;
        station: string;
    }

    interface ScheduleMatch {
        description: string;
        tournamentLevel: string;
        series: number;
        matchNumber: number;
        startTime: string;
        postResultTime: string | null;
        scoreRedFinal: number | null;
        scoreBlueFinal: number | null;
        redWins: boolean;
        blueWins: boolean;
        teams: ScheduleTeam[];
        field: string;
    }

    interface ScheduleResponse {
        schedule?: ScheduleMatch[];
    }

    interface ScheduleCardData {
        id: string;
        name: string;
        time: string;
        alliance: Alliance;
        result: MatchResult;
        red1: number;
        red2: number;
        blue1: number;
        blue2: number;
        scoreRedFinal: number;
        scoreBlueFinal: number;
        redWins: boolean;
        blueWins: boolean;
        tournamentLevel: string;
        startTime: string;
        concluded: boolean;
        field: string;
    }

    let matches = $state<ScheduleMatch[]>([]);
    let filteredMatches = $derived(
        matches.filter((match) => {
            if (filterToTeam && !match.teams.some((team) => team.teamNumber === currentTeam.state)) {
                return false;
            }
            if (filterToQualifications && match.tournamentLevel !== "QUALIFICATION") {
                return false;
            }
            if (filterToPlayoffs && match.tournamentLevel !== "PLAYOFF") {
                return false;
            }
            return true;
        })
    );
    let now = $state(Date.now());

    // scrollbar state
    let scroller: HTMLDivElement | undefined;
    let scrollbarVisible = $state(false);
    let scrollbarThumbTop = $state(0);
    let scrollbarThumbHeight = $state(0);
    let scrollbarDragging = $state(false);
    let stopScrollbarDrag: (() => void) | null = null;

    // filter toggle state
    let filterToTeam = $state(false);
    let filterToQualifications = $state(false);
    let filterToPlayoffs = $state(false);

    const scrollbarInset = 4;
    const scrollbarMinThumbHeight = 24;

    const timeFormatter = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });

    function clamp(value: number, min: number, max: number) {
        return Math.min(max, Math.max(min, value));
    }

    function getTeamNumber(match: ScheduleMatch, station: string) {
        return (
            match.teams.find((team) => team.station === station)?.teamNumber ?? 0
        );
    }

    function getAlliance(match: ScheduleMatch): Alliance {
        const team = match.teams.find(
            (matchTeam) => matchTeam.teamNumber === currentTeam.state,
        );

        if (team?.station.startsWith("Red")) return "red";
        if (team?.station.startsWith("Blue")) return "blue";
        return null;
    }

    function getResult(match: ScheduleMatch, alliance: Alliance): MatchResult {
        if (!match.postResultTime || !alliance) return null;
        if (match.redWins === match.blueWins) return "tie";
        if (alliance === "red") return match.redWins ? "win" : "loss";
        return match.blueWins ? "win" : "loss";
    }

    function formatTime(startTime: string) {
        const date = new Date(startTime);
        return Number.isNaN(date.getTime()) ? "" : timeFormatter.format(date);
    }

    function toScheduleCard(match: ScheduleMatch): ScheduleCardData {
        const alliance = getAlliance(match);

        return {
            id: `${match.tournamentLevel}-${match.series}-${match.matchNumber}-${match.field}`,
            name: match.description,
            time: formatTime(match.startTime),
            alliance,
            result: getResult(match, alliance),
            red1: getTeamNumber(match, "Red1"),
            red2: getTeamNumber(match, "Red2"),
            blue1: getTeamNumber(match, "Blue1"),
            blue2: getTeamNumber(match, "Blue2"),
            scoreRedFinal: match.scoreRedFinal ?? 0,
            scoreBlueFinal: match.scoreBlueFinal ?? 0,
            redWins: match.redWins,
            blueWins: match.blueWins,
            tournamentLevel: match.tournamentLevel,
            startTime: match.startTime,
            concluded: Boolean(match.postResultTime),
            field: match.field,
        };
    }

    function getCountdown(card: ScheduleCardData) {
        // TODO: completely redo countdown system closer to season kickoff

        if (card.concluded) return "Concluded";

        const start = new Date(card.startTime).getTime();
        if (Number.isNaN(start)) return "";

        const seconds = Math.ceil((start - now) / 1000);
        if (seconds <= 0) return "In progress";

        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (days > 0) return `Starts in ${days}d ${hours}h`;
        if (hours > 0) return `Starts in ${hours}h ${minutes}m`;
        if (minutes > 0) return `Starts in ${minutes}m`;
        return `Starts in ${seconds}s`;
    }

    function isPlayoffStart(card: ScheduleCardData, index: number) {
        return card.tournamentLevel === "PLAYOFF" && cards[index - 1]?.tournamentLevel !== "PLAYOFF";
    }

    function getScrollbarData() {
        if (!scroller) return null;

        const { clientHeight, scrollHeight, scrollTop } = scroller;
        const maxScrollTop = scrollHeight - clientHeight;
        if (maxScrollTop <= 1) return null;

        const trackHeight = Math.max(
            scrollbarMinThumbHeight,
            clientHeight - scrollbarInset * 2,
        );
        const thumbHeight = clamp(
            trackHeight * clientHeight / scrollHeight,
            scrollbarMinThumbHeight,
            trackHeight,
        );

        return {
            maxScrollTop,
            maxThumbTop: trackHeight - thumbHeight,
            scrollTop,
            thumbHeight,
        };
    }

    function updateScrollbar() {
        const metrics = getScrollbarData();
        scrollbarVisible = Boolean(metrics);
        scrollbarThumbHeight = metrics?.thumbHeight ?? 0;
        scrollbarThumbTop = metrics
            ? metrics.maxThumbTop * (metrics.scrollTop / metrics.maxScrollTop)
            : 0;
    }

    function scrollToThumb(thumbTop: number) {
        const metrics = getScrollbarData();
        if (!metrics || !scroller) return;

        const nextThumbTop = clamp(thumbTop, 0, metrics.maxThumbTop);
        const progress =
            metrics.maxThumbTop === 0 ? 0 : nextThumbTop / metrics.maxThumbTop;

        scroller.scrollTop = progress * metrics.maxScrollTop;
        updateScrollbar();
    }

    function startScrollbarDrag(event: PointerEvent) {
        stopScrollbarDrag?.();
        event.preventDefault();

        const startY = event.clientY;
        const startTop = scrollbarThumbTop;
        scrollbarDragging = true;

        const controller = new AbortController();
        const previousUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = "none";

        function updateDrag(moveEvent: PointerEvent) {
            moveEvent.preventDefault();
            scrollToThumb(startTop + moveEvent.clientY - startY);
        }

        function stopDrag() {
            scrollbarDragging = false;
            document.body.style.userSelect = previousUserSelect;
            controller.abort();
            stopScrollbarDrag = null;
        }

        stopScrollbarDrag = stopDrag;
        window.addEventListener("pointermove", updateDrag, {
            signal: controller.signal,
        });
        window.addEventListener("pointerup", stopDrag, {
            signal: controller.signal,
        });
        window.addEventListener("pointercancel", stopDrag, {
            signal: controller.signal,
        });
    }

    //

    async function loadSchedule(eventCode: string) {
        const response = await get<ScheduleResponse | ScheduleMatch[]>(
            `/schedule/get?event=${eventCode}`,
        );

        matches = Array.isArray(response) ? response : (response.schedule ?? []);
    }

    let cards = $derived(filteredMatches.map(toScheduleCard));

    $effect(() => {
        if (currentEvent.state) {
            void loadSchedule(currentEvent.state);
        }
    });

    $effect(() => {
        const cardCount = cards.length;
        void tick().then(() => {
            if (cardCount === cards.length) {
                updateScrollbar();
            }
        });
    });

    onMount(() => {
        const interval = window.setInterval(() => {
            now = Date.now();
        }, 1000);

        const resizeObserver = new ResizeObserver(updateScrollbar);
        if (scroller) {
            resizeObserver.observe(scroller);
        }

        void tick().then(updateScrollbar);

        return () => {
            stopScrollbarDrag?.();
            window.clearInterval(interval);
            resizeObserver.disconnect();
        };
    });
</script>

<div class="flex h-full min-h-0 flex-col">
    <div class="h-10 shrink-0 border-b border-(--border) flex p-[5px] gap-[5px]">
        <IconButton
            icon={Hash}
            label="Filter to team"
            active={filterToTeam}
            aria-pressed={filterToTeam}
            onclick={() => {
                filterToTeam = !filterToTeam;
            }}
        />
        <IconButton
            icon={Sword}
            label="Filter to qualifications"
            active={filterToQualifications}
            aria-pressed={filterToQualifications}
            onclick={() => {
                filterToQualifications = !filterToQualifications;
            }}
        />
        <IconButton
            icon={Swords}
            label="Filter to playoffs"
            active={filterToPlayoffs}
            aria-pressed={filterToPlayoffs}
            onclick={() => {
                filterToPlayoffs = !filterToPlayoffs;
            }}
        />
    </div>
    <div class="relative min-h-0 flex-1 overflow-hidden">
        <div
            bind:this={scroller}
            class="schedule-card-list grid h-full min-h-0 content-start grid-cols-[repeat(auto-fit,minmax(282px,1fr))] gap-[8px] p-[8px]"
            onscroll={updateScrollbar}
        >
            {#each cards as card, index (card.id)}
                {#if isPlayoffStart(card, index) && !(filterToQualifications || filterToPlayoffs)}
                    <div class="col-span-full h-px bg-(--border)"></div>
                {/if}
                <ScheduleCard
                    name={card.name}
                    time={card.time}
                    alliance={card.alliance}
                    result={card.result}
                    red1={card.red1}
                    red2={card.red2}
                    blue1={card.blue1}
                    blue2={card.blue2}
                    scoreRedFinal={card.scoreRedFinal}
                    scoreBlueFinal={card.scoreBlueFinal}
                    redWins={card.redWins}
                    blueWins={card.blueWins}
                    countdown={getCountdown(card)}
                    field={card.field}
                    onSelect={() => {}}
                />
            {/each}
        </div>

        {#if scrollbarVisible}
            <div
                class="pointer-events-none absolute right-[2px] w-[4px]"
                style={`top: ${scrollbarInset}px; bottom: ${scrollbarInset}px;`}
            >
                <button
                    type="button"
                    tabindex="-1"
                    aria-label="Scroll schedule"
                    class="scrollbar-thumb pointer-events-auto absolute right-0 w-[4px] appearance-none rounded-full border-0 p-0"
                    class:scrollbar-thumb-dragging={scrollbarDragging}
                    style={`height: ${scrollbarThumbHeight}px; transform: translateY(${scrollbarThumbTop}px);`}
                    onpointerdown={startScrollbarDrag}
                ></button>
            </div>
        {/if}
    </div>
</div>

<style>
    .schedule-card-list {
        overflow-y: auto;
        scrollbar-width: none;
    }

    .schedule-card-list::-webkit-scrollbar {
        display: none;
    }

    .scrollbar-thumb {
        background: rgb(230 237 243 / 18%);
    }

    .scrollbar-thumb:hover,
    .scrollbar-thumb-dragging {
        background: rgb(230 237 243 / 30%);
    }
</style>
