<script lang="ts">
    import { onMount, tick } from "svelte";

    import {
        Hash,
        Shield,
        Sword,
        Swords,
    } from "@lucide/svelte";

    import IconButton from "../../lib/components/IconButton.svelte";
    import InputField from "../../lib/components/InputField.svelte";
    import { showLoadingBar, hideLoadingBar } from "../../lib/components/footer/LoadingBar.svelte";

    import { currentEvent } from "../states/event-state.svelte";
    import { currentTeam } from "../states/team-state.svelte";

    import {
        type MatchResult,
        type Alliance,
        type MatchType,
    } from "../types/match.types";

    import ScheduleCard from "../components/schedule/ScheduleCard.svelte";

    import { get } from "../api";
    
    type ScheduleStation =
        | "Red1"
        | "Red2"
        | "Red3"
        | "Blue1"
        | "Blue2"
        | "Blue3";

    interface ScheduleTeamAttributes {
        surrogate: boolean;
        noShow: boolean;
        dq: boolean;
        onField: boolean;
    }

    interface ScheduleTeam {
        number: number;
        name: string;
        station: string;
        attributes: ScheduleTeamAttributes;
    }

    interface ScheduleMatchNumber {
        series: number;
        match: number;
    }

    interface ScheduleMatchTimes {
        scheduled: string | null;
        queuing: string | null;
        actual: string | null;
        results: string | null;
    }

    interface ScheduleMatchResults {
        scoreRedFinal: number;
        scoreBlueFinal: number;
        redWins: boolean;
        blueWins: boolean;
    }

    interface ScheduleMatch {
        name: string;
        type: MatchType;
        number: ScheduleMatchNumber;
        field: string;
        times: ScheduleMatchTimes;
        teams: ScheduleTeam[];
        results: ScheduleMatchResults | null;
    }

    interface ScheduleResponse {
        schedule: ScheduleMatch[];
    }

    interface ScheduleCardData {
        id: string;
        name: string;
        time: string;
        alliance: Alliance;
        result: MatchResult;
        red1: number | null;
        red2: number | null;
        red3: number | null;
        blue1: number | null;
        blue2: number | null;
        blue3: number | null;
        scoreRedFinal: number;
        scoreBlueFinal: number;
        redWins: boolean;
        blueWins: boolean;
        type: MatchType;
        scheduledTime: string | null;
        concluded: boolean;
        field: string;
    }

    let matches = $state<ScheduleMatch[]>([]);
    let filteredMatches = $derived(
        matches.filter((match) => {
            if (filterToTeam && !match.teams.some((team) => team.number === currentTeam.state)) {
                return false;
            }
            if (filterToPractice && match.type !== "practice") {
                return false;
            }
            if (filterToQualifications && match.type !== "qual") {
                return false;
            }
            if (filterToPlayoffs && match.type !== "playoff") {
                return false;
            }
            const teamQuery = searchTeamQuery.trim();
            if (
                teamQuery &&
                !match.teams.some((team) =>
                    String(team.number).includes(teamQuery),
                )
            ) {
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
    let filterToPractice = $state(false);
    let filterToQualifications = $state(false);
    let filterToPlayoffs = $state(false);
    
    let searchTeamQuery = $state("");

    const scrollbarInset = 4;
    const scrollbarMinThumbHeight = 24;

    const timeFormatter = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });

    function clamp(value: number, min: number, max: number) {
        return Math.min(max, Math.max(min, value));
    }

    function getTeamNumber(match: ScheduleMatch, station: ScheduleStation) {
        return (
            match.teams.find((team) => team.station === station)?.number ?? null
        );
    }

    function getAlliance(match: ScheduleMatch): Alliance {
        const team = match.teams.find(
            (matchTeam) => matchTeam.number === currentTeam.state,
        );

        if (team?.station.startsWith("Red")) return "red";
        if (team?.station.startsWith("Blue")) return "blue";
        return null;
    }

    function getResult(match: ScheduleMatch, alliance: Alliance): MatchResult {
        if (!match.times.results || !alliance || !match.results) return null;
        if (match.results.redWins === match.results.blueWins) return "tie";
        if (alliance === "red") return match.results.redWins ? "win" : "loss";
        return match.results.blueWins ? "win" : "loss";
    }

    function formatTime(scheduledTime: string | null) {
        if (!scheduledTime) return "";

        const date = new Date(scheduledTime);
        return Number.isNaN(date.getTime()) ? "" : timeFormatter.format(date);
    }

    function toScheduleCard(match: ScheduleMatch): ScheduleCardData {
        const alliance = getAlliance(match);
        const results = match.results;

        return {
            id: `${match.type}-${match.number.series}-${match.number.match}-${match.field}`,
            name: match.name,
            time: formatTime(match.times.scheduled),
            alliance,
            result: getResult(match, alliance),
            red1: getTeamNumber(match, "Red1"),
            red2: getTeamNumber(match, "Red2"),
            red3: getTeamNumber(match, "Red3"),
            blue1: getTeamNumber(match, "Blue1"),
            blue2: getTeamNumber(match, "Blue2"),
            blue3: getTeamNumber(match, "Blue3"),
            scoreRedFinal: results?.scoreRedFinal ?? 0,
            scoreBlueFinal: results?.scoreBlueFinal ?? 0,
            redWins: results?.redWins ?? false,
            blueWins: results?.blueWins ?? false,
            type: match.type,
            scheduledTime: match.times.scheduled,
            concluded: Boolean(match.times.results),
            field: match.field,
        };
    }

    function getCountdown(card: ScheduleCardData) {
        // TODO: completely redo countdown system closer to season kickoff

        if (card.concluded) return "Concluded";

        if (!card.scheduledTime) return "";

        const start = new Date(card.scheduledTime).getTime();
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

    function isQualificationStart(card: ScheduleCardData, index: number) {
        return (card.type === "qual" && cards[index - 1]?.type !== "qual") && (cards.some((match) => match.type === "practice"));
    }

    function isPlayoffStart(card: ScheduleCardData, index: number) {
        return (card.type === "playoff" && cards[index - 1]?.type !== "playoff") && (cards.some((match) => match.type === "qual"));
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
        showLoadingBar();

        try {
            const response = await get<ScheduleResponse>(
                `/schedule/get?event=${eventCode}`,
            );

            matches = response.schedule;
        } finally {
            hideLoadingBar();
        }
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
            icon={Shield}
            label="Filter to practice"
            active={filterToPractice}
            aria-pressed={filterToPractice}
            onclick={() => {
                filterToPractice = !filterToPractice;
                filterToQualifications = false;
                filterToPlayoffs = false;
            }}
        />
        <IconButton
            icon={Sword}
            label="Filter to qualifications"
            active={filterToQualifications}
            aria-pressed={filterToQualifications}
            onclick={() => {
                filterToQualifications = !filterToQualifications;
                filterToPractice = false;
                filterToPlayoffs = false;
            }}
        />
        <IconButton
            icon={Swords}
            label="Filter to playoffs"
            active={filterToPlayoffs}
            aria-pressed={filterToPlayoffs}
            onclick={() => {
                filterToPlayoffs = !filterToPlayoffs;
                filterToPractice = false;
                filterToQualifications = false;
            }}
        />
        <div class="ml-2">
            <span class="mr-1 select-none text-sm text-(--text-primary)">Search:</span>
            <InputField
                class="font-mono max-w-[64px] text-right"
                placeholder="20181"
                maxlength={5}
                bind:value={searchTeamQuery}
            />
        </div>
    </div>
    <div class="relative min-h-0 flex-1 overflow-hidden">
        <div
            bind:this={scroller}
            class="schedule-card-list grid h-full min-h-0 content-start grid-cols-[repeat(auto-fit,minmax(282px,1fr))] gap-[8px] p-[8px]"
            onscroll={updateScrollbar}
        >
            {#if cards.length === 0}
                <div class="col-span-full mt-2 select-none text-center text-sm text-(--detail)">
                    low cortisol robotics, am I right?
                </div>
            {:else}
                {#each cards as card, index (card.id)}
                    {#if isQualificationStart(card, index)}
                        <div class="col-span-full h-px select-none bg-(--border)"></div>
                    {/if}
                    {#if isPlayoffStart(card, index)}
                        <div class="col-span-full h-px select-none bg-(--border)"></div>
                    {/if}
                    <ScheduleCard
                        name={card.name}
                        time={card.time}
                        alliance={card.alliance}
                        result={card.result}
                        red1={card.red1}
                        red2={card.red2}
                        red3={card.red3}
                        blue1={card.blue1}
                        blue2={card.blue2}
                        blue3={card.blue3}
                        scoreRedFinal={card.scoreRedFinal}
                        scoreBlueFinal={card.scoreBlueFinal}
                        redWins={card.redWins}
                        blueWins={card.blueWins}
                        countdown={getCountdown(card)}
                        field={card.field}
                        onSelect={() => {}}
                    />
                {/each}
            {/if}
        </div>

        {#if scrollbarVisible}
            <div
                class="pointer-events-none absolute right-[2px] w-[4px] select-none"
                style={`top: ${scrollbarInset}px; bottom: ${scrollbarInset}px;`}
            >
                <button
                    type="button"
                    tabindex="-1"
                    aria-label="Scroll schedule"
                    class="scrollbar-thumb pointer-events-auto absolute right-0 w-[4px] select-none appearance-none rounded-full border-0 p-0"
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
