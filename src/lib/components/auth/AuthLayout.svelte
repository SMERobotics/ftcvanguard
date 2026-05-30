<script lang="ts">
    import type { Snippet } from "svelte";

    type Props = {
        title: string;
        children?: Snippet;
    };

    let { title, children }: Props = $props();
</script>

<div class="flex h-full flex-col items-center justify-center px-[24px]">
    <div class="flex w-full max-w-[360px] flex-col">
        <h1
            class="mb-[24px] text-left font-serif text-3xl text-(--text-primary)"
        >
            {title}
        </h1>

        {@render children?.()}
    </div>
</div>
