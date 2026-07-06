<script lang="ts">
    import {
        type MatchResult,
        type Alliance,
    } from "../../types/match.types";

    interface Props {
        name: string;
        time: string;
        alliance?: Alliance;
        result?: MatchResult;
        red1: number;
        red2: number;
        blue1: number;
        blue2: number;
        scoreRedFinal: number;
        scoreBlueFinal: number;
        redWins: boolean;
        blueWins: boolean;
        countdown: string;
        field: string;
        onSelect: () => void;
    }

    let { name, time, alliance = null, result = null, red1, red2, blue1, blue2, scoreRedFinal, scoreBlueFinal, redWins, blueWins, countdown, field, onSelect }: Props = $props();
</script>

<button class="w-full min-w-[282px] select-none text-(--inactive) hover:text-(--active) flex-col {alliance === 'red' ? 'bg-[#230505] hover:bg-[#310606]' : ''} {alliance === 'blue' ? 'bg-[#0c132a] hover:bg-[#111c3f]' : ''} {alliance !== 'red' && alliance !== 'blue' ? 'hover:bg-(--immediate)' : ''} rounded-md pt-1.25 pb-1 px-2 font-mono" onclick={onSelect}>
    <div class="flex items-center">
        <span class="text-[14px] font-semibold text-left">{name}</span>
        <span class="min-w-[58px] ml-auto text-[12px] text-(--detail)">{time}</span>
    </div>
    <div class="flex items-center">
        <span class="text-[13px]">
            <span class="text-red-400 {redWins ? 'font-bold underline' : ''}">{red1}</span>,
            <span class="text-red-400 {redWins ? 'font-bold underline' : ''}">{red2}</span>
            vs.
            <span class="text-blue-400 {blueWins ? 'font-bold underline' : ''}">{blue1}</span>,
            <span class="text-blue-400 {blueWins ? 'font-bold underline' : ''}">{blue2}</span>
        </span>
    </div>
    <div class="flex items-center">
        <span class="text-[12px] text-(--detail)">
            <span>{countdown}</span>
            •
            <span>Field {field}</span>
        </span>
        <div class="ml-auto">
            <span class="text-[12px]">
                <span class="text-red-400 {redWins ? 'font-bold underline' : ''}">{scoreRedFinal}</span>
                -
                <span class="text-blue-400 {blueWins ? 'font-bold underline' : ''}">{scoreBlueFinal}</span>
            </span>
            <span class="text-[11px] border rounded-xl px-[10px] {result === "win" ? "text-emerald-400 border-emerald-400" : ""}{result === "tie" ? "text-amber-400 border-amber-400" : ""}{result === "loss" ? "text-red-400 border-red-400" : ""}">{result === "win" ? "W" : ""}{result === "tie" ? "T" : ""}{result === "loss" ? "L" : ""}{result !== "win" && result !== "tie" && result !== "loss" ? "-" : ""}</span>    
        </div>
    </div>
</button>
