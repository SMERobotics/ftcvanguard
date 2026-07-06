<script lang="ts">
    import { onMount } from "svelte";

    import auth, { type CurrentAccount } from "../../auth";
    import { get } from "../../api";

    let {
        onSignOut = () => {},
    }: {
        onSignOut?: () => void;
    } = $props();

    let account = $state<CurrentAccount | null>(null);
    let pending_refresh = $state(false);
    let pending_signout = $state(false);
    let error = $state<string | null>(null);

    async function loadAccount() {
        pending_refresh = true;
        error = null;

        try {
            account = await get<CurrentAccount>("/auth/me");
        } catch {
            error = "Unable to load account.";
        } finally {
            pending_refresh = false;
        }
    }

    async function signOut() {
        pending_signout = true;
        error = null;

        try {
            await auth.logout();
            account = null;
            onSignOut();
        } catch {
            error = "Unable to sign out.";
        } finally {
            pending_signout = false;
        }
    }

    onMount(() => {
        void loadAccount();
    });
</script>

<div class="flex h-full flex-col gap-3 p-6 text-(--text-primary)">
    <h1 class="select-none font-serif text-2xl">Account</h1>

    {#if pending_refresh && account === null}
        <p class="select-none font-sans text-sm">Loading account...</p>
    {/if}

    {#if error}
        <p class="font-sans text-sm text-(--text-error)">{error}</p>
    {/if}

    {#if account}
        <dl class="font-sans text-sm">
            <dt class="select-none">Type</dt>
            <dd>{account.type}</dd>

            {#if account.type === "root"}
                <dt class="select-none">Team number</dt>
                <dd>{account.number}</dd>
            {:else}
                <dt class="select-none">Name</dt>
                <dd>{account.name}</dd>
            {/if}

            <dt class="select-none">Email</dt>
            <dd>{account.email}</dd>
        </dl>
    {/if}

    <button
        class="w-fit select-none rounded-[6px] border border-(--border) px-3 py-2 font-sans text-sm"
        type="button"
        disabled={pending_refresh}
        onclick={() => void loadAccount()}
    >
        {pending_refresh ? "Refreshing" : "Refresh"}
    </button>

    <button
        class="w-fit select-none rounded-[6px] border border-(--border) px-3 py-2 font-sans text-sm"
        type="button"
        disabled={pending_signout}
        onclick={() => void signOut()}
    >
        {pending_signout ? "Signing out" : "Sign out"}
    </button>
</div>
