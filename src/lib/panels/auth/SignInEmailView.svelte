<script lang="ts">
    import type { PersonalCredential } from "../../auth";
    import {
        AuthForm,
        AuthInlineAction,
        AuthLayout,
        AuthTextField,
    } from "../../components/auth";

    type SubmitHandler = (
        credentials: PersonalCredential,
    ) => void | Promise<void>;

    let {
        onSignInTeam = () => {},
        onSubmit = () => {},
        pending = false,
        error = null,
    }: {
        onSignInTeam?: () => void;
        onSubmit?: SubmitHandler;
        pending?: boolean;
        error?: string | null;
    } = $props();

    let email = $state("");
    let password = $state("");

    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        void onSubmit({ email, password });
    }
</script>

<AuthLayout title="Sign in personally">
    <AuthForm
        onsubmit={handleSubmit}
        submitLabel="Sign in"
        pendingLabel="Signing in"
        {pending}
        {error}
    >
        <AuthTextField
            id="personal-email"
            label="Personal email"
            type="email"
            placeholder="you@example.com"
            required
            disabled={pending}
            bind:value={email}
        />
        <AuthTextField
            id="personal-password"
            label="Password"
            type="password"
            placeholder="••••••••••••••••"
            required
            disabled={pending}
            bind:value={password}
        />
    </AuthForm>

    <AuthInlineAction
        prompt="Using SSO?"
        actionLabel="Sign in differently"
        onclick={onSignInTeam}
        disabled={pending}
    />
</AuthLayout>
