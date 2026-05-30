<script lang="ts">
    let { onRegisterPersonal = () => {} }: { onRegisterPersonal?: () => void } =
        $props();

    // pre-event hook to prevent non-digit input
    function checkDigits(event: InputEvent) {
        if (event.data && /\D/.test(event.data)) {
            event.preventDefault();
        }
    }

    // post-event hook to sanitize instant input
    function sanitizeDigits(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        input.value = input.value.replace(/\D/g, "");
    }
</script>

<!-- TODO: redesign login ui along the lines of :sparkles: invidualism :sparkles: iykwim -->

<div class="flex h-full flex-col items-center justify-center px-[24px]">
    <div class="flex w-full max-w-[360px] flex-col">
        <!-- header -->
        <h1
            class="mb-[24px] text-(--text-primary) font-serif text-3xl align-left"
        >
            Register as a team
        </h1>

        <!-- root team account sign in -->
        <div class="flex w-full flex-col items-center gap-4">
            <div class="flex w-full flex-col gap-1">
                <label
                    for="team-number"
                    class="text-(--text-primary) font-serif text-sm"
                    >FTC team number</label
                >
                <input
                    id="team-number"
                    class="h-[40px] w-full px-[12px] bg-(--bg) text-(--text-primary) placeholder:text-(--text-secondary) border border-(--border) rounded-[6px] focus:outline-none focus:ring-2 focus:ring-(--primary)"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    required
                    onbeforeinput={checkDigits}
                    oninput={sanitizeDigits}
                />
            </div>
            <div class="flex w-full flex-col gap-1">
                <label
                    for="team-password"
                    class="text-(--text-primary) font-serif text-sm"
                >
                    Password
                </label>
                <input
                    id="team-password"
                    class="h-[40px] w-full px-[12px] bg-(--bg) text-(--text-primary) placeholder:text-(--text-secondary) border border-(--border) rounded-[6px] focus:outline-none focus:ring-2 focus:ring-(--primary)"
                    type="password"
                    required
                />
            </div>
            <button
                class="h-[40px] w-full bg-(--confirm) text-(--text-primary) font-serif text-sm border border-(--border) rounded-[6px] hover:bg-(--confirm-hover) active:bg-(--confirm-active) cursor-pointer transition-colors duration-80"
                type="submit"
            >
                Continue
            </button>
        </div>

        <span class="text-(--text-primary) font-sans text-sm mt-6">
            Not a team captain?
            <button
                class="cursor-pointer appearance-none border-0 bg-transparent p-0 font-sans text-sm text-(--text-accent) hover:underline"
                type="button"
                onclick={onRegisterPersonal}>Register personally</button
            >
        </span>
    </div>
</div>
