<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLInputAttributes } from "svelte/elements";

    type Props = Omit<HTMLInputAttributes, "value"> & {
        id: string;
        label: string;
        labelAction?: Snippet;
        value?: string;
    };

    let {
        id,
        label,
        labelAction,
        value = $bindable(""),
        type = "text",
        class: className = "",
        ...rest
    }: Props = $props();
</script>

<div class="flex w-full flex-col gap-1">
    <label for={id} class="select-none font-serif text-sm text-(--text-primary)">
        {label}
        {@render labelAction?.()}
    </label>
    <input
        {...rest}
        {id}
        {type}
        bind:value
        class={`h-[40px] w-full rounded-[6px] border border-(--border) bg-(--bg) px-[12px] text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--primary) ${className}`}
    />
</div>
