<script lang="ts">
    import { getContext, type Component } from "svelte";
    import type { HTMLButtonAttributes } from "svelte/elements";
    import {
        panelContextKey,
        type PanelContext,
        type PanelId,
    } from "../panel-context";

    type Props = HTMLButtonAttributes & {
        icon: Component;
        label?: string;
        shortcut?: string;
        active?: boolean;
        panel?: PanelId;
    };

    type ButtonClickEvent = MouseEvent & {
        currentTarget: EventTarget & HTMLButtonElement;
    };

    const panelContext = getContext<PanelContext | undefined>(panelContextKey);

    let {
        icon: Icon,
        label,
        shortcut,
        active = false,
        panel,
        type = "button",
        onclick,
        "aria-pressed": ariaPressed,
        class: className = "",
        ...rest
    }: Props = $props();

    const isActive = $derived(
        panel ? panelContext?.isActive(panel) === true : active,
    );

    function handleClick(event: ButtonClickEvent) {
        onclick?.(event);

        if (!event.defaultPrevented && panel) {
            panelContext?.toggle(panel);
        }
    }
</script>

<div class="group relative h-[30px] w-[30px]">
    <button
        {...rest}
        {type}
        aria-label={label}
        aria-pressed={panel ? isActive : ariaPressed}
        onclick={handleClick}
        class={`flex h-[30px] w-[30px] items-center justify-center rounded-[6px] p-0 ${isActive ? "bg-(--primary) text-(--active)" : "bg-transparent text-(--inactive) hover:bg-(--border) hover:text-(--active)"} ${className}`}
    >
        <Icon size={20} aria-hidden="true" />
    </button>

    {#if label}
        <div
            class="pointer-events-none absolute left-full top-1/2 z-10 ml-[7px] flex h-[36px] -translate-y-1/2 items-center gap-[8px] whitespace-nowrap rounded-[4px] border border-(--border) bg-(--bg) px-[12px] font-sans font-medium text-sm text-(--text-primary) opacity-0 group-hover:opacity-100"
        >
            <span>{label}</span>
            {#if shortcut}
                <span class="text-(--text-secondary)">{shortcut}</span>
            {/if}
        </div>
    {/if}
</div>
