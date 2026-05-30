import axios, {
    type AxiosRequestConfig,
    type AxiosResponse,
    type InternalAxiosRequestConfig,
} from "axios";
import { getSessionToken } from "./auth-token";

const BASE_URL = "/api/v2";

export type ApiRequestConfig<TBody = unknown> = Omit<
    AxiosRequestConfig<TBody>,
    "auth"
> & {
    auth?: false;
};

type ApiInternalRequestConfig<TBody = unknown> = Omit<
    InternalAxiosRequestConfig<TBody>,
    "auth"
> & {
    auth?: false;
};

export const apiClient = axios.create({
    baseURL: BASE_URL,
});

apiClient.interceptors.request.use((config) => {
    const apiConfig = config as ApiInternalRequestConfig;

    if (apiConfig.auth === false) {
        delete apiConfig.auth;
        return config;
    }

    const authToken = getSessionToken();
    if (authToken) {
        config.headers.Authorization = `Bearer ${authToken}`;
    }

    return config;
});

export async function request<TResponse = unknown, TBody = unknown>(
    config: ApiRequestConfig<TBody>,
): Promise<TResponse> {
    const response = await apiClient.request<
        TResponse,
        AxiosResponse<TResponse>,
        TBody
    >(config as AxiosRequestConfig<TBody>);

    return response.data;
}

export function get<TResponse = unknown>(
    url: string,
    config: ApiRequestConfig = {},
): Promise<TResponse> {
    return request<TResponse>({ ...config, method: "GET", url });
}

export function post<TResponse = unknown, TBody = unknown>(
    url: string,
    data?: TBody,
    config: ApiRequestConfig<TBody> = {},
): Promise<TResponse> {
    return request<TResponse, TBody>({ ...config, method: "POST", url, data });
}

export function put<TResponse = unknown, TBody = unknown>(
    url: string,
    data?: TBody,
    config: ApiRequestConfig<TBody> = {},
): Promise<TResponse> {
    return request<TResponse, TBody>({ ...config, method: "PUT", url, data });
}

export function patch<TResponse = unknown, TBody = unknown>(
    url: string,
    data?: TBody,
    config: ApiRequestConfig<TBody> = {},
): Promise<TResponse> {
    return request<TResponse, TBody>({
        ...config,
        method: "PATCH",
        url,
        data,
    });
}

export function del<TResponse = unknown>(
    url: string,
    config: ApiRequestConfig = {},
): Promise<TResponse> {
    return request<TResponse>({ ...config, method: "DELETE", url });
}

const api = {
    client: apiClient,
    request,
    get,
    post,
    put,
    patch,
    del,
} as const;

export default api;
