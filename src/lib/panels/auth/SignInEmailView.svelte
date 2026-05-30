<script lang="ts">
    let { onSignInTeam = () => {} }: { onSignInTeam?: () => void } = $props();
</script>

<!-- TODO: redesign login ui along the lines of :sparkles: invidualism :sparkles: iykwim -->

<div class="flex h-full flex-col items-center justify-center px-[24px]">
    <div class="flex w-full max-w-[360px] flex-col">
        <!-- header -->
        <h1
            class="mb-[24px] text-(--text-primary) font-serif text-3xl align-left"
        >
            <!-- emphasizes the method of sign in -->
            <!-- Sign in with email -->

            <!-- emphasizes the type of account, more necessary? -->
            <!-- we don't want a team account to accidentally try signing in here -->
            Sign in personally
        </h1>

        <!-- personal account sign in -->
        <div class="flex w-full flex-col items-center gap-4">
            <div class="flex w-full flex-col gap-1">
                <label
                    for="personal-email"
                    class="text-(--text-primary) font-serif text-sm"
                    >Personal email</label
                >
                <input
                    id="personal-email"
                    class="h-[40px] w-full px-[12px] bg-(--bg) text-(--text-primary) border border-(--border) rounded-[6px] focus:outline-none focus:ring-2 focus:ring-(--primary)"
                    type="email"
                    placeholder="you@example.com"
                    required
                />
            </div>
            <div class="flex w-full flex-col gap-1">
                <label
                    for="personal-password"
                    class="text-(--text-primary) font-serif text-sm"
                >
                    Password
                </label>
                <input
                    id="personal-password"
                    class="h-[40px] w-full px-[12px] bg-(--bg) text-(--text-primary) border border-(--border) rounded-[6px] focus:outline-none focus:ring-2 focus:ring-(--primary)"
                    type="password"
                    placeholder="••••••••••••••••"
                    required
                />
            </div>
            <button
                class="h-[40px] w-full bg-(--confirm) text-(--text-primary) font-serif text-sm border border-(--border) rounded-[6px] hover:bg-(--confirm-hover) active:bg-(--confirm-active) cursor-pointer transition-colors duration-80"
                type="submit"
            >
                Sign in
            </button>
        </div>

        <span class="text-(--text-primary) font-sans text-sm mt-6">
            Using SSO?
            <button
                class="cursor-pointer appearance-none border-0 bg-transparent p-0 font-sans text-sm text-(--text-accent) hover:underline"
                type="button"
                onclick={onSignInTeam}>Sign in differently</button
            >
        </span>
    </div>
</div>
