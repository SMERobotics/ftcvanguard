<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLButtonAttributes } from "svelte/elements";

    type Props = HTMLButtonAttributes & {
        variant?: "primary" | "secondary";
        children?: Snippet;
    };

    let {
        variant = "secondary",
        children,
        type = "button",
        class: className = "",
        ...rest
    }: Props = $props();

    const variantClass = $derived(
        variant === "primary"
            ? "bg-(--confirm) hover:bg-(--confirm-hover) active:bg-(--confirm-active) disabled:hover:bg-(--confirm) disabled:active:bg-(--confirm)"
            : "bg-(--secondary) hover:bg-(--secondary-hover) active:bg-(--secondary-active) disabled:hover:bg-(--secondary) disabled:active:bg-(--secondary)",
    );
</script>

<button
    {...rest}
    {type}
    class={`flex items-center justify-center gap-2 h-[40px] w-full rounded-[6px] border border-(--border) font-serif text-sm text-(--text-primary) transition-colors duration-80 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${variantClass} ${className}`}
>
    {@render children?.()}
</button>
