<script lang="ts">
    import { onMount } from "svelte";

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
    let now = $state(Date.now());

    const timeFormatter = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
    });

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

    //

    async function loadSchedule(eventCode: string) {
        const response = await get<ScheduleResponse | ScheduleMatch[]>(
            `/schedule/get?event=${eventCode}`,
        );

        matches = Array.isArray(response) ? response : (response.schedule ?? []);
    }

    let cards = $derived(matches.map(toScheduleCard));

    $effect(() => {
        if (currentEvent.state) {
            void loadSchedule(currentEvent.state);
        }
    });

    onMount(() => {
        const interval = window.setInterval(() => {
            now = Date.now();
        }, 1000);

        return () => window.clearInterval(interval);
    });
</script>

<div class="flex-col">
    <div class="h-10 border-b border-(--border)"></div>
    <div class="grid grid-cols-[repeat(auto-fit,minmax(282px,1fr))] gap-[8px] p-[8px]">
        {#each cards as card, index (card.id)}
            {#if isPlayoffStart(card, index)}
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
</div>
