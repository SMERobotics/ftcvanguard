<script lang="ts">
    import type { RootAccount } from "../../auth";
    import {
        AuthForm,
        AuthInlineAction,
        AuthLayout,
        AuthTextField,
        TeamNumberField,
    } from "../../components/auth";

    type SubmitHandler = (account: RootAccount) => void | Promise<void>;

    let {
        onRegisterPersonal = () => {},
        onSubmit = () => {},
        pending = false,
        error = null,
    }: {
        onRegisterPersonal?: () => void;
        onSubmit?: SubmitHandler;
        pending?: boolean;
        error?: string | null;
    } = $props();

    let teamNumber = $state("");
    let email = $state("");
    let password = $state("");

    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();

        if (teamNumber === "") {
            return;
        }

        void onSubmit({
            number: Number(teamNumber),
            email,
            password,
        });
    }
</script>

<AuthLayout title="Register as a team">
    <AuthForm
        onsubmit={handleSubmit}
        submitLabel="Continue"
        pendingLabel="Creating account"
        {pending}
        {error}
    >
        <TeamNumberField bind:value={teamNumber} disabled={pending} />
        <AuthTextField
            id="team-email"
            label="Team email"
            type="email"
            placeholder="team@example.com"
            required
            disabled={pending}
            bind:value={email}
        />
        <AuthTextField
            id="team-password"
            label="Password"
            type="password"
            placeholder="••••••••••••••••"
            required
            disabled={pending}
            bind:value={password}
        />
    </AuthForm>

    <AuthInlineAction
        prompt="Not a team captain?"
        actionLabel="Register personally"
        onclick={onRegisterPersonal}
        disabled={pending}
    />
</AuthLayout>
