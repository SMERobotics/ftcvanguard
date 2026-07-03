<script lang="ts">
    import type { Snippet } from "svelte";
    import AuthButton from "./AuthButton.svelte";

    type Props = {
        children?: Snippet;
        error?: string | null;
        pending?: boolean;
        pendingLabel?: string;
        submitActive?: boolean;
        submitLabel: string;
        onsubmit?: (event: SubmitEvent) => void;
        class?: string;
    };

    let {
        children,
        error = null,
        pending = false,
        pendingLabel,
        submitActive = true,
        submitLabel,
        onsubmit,
        class: className = "",
    }: Props = $props();
</script>

<form class={`flex w-full flex-col items-center gap-4 ${className}`} {onsubmit}>
    {@render children?.()}

    {#if error}
        <p
            class="w-full font-sans text-sm text-(--text-error)"
            aria-live="polite"
        >
            {error}
        </p>
    {/if}

    <AuthButton
        variant={submitActive ? "primary" : "secondary"}
        type="submit"
        disabled={pending}
    >
        {pending ? (pendingLabel ?? submitLabel) : submitLabel}
    </AuthButton>
</form>
