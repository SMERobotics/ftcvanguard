<script lang="ts">
    type Props = {
        prompt: string;
        actionLabel: string;
        onclick?: () => void;
        disabled?: boolean;
        class?: string;
    };

    let {
        prompt,
        actionLabel,
        onclick,
        disabled = false,
        class: className = "",
    }: Props = $props();
</script>

<span
    class={`mt-6 select-none font-sans text-sm text-(--text-primary) ${className}`}
>
    {prompt}
    <button
        class="select-none cursor-pointer appearance-none border-0 bg-transparent p-0 font-sans text-sm text-(--text-accent) hover:underline disabled:cursor-not-allowed disabled:opacity-60"
        type="button"
        {onclick}
        {disabled}
    >
        {actionLabel}
    </button>
</span>
