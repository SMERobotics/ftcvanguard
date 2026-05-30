<script lang="ts">
    type Props = {
        label: string;
        class?: string;
    };

    let { label, class: className = "" }: Props = $props();
</script>

<div class={`flex w-full items-center gap-2 py-5 ${className}`}>
    <div class="h-px flex-1 bg-(--separate)"></div>
    <span class="font-sans text-sm text-(--text-primary)">{label}</span>
    <div class="h-px flex-1 bg-(--separate)"></div>
</div>
