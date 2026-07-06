<script lang="ts">
    import type { HTMLInputAttributes } from "svelte/elements";

    type Props = Omit<HTMLInputAttributes, "value"> & {
        value?: string;
    };

    let {
        value = $bindable(""),
        type = "text",
        inputmode = "numeric",
        pattern = "[0-9]*",
        class: className = "",
        ...rest
    }: Props = $props();
</script>

<input
    {...rest}
    {type}
    {inputmode}
    {pattern}
    bind:value
    class={`h-[30px] min-w-0 flex-1 rounded-[6px] border border-(--border) bg-(--bg) px-[10px] text-sm text-(--text-primary) placeholder:text-(--text-secondary) focus:outline-none focus:ring-2 focus:ring-(--primary) ${className}`}
/>
