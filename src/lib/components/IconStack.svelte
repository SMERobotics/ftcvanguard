<script lang="ts">
    import type { Snippet } from "svelte";
    import type { HTMLAttributes } from "svelte/elements";

    type Props = HTMLAttributes<HTMLDivElement> & {
        children?: Snippet;
    };

    let { children, class: className = "", ...rest }: Props = $props();
</script>

<div
    {...rest}
    class={`flex w-[40px] select-none flex-col items-center ${className}`}
>
    <div class="flex flex-col items-center gap-[10px] py-[5px]">
        {@render children?.()}
    </div>
</div>
