<script lang="ts">
    import { setContext, type Component } from "svelte";

    import {
        Bell,
        Home,
        Search,
        Settings,
        Star,
        User,
        LogIn,
        Ellipsis,
        ClipboardClock,
        ChartColumnStacked,
        NotebookPen,
        Brain,
        Microscope,
        Telescope,
    } from "@lucide/svelte";
    import logo from "./assets/icons/logo.png";

    import IconButton from "./lib/components/IconButton.svelte";
    import IconDivider from "./lib/components/IconDivider.svelte";
    import IconStack from "./lib/components/IconStack.svelte";
    import MenuButton from "./lib/components/MenuButton.svelte";

    import AuthPanel from "./lib/panels/AuthPanel.svelte";
    import { panelContextKey, type PanelContext } from "./lib/panel-context";

    import DefaultView from "./lib/views/DefaultView.svelte";

    // TODO: refactor panel management (state, resizing)

    const panelViews = {
        auth: AuthPanel,
    } satisfies Record<string, Component>;

    type PanelView = keyof typeof panelViews;
    const panelEntries = Object.entries(panelViews) as [PanelView, Component][];

    let activePanel = $state<PanelView | null>(null);
    let panelWidth = $state(670);
    let panelResizing = $state(false);
    const panelOpen = $derived(activePanel !== null);
    const panelColumn = $derived(panelOpen ? panelWidth : 0);
    const panelResizerVisible = $derived(panelOpen || panelResizing);
    const panelResizerColumn = $derived(panelResizerVisible ? 2 : 0);

    const minPanelWidth = 300;
    const collapsePanelWidth = 150;
    const maxPanelWidth = 939;

    function togglePanel(view: PanelView) {
        activePanel = activePanel === view ? null : view;
    }

    function isPanelView(view: string): view is PanelView {
        return view in panelViews;
    }

    const panelContext: PanelContext = {
        isActive: (view) => activePanel === view,
        toggle: (view) => {
            if (isPanelView(view)) {
                togglePanel(view);
            }
        },
    };

    setContext(panelContextKey, panelContext);

    function startPanelResize(event: PointerEvent) {
        event.preventDefault();

        const startX = event.clientX;
        const startWidth = panelWidth;
        const panelBeforeResize = activePanel;
        const previousCursor = document.body.style.cursor;
        const previousUserSelect = document.body.style.userSelect;

        panelResizing = true;
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        function updateResize(moveEvent: PointerEvent) {
            const requestedWidth = startWidth + moveEvent.clientX - startX;

            if (requestedWidth < collapsePanelWidth) {
                activePanel = null;
                return;
            }

            activePanel = panelBeforeResize;
            panelWidth = Math.min(
                maxPanelWidth,
                Math.max(minPanelWidth, requestedWidth),
            );
        }

        function stopResize() {
            panelResizing = false;
            document.body.style.cursor = previousCursor;
            document.body.style.userSelect = previousUserSelect;
            window.removeEventListener("pointermove", updateResize);
            window.removeEventListener("pointerup", stopResize);
            window.removeEventListener("pointercancel", stopResize);
        }

        window.addEventListener("pointermove", updateResize);
        window.addEventListener("pointerup", stopResize);
        window.addEventListener("pointercancel", stopResize);
    }
</script>

<div class="grid min-h-screen grid-rows-[42px_1fr_32px] bg-(--bg)">
    <!-- header 42px tall -->
    <header class="flex">
        <!-- logo icon -->
        <div
            class="h-full w-[42px] flex items-center justify-center"
        >
            <img src={logo} alt="Avantium" class="h-[24px] w-[24px]" />
        </div>

        <!-- menu bar -->
        <!-- TODO: complete full menu bar behavior later -->
        <div class="h-full flex pt-[5px] pb-[7px] pl-[2px]">
            <MenuButton label="File" />
            <MenuButton label="Edit" />
            <MenuButton label="View" />
            <MenuButton label="Help" />
        </div>
    </header>

    <div
        class="grid grid-cols-[40px_var(--panel-width)_var(--panel-resizer-width)_1fr]"
        style={`--panel-width: ${panelColumn}px; --panel-resizer-width: ${panelResizerColumn}px;`}
    >
        <!-- sidebar 40px wide -->
        <aside class="flex flex-col justify-between">
            <!-- top buttons -->
            <IconStack>
                <IconButton icon={Home} label="Project" shortcut="Alt+1" />
                <IconButton icon={Search} label="Search" />
                <IconButton icon={Star} label="Starred" />
                <IconButton icon={Bell} label="Activity" />
                <IconDivider />
                <IconButton icon={ClipboardClock} label="Schedule" />
                <IconButton icon={ChartColumnStacked} label="Rankings" />
                <IconButton icon={NotebookPen} label="Scouting" />
                <IconButton icon={Telescope} label="Insights" />
                <IconButton icon={Microscope} label="Analysis" />
                <IconButton icon={Brain} label="Predictions" />
                <IconButton icon={Ellipsis} label="More" />
            </IconStack>

            <!-- bottom buttons -->
            <IconStack>
                <IconButton icon={User} label="User" />
                <IconButton icon={Settings} label="Settings" />
                <IconButton icon={LogIn} label="Sign In" panel="auth" />
            </IconStack>
        </aside>

        <!-- panel -->
        <section
            class="overflow-hidden bg-(--fg) rounded-[14px] border border-(--border)"
            class:border-0={!panelOpen}
        >
            {#each panelEntries as [view, Panel]}
                <div class="h-full" hidden={activePanel !== view}>
                    <Panel />
                </div>
            {/each}
        </section>

        <!-- resizer handle -->
        <div
            role="separator"
            aria-orientation="vertical"
            aria-valuemin={minPanelWidth}
            aria-valuemax={maxPanelWidth}
            aria-valuenow={panelWidth}
            aria-hidden={!panelResizerVisible}
            class={`${panelResizerVisible ? "cursor-col-resize" : "pointer-events-none"} ${panelOpen ? "my-[12px]" : ""} transition-colors delay-0 duration-150 ${panelResizing ? "bg-(--primary)" : "bg-transparent hover:delay-[350ms] hover:bg-(--primary)"} w-[2px]`}
            onpointerdown={startPanelResize}
        ></div>

        <!-- main view -->
        <!-- NOTE: `border-r-0` because no right panel currently exists, remove when one is added -->
        <main
            class="bg-(--fg) rounded-l-[14px] border border-(--border) border-r-0"
        >
            <DefaultView />
        </main>
    </div>

    <!-- footer 32px tall -->
    <footer></footer>
</div>
