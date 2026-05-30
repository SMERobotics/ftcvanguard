import { writable } from "svelte/store";

export const SESSION_TOKEN_KEY = "auth.session.token";
export const sessionToken = writable<string | null>(getSessionToken());

if (typeof window !== "undefined") {
    window.addEventListener("storage", (event) => {
        if (event.key === SESSION_TOKEN_KEY) {
            sessionToken.set(event.newValue);
        }
    });
}

function getLocalStorage(): Storage | null {
    try {
        return globalThis.localStorage ?? null;
    } catch {
        return null;
    }
}

export function getSessionToken(): string | null {
    return getLocalStorage()?.getItem(SESSION_TOKEN_KEY) ?? null;
}

export function setSessionToken(token: string): void {
    getLocalStorage()?.setItem(SESSION_TOKEN_KEY, token);
    sessionToken.set(token);
}

export function clearSessionToken(): void {
    getLocalStorage()?.removeItem(SESSION_TOKEN_KEY);
    sessionToken.set(null);
}
