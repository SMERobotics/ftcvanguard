<script lang="ts">
    import { Mail } from "@lucide/svelte";
    import githubLogo from "../../../assets/icons/sso_github.svg";

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
            class="mb-[24px] select-none text-(--text-primary) font-serif text-3xl align-left"
        >
            Sign in to Vanguard
        </h1>

        <!-- root team account sign in -->
        <div class="flex w-full flex-col items-center gap-4">
            <div class="flex w-full flex-col gap-1">
                <label
                    for="team-number"
                    class="select-none text-(--text-primary) font-serif text-sm"
                    >FTC team number</label
                >
                <input
                    id="team-number"
                    class="h-[40px] w-full px-[12px] bg-(--bg) text-(--text-primary) border border-(--border) rounded-[6px] focus:outline-none focus:ring-2 focus:ring-(--primary)"
                    type="text"
                    inputmode="numeric"
                    pattern="[0-9]*"
                    required
                    on:beforeinput={checkDigits}
                    on:input={sanitizeDigits}
                />
            </div>
            <div class="flex w-full flex-col gap-1">
                <label
                    for="team-password"
                    class="select-none text-(--text-primary) font-serif text-sm"
                >
                    Password
                    <span
                        class="float-right select-none text-(--text-accent) font-sans text-sm hover:underline"
                        >Forgot password?</span
                    >
                </label>
                <input
                    id="team-password"
                    class="h-[40px] w-full px-[12px] bg-(--bg) text-(--text-primary) border border-(--border) rounded-[6px] focus:outline-none focus:ring-2 focus:ring-(--primary)"
                    type="password"
                    required
                />
            </div>
            <button
                class="h-[40px] w-full select-none bg-(--confirm) text-(--text-primary) font-serif text-sm border border-(--border) rounded-[6px] hover:bg-(--confirm-hover) active:bg-(--confirm-active) cursor-pointer transition-colors duration-80"
                type="submit"
            >
                Sign in
            </button>
        </div>

        <!-- separator -->
        <div class="flex w-full select-none items-center gap-2 py-5">
            <div class="h-px flex-1 bg-(--separate)"></div>
            <span class="select-none font-sans text-sm text-(--text-primary)"
                >or, sign in personal</span
            >
            <div class="h-px flex-1 bg-(--separate)"></div>
        </div>

        <!-- alternate sign in options -->
        <div class="flex w-full flex-col items-center gap-2">
            <button
                class="flex h-[40px] w-full select-none items-center justify-center gap-2 bg-(--secondary) text-(--text-primary) font-serif text-sm border border-(--border) rounded-[6px] hover:bg-(--secondary-hover) active:bg-(--secondary-active) cursor-pointer transition-colors duration-80"
            >
                <Mail class="h-4 w-4 shrink-0" />
                Continue with email
            </button>

            <button
                class="flex h-[40px] w-full select-none items-center justify-center gap-2 bg-(--secondary) text-(--text-primary) font-serif text-sm border border-(--border) rounded-[6px] hover:bg-(--secondary-hover) active:bg-(--secondary-active) cursor-pointer transition-colors duration-80"
            >
                <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                >
                    <g clip-path="url(#clip0_643_9687)">
                        <path
                            d="M8.00018 3.16667C9.18018 3.16667 10.2368 3.57333 11.0702 4.36667L13.3535 2.08333C11.9668 0.793333 10.1568 0 8.00018 0C4.87352 0 2.17018 1.79333 0.853516 4.40667L3.51352 6.47C4.14352 4.57333 5.91352 3.16667 8.00018 3.16667Z"
                            fill="#EA4335"
                        ></path>
                        <path
                            d="M15.66 8.18335C15.66 7.66002 15.61 7.15335 15.5333 6.66669H8V9.67335H12.3133C12.12 10.66 11.56 11.5 10.72 12.0667L13.2967 14.0667C14.8 12.6734 15.66 10.6134 15.66 8.18335Z"
                            fill="#4285F4"
                        ></path>
                        <path
                            d="M3.51 9.53001C3.35 9.04668 3.25667 8.53334 3.25667 8.00001C3.25667 7.46668 3.34667 6.95334 3.51 6.47001L0.85 4.40668C0.306667 5.48668 0 6.70668 0 8.00001C0 9.29334 0.306667 10.5133 0.853333 11.5933L3.51 9.53001Z"
                            fill="#FBBC05"
                        ></path>
                        <path
                            d="M8.0001 16C10.1601 16 11.9768 15.29 13.2968 14.0633L10.7201 12.0633C10.0034 12.5467 9.0801 12.83 8.0001 12.83C5.91343 12.83 4.14343 11.4233 3.5101 9.52667L0.850098 11.59C2.1701 14.2067 4.87343 16 8.0001 16Z"
                            fill="#34A853"
                        ></path>
                    </g>
                    <defs>
                        <clipPath id="clip0_643_9687">
                            <rect width="16" height="16" fill="white"></rect>
                        </clipPath>
                    </defs>
                </svg>
                Continue with Google
            </button>

            <button
                class="flex h-[40px] w-full select-none items-center justify-center gap-2 bg-(--secondary) text-(--text-primary) font-serif text-sm border border-(--border) rounded-[6px] hover:bg-(--secondary-hover) active:bg-(--secondary-active) cursor-pointer transition-colors duration-80"
            >
                <img
                    class="h-4 w-4 shrink-0"
                    src={githubLogo}
                    alt=""
                    aria-hidden="true"
                />
                Continue with GitHub
            </button>

            <button
                class="flex h-[40px] w-full select-none items-center justify-center gap-2 bg-(--secondary) text-(--text-primary) font-serif text-sm border border-(--border) rounded-[6px] hover:bg-(--secondary-hover) active:bg-(--secondary-active) cursor-pointer transition-colors duration-80"
            >
                <svg
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    width="16"
                    height="16"
                >
                    <g clip-path="url(#clip0_3150_11451)">
                        <path
                            d="M8.08803 4.3535C8.74395 4.3535 9.56615 3.91006 10.0558 3.31881C10.4992 2.78299 10.8226 2.03469 10.8226 1.28639C10.8226 1.18477 10.8133 1.08314 10.7948 1C10.065 1.02771 9.18738 1.48963 8.6608 2.10859C8.24508 2.57975 7.86631 3.31881 7.86631 4.07635C7.86631 4.18721 7.88479 4.29807 7.89402 4.33502C7.94021 4.34426 8.01412 4.3535 8.08803 4.3535ZM5.77846 15.5318C6.67457 15.5318 7.07182 14.9313 8.18965 14.9313C9.32596 14.9313 9.57539 15.5133 10.5731 15.5133C11.5524 15.5133 12.2083 14.608 12.8273 13.7211C13.5201 12.7049 13.8065 11.7072 13.825 11.661C13.7603 11.6425 11.885 10.8757 11.885 8.7232C11.885 6.85707 13.3631 6.01639 13.4462 5.95172C12.467 4.5475 10.9796 4.51055 10.5731 4.51055C9.47377 4.51055 8.57766 5.1757 8.01412 5.1757C7.4044 5.1757 6.60066 4.5475 5.64912 4.5475C3.83842 4.5475 2 6.0441 2 8.87101C2 10.6263 2.68363 12.4832 3.52432 13.6842C4.2449 14.7004 4.87311 15.5318 5.77846 15.5318Z"
                            fill="currentColor"
                        ></path>
                    </g>
                    <defs>
                        <clipPath id="clip0_3150_11451">
                            <rect width="16" height="16"></rect>
                        </clipPath>
                    </defs>
                </svg>
                Continue with Apple
            </button>
        </div>

        <span class="mt-5 select-none text-(--text-primary) font-sans text-sm">
            New to Vanguard?
            <span class="select-none text-(--text-accent) font-sans text-sm hover:underline"
                >Create an account</span
            >
        </span>
    </div>
</div>
