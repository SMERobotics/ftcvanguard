<script lang="ts">
    import { Card } from "@ftcvanguard/design"

    let {stripe}: {stripe: any} = $props();
</script>

<Card {stripe}>
    <div class="flex flex-col justify-between gap-2">
        <div class="flex flex-row justify-between align-middle">
            <p class="font-bold text-xl">Qualification 1</p>
            <p class="font-light text-l text-fg-subtle">9:23 PM</p>
        </div>
        <div class="flex flex-row justify-between">
            <p class="text-alliance-red">6547 & 26855</p>
            <p>vs</p>
            <p class="text-alliance-blue">21536 & 20181</p>
        </div>
    </div>
</Card>