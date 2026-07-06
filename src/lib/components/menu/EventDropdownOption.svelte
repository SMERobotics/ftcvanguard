<script lang="ts">
    interface Props {
        name: string;
        code: string;
        type: string;
        date: string;
        onSelect: () => void;
    }

    let { name, code, type, date, onSelect }: Props = $props();
</script>

<button
    type="button"
    role="menuitem"
    onclick={onSelect}
    class="w-full select-none flex-col rounded-[4px] bg-transparent py-[5px] font-sans text-sm text-(--inactive) hover:bg-(--menu-hover) hover:text-(--active)"
>
    <div class="flex h-[20px] items-center pl-[10px] pr-[8px]">
        <span>{name}</span>
        <span class="ml-auto text-(--detail)">{code}</span>
    </div>
    <div class="flex h-[20px] items-center pl-[10px] pr-[8px]">
        <span class="text-(--detail)">{type}</span>
        <span class="ml-auto text-(--detail)">{date}</span>
    </div>
</button>
