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

function readContentType(
  headers: NonNullable<AxiosRequestConfig["headers"]>,
): string {
  const h = headers as {
    get?: (name: string) => unknown;
    setContentType?: (value: unknown, rewrite?: boolean) => unknown;
  } & Record<string, unknown>;
  const hasSetContentType = typeof h.setContentType === "function";
  // AxiosHeaders may store disabled content-type as boolean false.
  if (hasSetContentType && h["Content-Type"] === false) return "";
  const fromGet = h.get?.("Content-Type");
  if (fromGet != null) return String(fromGet);
  const v = h["Content-Type"] ?? h["content-type"];
  return v != null ? String(v) : "";
}

function deleteContentType(
  headers: NonNullable<AxiosRequestConfig["headers"]>,
): void {
  const h = headers as { delete?: (name: string) => boolean };
  if (typeof h.delete === "function") {
    h.delete("Content-Type");
    return;
  }
  const raw = headers as Record<string, unknown>;
  delete raw["Content-Type"];
  delete raw["content-type"];
}

/**
 * Axios instance defaults to application/json. For React Native `FormData`,
 * you must not send `Content-Type: multipart/form-data` without a boundary —
 * that often surfaces as `ERR_NETWORK` with no HTTP status. Remove the wrong
 * default so the native stack / axios sets `multipart/form-data; boundary=…`.
 */
function ensureMultipartForFormData(
  headers: NonNullable<AxiosRequestConfig["headers"]>,
): void {
  const h = headers as {
    setContentType?: (value: unknown, rewrite?: boolean) => unknown;
  };
  if (typeof h.setContentType === "function") {
    // Critical for axios RN adapters: prevent fallback to
    // application/x-www-form-urlencoded for FormData requests.
    h.setContentType(false, true);
    return;
  }

  const ct = readContentType(headers).toLowerCase();
  const strip =
    ct.length === 0 ||
    ct.includes("application/json") ||
    ct.includes("application/x-www-form-urlencoded") ||
    (ct.includes("multipart/form-data") && !ct.includes("boundary"));
  if (strip) {
    deleteContentType(headers);
  }
}

