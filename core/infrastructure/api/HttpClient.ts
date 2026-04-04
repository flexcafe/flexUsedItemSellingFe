import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";
import { API_CONFIG } from "./constants";
import { TokenStorage } from "../storage/TokenStorage";

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
        const token = await TokenStorage.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          await TokenStorage.clearTokens();
          this.onUnauthorized?.();
        }
        return Promise.reject(error);
      }
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
    config?: AxiosRequestConfig
  ): Promise<T> {
    const res: AxiosResponse = await this.client.post(url, data, config);
    return unwrap<T>(res.data);
  }

  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const res: AxiosResponse = await this.client.put(url, data, config);
    return unwrap<T>(res.data);
  }

  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const res: AxiosResponse = await this.client.patch(url, data, config);
    return unwrap<T>(res.data);
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res: AxiosResponse = await this.client.delete(url, config);
    return unwrap<T>(res.data);
  }
}
