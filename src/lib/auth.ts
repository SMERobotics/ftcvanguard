import { get, post } from "./api";
import {
    SESSION_TOKEN_KEY,
    clearSessionToken,
    getSessionToken,
    setSessionToken,
} from "./auth-token";

export {
    SESSION_TOKEN_KEY,
    clearSessionToken,
    getSessionToken,
    setSessionToken,
};

export interface RootCredential {
    number: number;
    password: string;
}

export interface PersonalCredential {
    email: string;
    password: string;
}

export interface RootAccount {
    number: number;
    email: string;
    password: string;
}

export interface PersonalAccount {
    email: string;
    password: string;
    name: string;
}

export interface Token {
    token: string;
}

export interface RootAccountCreated {
    number: number;
    email: string;
}

export interface PersonalAccountCreated {
    uuid: string;
    email: string;
    name: string;
}

export interface RootAccountMe {
    type: "root";
    number: number;
    email: string;
}

export interface PersonalAccountMe {
    type: "personal";
    email: string;
    name: string;
}

export type CurrentAccount = RootAccountMe | PersonalAccountMe;

export async function loginRoot(credentials: RootCredential): Promise<Token> {
    const response = await post<Token, RootCredential>(
        "/auth/root/login",
        credentials,
        { auth: false },
    );

    setSessionToken(response.token);
    return response;
}

export async function loginPersonal(
    credentials: PersonalCredential,
): Promise<Token> {
    const response = await post<Token, PersonalCredential>(
        "/auth/personal/login",
        credentials,
        { auth: false },
    );

    setSessionToken(response.token);
    return response;
}

export function registerRoot(
    account: RootAccount,
): Promise<RootAccountCreated> {
    return post<RootAccountCreated, RootAccount>(
        "/auth/root/register",
        account,
        { auth: false },
    );
}

export function registerPersonal(
    account: PersonalAccount,
): Promise<PersonalAccountCreated> {
    return post<PersonalAccountCreated, PersonalAccount>(
        "/auth/personal/register",
        account,
        { auth: false },
    );
}

export function me(): Promise<CurrentAccount> {
    return get<CurrentAccount>("/auth/me");
}

export function logout(): void {
    clearSessionToken();
}

export const token = {
    key: SESSION_TOKEN_KEY,
    get: getSessionToken,
    set: setSessionToken,
    clear: clearSessionToken,
} as const;

export const auth = {
    loginRoot,
    loginPersonal,
    registerRoot,
    registerPersonal,
    me,
    logout,
    token,
} as const;

export default auth;
