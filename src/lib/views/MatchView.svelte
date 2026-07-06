<script lang="ts">
    import { currentMatch } from "../states/match-state.svelte";
</script>

<div class="flex h-full select-none flex-col items-center justify-center gap-2">
    <div>
        <h1 class="text-(--text-primary) font-sans text-4xl">{currentMatch.state}</h1>
    </div>
</div>
