import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { TokenStorage } from "../storage/TokenStorage";
import { API_CONFIG } from "./constants";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [k: string]: JsonValue };

function unwrap<T>(body: unknown): T {
  if (
    body != null &&
    typeof body === "object" &&
    "data" in body &&
    (body as Record<string, unknown>).data !== undefined
  ) {
    return (body as { data: T }).data;
  }
  return body as T;
}

type OnUnauthorizedCallback = () => void;

const REDACT_KEYS = new Set([
  "password",
  "confirmPassword",
  "accessToken",
  "refreshToken",
  "token",
  "authorization",
  "Authorization",
]);

function joinUrl(baseURL?: string, url?: string): string | undefined {
  if (!baseURL && !url) return undefined;
  if (!baseURL) return url;
  if (!url) return baseURL;
  const b = baseURL.endsWith("/") ? baseURL.slice(0, -1) : baseURL;
  const u = url.startsWith("/") ? url : `/${url}`;
  return `${b}${u}`;
}

function toPlainObject(value: unknown): unknown {
  if (value == null) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(toPlainObject);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = toPlainObject(v);
  }
  return out;
}

function redact(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACT_KEYS.has(k) ? "[REDACTED]" : redact(v);
  }
  return out;
}

function safeJson(value: unknown): JsonValue {
  try {
    return JSON.parse(JSON.stringify(value)) as JsonValue;
  } catch {
    return "[Unserializable]" as unknown as JsonValue;
  }
}

function shouldLogHttp(): boolean {
  // Expo: __DEV__ is true for development builds.
  const dev = typeof __DEV__ !== "undefined" ? __DEV__ : false;
  const flag = process.env.EXPO_PUBLIC_DEBUG_HTTP;
  return dev && flag !== "0";
}

export class HttpClient {
  private client: AxiosInstance;
  private onUnauthorized?: OnUnauthorizedCallback;

  constructor(baseUrl?: string) {
    this.client = axios.create({
      baseURL: baseUrl ?? API_CONFIG.BASE_URL,
      headers: { "Content-Type": "application/json" },
    });

    this.client.interceptors.request.use(
      async (config) => {
        const startedAt = Date.now();
        const requestId = `${startedAt}-${Math.random().toString(16).slice(2)}`;
        (config as AxiosRequestConfig & { metadata?: unknown }).metadata = {
          startedAt,
          requestId,
        };

        const token = await TokenStorage.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (shouldLogHttp()) {
          const plainHeaders = toPlainObject(config.headers);
          const plainBody = toPlainObject(config.data);
          // NOTE: we intentionally redact auth + password-like fields.
          // eslint-disable-next-line no-console
          console.log("[HTTP →]", {
            requestId,
            method: (config.method ?? "GET").toUpperCase(),
            baseURL: config.baseURL,
            url: config.url,
            fullUrl: joinUrl(config.baseURL, config.url),
            params: safeJson(redact(toPlainObject(config.params))),
            headers: safeJson(redact(plainHeaders)),
            data: safeJson(redact(plainBody)),
          });
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    this.client.interceptors.response.use(
      (response) => {
        if (shouldLogHttp()) {
          const meta = (response.config as AxiosRequestConfig & { metadata?: unknown })
            .metadata as { startedAt?: number; requestId?: string } | undefined;
          const elapsedMs =
            meta?.startedAt != null ? Date.now() - meta.startedAt : undefined;

          // eslint-disable-next-line no-console
          console.log("[HTTP ←]", {
            requestId: meta?.requestId,
            status: response.status,
            statusText: response.statusText,
            url: response.config?.url,
            fullUrl: joinUrl(response.config?.baseURL, response.config?.url),
            elapsedMs,
            responseHeaders: safeJson(redact(toPlainObject(response.headers))),
            data: safeJson(redact(toPlainObject(response.data))),
          });
        }
        return response;
      },
      async (error) => {
        if (shouldLogHttp()) {
          const cfg = (error?.config ?? {}) as AxiosRequestConfig & { metadata?: unknown };
          const meta = cfg.metadata as { startedAt?: number; requestId?: string } | undefined;
          const elapsedMs =
            meta?.startedAt != null ? Date.now() - meta.startedAt : undefined;

          // eslint-disable-next-line no-console
          console.log("[HTTP ✕]", {
            requestId: meta?.requestId,
            method: (cfg.method ?? "GET").toUpperCase(),
            url: cfg.url,
            fullUrl: joinUrl(cfg.baseURL, cfg.url),
            elapsedMs,
            requestHeaders: safeJson(redact(toPlainObject(cfg.headers))),
            requestParams: safeJson(redact(toPlainObject(cfg.params))),
            requestData: safeJson(redact(toPlainObject(cfg.data))),
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            responseHeaders: safeJson(redact(toPlainObject(error?.response?.headers))),
            responseData: safeJson(redact(toPlainObject(error?.response?.data))),
          });
        }
        if (error.response?.status === 401) {
          await TokenStorage.clearTokens();
          this.onUnauthorized?.();
        }
        return Promise.reject(error);
      },
    );
  }

  setOnUnauthorized(callback: OnUnauthorizedCallback): void {
    this.onUnauthorized = callback;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res: AxiosResponse = await this.client.get(url, config);
    return unwrap<T>(res.data);
  }

  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const res: AxiosResponse = await this.client.post(url, data, config);
    return unwrap<T>(res.data);
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const res: AxiosResponse = await this.client.put(url, data, config);
    return unwrap<T>(res.data);
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const res: AxiosResponse = await this.client.patch(url, data, config);
    return unwrap<T>(res.data);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res: AxiosResponse = await this.client.delete(url, config);
    return unwrap<T>(res.data);
  }
}
