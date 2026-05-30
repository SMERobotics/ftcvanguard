<script lang="ts">
    import type { Component } from "svelte";

    import ForgotPasswordView from "./auth/ForgotPasswordView.svelte";
    import RegisterNumberView from "./auth/RegisterNumberView.svelte";
    import RegisterView from "./auth/RegisterView.svelte";
    import SignInEmailView from "./auth/SignInEmailView.svelte";
    import SignInView from "./auth/SignInView.svelte";

    const authViews = {
        signIn: SignInView,
        register: RegisterView,
        signInEmail: SignInEmailView,
        registerNumber: RegisterNumberView,
        forgotPassword: ForgotPasswordView,
    } satisfies Record<string, Component>;

    type AuthView = keyof typeof authViews;

    let activeAuthView = $state<AuthView>("signIn");
    const ActiveAuthView = $derived(authViews[activeAuthView]);

    function showRegister() {
        activeAuthView = "register";
    }

    function showRegisterNumber() {
        activeAuthView = "registerNumber";
    }

    function showSignInEmail() {
        activeAuthView = "signInEmail";
    }

    function showSignIn() {
        activeAuthView = "signIn";
    }
</script>

{#if activeAuthView === "signIn"}
    <SignInView onRegister={showRegister} onSignInEmail={showSignInEmail} />
{:else if activeAuthView === "register"}
    <RegisterView onRegisterNumber={showRegisterNumber} onSignIn={showSignIn} />
{:else if activeAuthView === "signInEmail"}
    <SignInEmailView onSignInTeam={showSignIn} />
{:else if activeAuthView === "registerNumber"}
    <RegisterNumberView onRegisterPersonal={showRegister} />
{:else}
    <ActiveAuthView />
{/if}
