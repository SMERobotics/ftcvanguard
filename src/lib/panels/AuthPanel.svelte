<script lang="ts">
    import axios from "axios";
    import { onMount, type Component } from "svelte";

    import auth, {
        type PersonalAccount,
        type PersonalCredential,
        type RootAccount,
        type RootCredential,
    } from "../auth";
    import AccountView from "./auth/AccountView.svelte";
    import ForgotPasswordView from "./auth/ForgotPasswordView.svelte";
    import RegisterNumberView from "./auth/RegisterNumberView.svelte";
    import RegisterView from "./auth/RegisterView.svelte";
    import SignInEmailView from "./auth/SignInEmailView.svelte";
    import SignInView from "./auth/SignInView.svelte";

    const authViews = {
        account: AccountView,
        signIn: SignInView,
        register: RegisterView,
        signInEmail: SignInEmailView,
        registerNumber: RegisterNumberView,
        forgotPassword: ForgotPasswordView, // TODO: implement forgot password flow and view
    } satisfies Record<string, Component>;

    type AuthView = keyof typeof authViews;

    let activeAuthView = $state<AuthView>("signIn");
    let pending = $state(false);
    let error = $state<string | null>(null);
    const ActiveAuthView = $derived(authViews[activeAuthView]);

    function getDetailMessage(detail: unknown): string | null {
        if (typeof detail === "string") {
            return detail;
        }

        if (Array.isArray(detail)) {
            const messages = detail
                .map((item) => {
                    if (
                        typeof item === "object" &&
                        item !== null &&
                        "msg" in item
                    ) {
                        const message = (item as { msg?: unknown }).msg;
                        return typeof message === "string" ? message : null;
                    }

                    return null;
                })
                .filter((message): message is string => message !== null);

            return messages.length > 0 ? messages.join(" ") : null;
        }

        return null;
    }

    function getAuthErrorMessage(cause: unknown): string {
        if (axios.isAxiosError<{ detail?: unknown }>(cause)) {
            const detail = getDetailMessage(cause.response?.data?.detail);
            if (detail) {
                return detail;
            }
        }

        return "Unable to complete authentication. Please try again later.";
    }

    function showView(view: AuthView) {
        error = null;
        activeAuthView = view;
    }

    function showRegister() {
        showView("register");
    }

    function showRegisterNumber() {
        showView("registerNumber");
    }

    function showSignInEmail() {
        showView("signInEmail");
    }

    function showSignIn() {
        showView("signIn");
    }

    function showCurrentAccount() {
        showView("account");
    }

    async function runAuth(action: () => Promise<void>) {
        if (pending) {
            return;
        }

        pending = true;
        error = null;

        try {
            await action();
        } catch (cause) {
            error = getAuthErrorMessage(cause);
        } finally {
            pending = false;
        }
    }

    function handleRootLogin(credentials: RootCredential) {
        void runAuth(async () => {
            await auth.loginRoot(credentials);
            showCurrentAccount();
        });
    }

    function handlePersonalLogin(credentials: PersonalCredential) {
        void runAuth(async () => {
            await auth.loginPersonal(credentials);
            showCurrentAccount();
        });
    }

    function handleRootRegister(account: RootAccount) {
        void runAuth(async () => {
            await auth.registerRoot(account);
            await auth.loginRoot({
                number: account.number,
                password: account.password,
            });
            showCurrentAccount();
        });
    }

    function handlePersonalRegister(account: PersonalAccount) {
        void runAuth(async () => {
            await auth.registerPersonal(account);
            await auth.loginPersonal({
                email: account.email,
                password: account.password,
            });
            showCurrentAccount();
        });
    }

    async function restoreSession() {
        pending = true;
        error = null;

        try {
            showCurrentAccount();
        } catch {
            auth.logout();
            activeAuthView = "signIn";
        } finally {
            pending = false;
        }
    }

    onMount(() => {
        if (auth.token.get()) {
            void restoreSession();
        }
    });
</script>

{#if activeAuthView === "signIn"}
    <SignInView
        onRegister={showRegister}
        onSignInEmail={showSignInEmail}
        onSubmit={handleRootLogin}
        {pending}
        {error}
    />
{:else if activeAuthView === "register"}
    <RegisterView
        onRegisterNumber={showRegisterNumber}
        onSignIn={showSignIn}
        onSubmit={handlePersonalRegister}
        {pending}
        {error}
    />
{:else if activeAuthView === "signInEmail"}
    <SignInEmailView
        onSignInTeam={showSignIn}
        onSubmit={handlePersonalLogin}
        {pending}
        {error}
    />
{:else if activeAuthView === "registerNumber"}
    <RegisterNumberView
        onRegisterPersonal={showRegister}
        onSubmit={handleRootRegister}
        {pending}
        {error}
    />
{:else if activeAuthView === "account"}
    <AccountView onSignOut={showSignIn} />
{:else}
    <ActiveAuthView />
{/if}