function mergeQueryIntoUrl(url: string, params?: unknown): string {
  if (params == null || typeof params !== "object" || Array.isArray(params)) {
    return url;
  }
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params as Record<string, unknown>)) {
    if (v == null) continue;
    q.append(k, String(v));
  }
  const qs = q.toString();
  if (!qs) return url;
  return url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`;
}

function headersToPlainStrings(
  headers?: AxiosRequestConfig["headers"],
): Record<string, string> {
  if (!headers) return {};
  const raw = toPlainObject(headers);
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v == null) continue;
    if (k.toLowerCase() === "content-type") continue;
    out[k] = String(v);
  }
  return out;
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

        if (
          typeof FormData !== "undefined" &&
          config.data instanceof FormData
        ) {
          config.headers = config.headers ?? {};
          ensureMultipartForFormData(config.headers);
        }

        if (shouldLogHttp()) {
          const plainHeaders = toPlainObject(config.headers);
          const plainBody = toPlainObject(config.data);
          // NOTE: we intentionally redact auth + password-like fields.
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
          const meta = (
            response.config as AxiosRequestConfig & { metadata?: unknown }
          ).metadata as { startedAt?: number; requestId?: string } | undefined;
          const elapsedMs =
            meta?.startedAt != null ? Date.now() - meta.startedAt : undefined;

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
          const cfg = (error?.config ?? {}) as AxiosRequestConfig & {
            metadata?: unknown;
          };
          const meta = cfg.metadata as
            | { startedAt?: number; requestId?: string }
            | undefined;
          const elapsedMs =
            meta?.startedAt != null ? Date.now() - meta.startedAt : undefined;

          console.log("[HTTP ✕]", {
            requestId: meta?.requestId,
            method: (cfg.method ?? "GET").toUpperCase(),
            url: cfg.url,
            fullUrl: joinUrl(cfg.baseURL, cfg.url),
            elapsedMs,
            errorCode: error?.code,
            errorMessage: error?.message,
            requestHeaders: safeJson(redact(toPlainObject(cfg.headers))),
            requestParams: safeJson(redact(toPlainObject(cfg.params))),
            requestData: safeJson(redact(toPlainObject(cfg.data))),
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            responseHeaders: safeJson(
              redact(toPlainObject(error?.response?.headers)),
            ),
            responseData: safeJson(
              redact(toPlainObject(error?.response?.data)),
            ),
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

  /**
   * React Native + Axios XHR/fetch adapters still mishandle multipart often
   * (urlencoded fallback, `Network request failed`). Native `fetch` with
   * FormData and no Content-Type is the reliable path; keep axios everywhere else.
   */
  private async requestMultipartWithNativeFetch<T>(
    method: "POST" | "PATCH",
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    const baseURL = this.client.defaults.baseURL ?? API_CONFIG.BASE_URL;
    const joined = joinUrl(baseURL, url) ?? url;
    const fullUrl = mergeQueryIntoUrl(joined, config?.params);
    const startedAt = Date.now();
    const requestId = `${startedAt}-${Math.random().toString(16).slice(2)}`;

    const headers: Record<string, string> = {
      Accept: "application/json, text/plain, */*",
      ...headersToPlainStrings(config?.headers),
    };
    const token = await TokenStorage.getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    if (shouldLogHttp()) {
      console.log("[HTTP →]", {
        requestId,
        method,
        transport: "fetch-multipart",
        baseURL,
        url,
        fullUrl,
        params: safeJson(redact(toPlainObject(config?.params))),
        headers: safeJson(redact(toPlainObject(headers))),
        data: safeJson(redact(toPlainObject(data))),
      });
    }

    let response: Response;
    try {
      response = await fetch(fullUrl, {
        method,
        headers,
        body: data as BodyInit | null | undefined,
      });
    } catch (error) {
      if (shouldLogHttp()) {
        console.log("[HTTP ✕]", {
          requestId,
          method,
          transport: "fetch-multipart",
          url,
          fullUrl,
          elapsedMs: Date.now() - startedAt,
          errorCode: "ERR_NETWORK",
          errorMessage:
            error instanceof Error ? error.message : "Network request failed",
          requestHeaders: safeJson(redact(toPlainObject(headers))),
          requestParams: safeJson(redact(toPlainObject(config?.params))),
          requestData: safeJson(redact(toPlainObject(data))),
          status: undefined,
          statusText: undefined,
        });
      }
      throw error;
    }

    const elapsedMs = Date.now() - startedAt;
    const rawText = await response.text();
    let parsed: unknown = rawText;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      // non-JSON body
    }

    if (shouldLogHttp()) {
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log(response.ok ? "[HTTP ←]" : "[HTTP ✕]", {
        requestId,
        method,
        transport: "fetch-multipart",
        url,
        fullUrl,
        elapsedMs,
        status: response.status,
        statusText: response.statusText,
        responseHeaders: safeJson(redact(responseHeaders)),
        data: safeJson(redact(toPlainObject(parsed))),
      });
    }

    if (response.status === 401) {
      await TokenStorage.clearTokens();
      this.onUnauthorized?.();
    }
    if (!response.ok) {
      const err = new Error(
        `Request failed with status ${response.status} ${response.statusText}`,
      ) as Error & { response?: unknown };
      err.response = {
        status: response.status,
        statusText: response.statusText,
        data: parsed,
      };
      throw err;
    }
    return unwrap<T>(parsed);
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

  /** Multipart uploads (same as axios `postForm`; use for RN `FormData` + files). */
  async postForm<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.requestMultipartWithNativeFetch("POST", url, data, config);
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

  async patchForm<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.requestMultipartWithNativeFetch("PATCH", url, data, config);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res: AxiosResponse = await this.client.delete(url, config);
    return unwrap<T>(res.data);
  }
}
