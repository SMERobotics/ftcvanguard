export const SESSION_TOKEN_KEY = "auth.session.token";

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
}

export function clearSessionToken(): void {
    getLocalStorage()?.removeItem(SESSION_TOKEN_KEY);
}
