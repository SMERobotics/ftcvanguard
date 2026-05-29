<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLButtonAttributes } from "svelte/elements";

    type Props = HTMLButtonAttributes & {
        label?: string;
        children?: Snippet;
    };

    let { label, children, type = "button", class: className = "", ...rest }: Props = $props();
</script>

<button {...rest} {type} class={`rounded-md bg-transparent py-[5px] pl-[8px] pr-[8px] font-sans text-sm text-(--inactive) hover:bg-(--border) hover:text-(--active) ${className}`}>
    {#if label}
        <u>{label[0]}</u>{label.slice(1)}
    {:else}
        {@render children?.()}
    {/if}
</button>
