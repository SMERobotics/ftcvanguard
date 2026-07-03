<script lang="ts">
    import { Mail } from "@lucide/svelte";
    import type { RootCredential } from "../../auth";
    import {
        AuthButton,
        AuthButtonGroup,
        AuthForm,
        AuthInlineAction,
        AuthLayout,
        AuthSeparator,
        AuthTextField,
        SocialAuthButtons,
        TeamNumberField,
    } from "../../components/auth";

    type SubmitHandler = (credentials: RootCredential) => void | Promise<void>;

    let {
        onRegister = () => {},
        onSignInEmail = () => {},
        onSubmit = () => {},
        pending = false,
        error = null,
    }: {
        onRegister?: () => void;
        onSignInEmail?: () => void;
        onSubmit?: SubmitHandler;
        pending?: boolean;
        error?: string | null;
    } = $props();

    let teamNumber = $state("");
    let password = $state("");

    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();

        if (teamNumber === "") {
            return;
        }

        void onSubmit({
            number: Number(teamNumber),
            password,
        });
    }
</script>

<AuthLayout title="Sign in to Vanguard">

    <AuthButtonGroup>
        <SocialAuthButtons {pending} />
        <AuthButton variant="primary" onclick={onSignInEmail} disabled={pending}>
            <Mail class="h-4 w-4 shrink-0" />
            Continue with email
        </AuthButton>
    </AuthButtonGroup>

    <AuthSeparator label="or, sign in as a team" />

    <AuthForm
        onsubmit={handleSubmit}
        submitLabel="Sign in"
        pendingLabel="Signing in"
        submitActive={teamNumber !== "" || password !== ""}
        {pending}
        {error}
    >
        <TeamNumberField bind:value={teamNumber} disabled={pending} />
        <AuthTextField
            id="team-password"
            label="Password"
            type="password"
            placeholder="••••••••••••••••"
            required
            disabled={pending}
            bind:value={password}
        >
            {#snippet labelAction()}
                <span
                    class="float-right font-sans text-sm text-(--text-accent) hover:underline"
                >
                    Forgot password?
                </span>
            {/snippet}
        </AuthTextField>
    </AuthForm>

    <AuthInlineAction
        prompt="New to Vanguard?"
        actionLabel="Create an account"
        onclick={onRegister}
        disabled={pending}
    />
</AuthLayout>
