<script lang="ts">
    import { onMount } from "svelte";

    import ScheduleCard from "../components/schedule/ScheduleCard.svelte";

    import { get } from "../api";

    async function loadSchedule() {
        const schedule = await get("/schedule/get?event=USMOKSKCWLT1");
        console.log(schedule);
    }

    onMount(() => {
        loadSchedule();
    });
</script>

<div class="grid grid-cols-[repeat(auto-fit,minmax(282px,1fr))] gap-[8px] p-[8px]">
    <ScheduleCard
        name="Qualification 1"
        time="6:07 PM"
        alliance="red"
        result="win"
        red1={26855}
        red2={26855}
        blue1={6547}
        blue2={6547}
        scoreRedFinal={25}
        scoreBlueFinal={15}
        redWins={true}
        blueWins={false}
        countdown="Concluded"
        field="1"
        onSelect={() => {}}
    />
    <ScheduleCard
        name="Qualification 2"
        time="6:17 PM"
        red1={26855}
        red2={26855}
        blue1={6547}
        blue2={6547}
        scoreRedFinal={20}
        scoreBlueFinal={20}
        redWins={false}
        blueWins={false}
        countdown="Concluded"
        field="1"
        onSelect={() => {}}
    />
    <ScheduleCard
        name="Qualification 3"
        time="6:27 PM"
        alliance="blue"
        result="tie"
        red1={26855}
        red2={26855}
        blue1={6547}
        blue2={6547}
        scoreRedFinal={18}
        scoreBlueFinal={18}
        redWins={false}
        blueWins={false}
        countdown="Concluded"
        field="1"
        onSelect={() => {}}
    />
    <ScheduleCard
        name="Qualification 4"
        time="6:37 PM"
        alliance="blue"
        result="tie"
        red1={26855}
        red2={26855}
        blue1={6547}
        blue2={6547}
        scoreRedFinal={22}
        scoreBlueFinal={22}
        redWins={false}
        blueWins={false}
        countdown="Concluded"
        field="1"
        onSelect={() => {}}
    />
    <ScheduleCard
        name="Qualification 5"
        time="6:47 PM"
        red1={26855}
        red2={26855}
        blue1={6547}
        blue2={6547}
        scoreRedFinal={30}
        scoreBlueFinal={10}
        redWins={true}
        blueWins={false}
        countdown="Concluded"
        field="1"
        onSelect={() => {}}
    />
    <ScheduleCard
        name="Qualification 6"
        time="6:57 PM"
        alliance="red"
        result="loss"
        red1={26855}
        red2={26855}
        blue1={6547}
        blue2={6547}
        scoreRedFinal={12}
        scoreBlueFinal={20}
        redWins={false}
        blueWins={true}
        countdown="Concluded"
        field="1"
        onSelect={() => {}}
    />
</div>
