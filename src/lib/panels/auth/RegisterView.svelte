<script lang="ts">
    import { Hash } from "@lucide/svelte";
    import type { PersonalAccount } from "../../auth";
    import {
        AuthButton,
        AuthButtonGroup,
        AuthForm,
        AuthInlineAction,
        AuthLayout,
        AuthSeparator,
        AuthTextField,
        SocialAuthButtons,
    } from "../../components/auth";

    type SubmitHandler = (account: PersonalAccount) => void | Promise<void>;

    let {
        onRegisterNumber = () => {},
        onSignIn = () => {},
        onSubmit = () => {},
        pending = false,
        error = null,
    }: {
        onRegisterNumber?: () => void;
        onSignIn?: () => void;
        onSubmit?: SubmitHandler;
        pending?: boolean;
        error?: string | null;
    } = $props();

    let name = $state("");
    let email = $state("");
    let password = $state("");

    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        void onSubmit({ name, email, password });
    }
</script>

<AuthLayout title="Register personally">
    <SocialAuthButtons {pending} />

    <AuthForm
        class="mt-4"
        onsubmit={handleSubmit}
        submitLabel="Register personally"
        pendingLabel="Creating account"
        {pending}
        {error}
    >
        <AuthTextField
            id="personal-name"
            label="Display name"
            type="text"
            placeholder="Preferred name or nickname"
            required
            disabled={pending}
            bind:value={name}
        />
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

    <AuthSeparator label="or, register as a team" />

    <AuthButtonGroup>
        <AuthButton onclick={onRegisterNumber} disabled={pending}>
            <Hash class="h-4 w-4 shrink-0" />
            Continue with team number
        </AuthButton>
    </AuthButtonGroup>

    <AuthInlineAction
        prompt="Already have an account?"
        actionLabel="Sign in"
        onclick={onSignIn}
        disabled={pending}
    />
</AuthLayout>
