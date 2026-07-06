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
        countdown: string;
        field: string;
        onSelect: () => void;
    }

    let { name, time, alliance = null, result = null, red1, red2, red3, blue1, blue2, blue3, scoreRedFinal, scoreBlueFinal, redWins, blueWins, countdown, field, onSelect }: Props = $props();
</script>

<button class="w-full min-w-[282px] select-none text-(--inactive) hover:text-(--active) flex-col border {alliance === 'red' ? 'bg-[#371a19] hover:bg-[#3e201f] border-[#3e201f]' : ''} {alliance === 'blue' ? 'bg-[#1B223a] hover:bg-[#202846] border-[#202846]' : ''} {alliance !== 'red' && alliance !== 'blue' ? 'hover:bg-(--immediate) border-(--immediate)' : ''} rounded-md pt-1.25 pb-1 px-2 font-mono" onclick={onSelect}>
    <div class="flex">
        <span class="text-[14px] font-semibold text-left">{name}</span>
        <span class="min-w-[64px] pl-[6px] mt-[2px] ml-auto text-[12px] text-(--detail) text-right">{time}</span>
    </div>
    <div class="flex items-center">
        <span class="text-[13px] text-left">
            <span class="text-red-400 {redWins ? 'font-bold underline' : ''}">{red1}</span>{red2 !== null ? "," : ""}
            <span class="text-red-400 {redWins ? 'font-bold underline' : ''}">{red2}</span>{red3 !== null ? "," : ""}
            <span class="text-red-400 {redWins ? 'font-bold underline' : ''}">{red3}</span>
            vs.
            <span class="text-blue-400 {blueWins ? 'font-bold underline' : ''}">{blue1}</span>{blue2 !== null ? "," : ""}
            <span class="text-blue-400 {blueWins ? 'font-bold underline' : ''}">{blue2}</span>{blue3 !== null ? "," : ""}
            <span class="text-blue-400 {blueWins ? 'font-bold underline' : ''}">{blue3}</span>
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
