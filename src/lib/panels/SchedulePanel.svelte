<script lang="ts">
    import { onMount } from "svelte";

    import { get } from "../api";

    async function loadSchedule() {
        const schedule = await get("/schedule/get?event=USMOKSKCWLT1");
        console.log(schedule);
    }

    onMount(() => {
        loadSchedule();
    });
</script>

<div>
    <span>hello schedule world</span>
</div>