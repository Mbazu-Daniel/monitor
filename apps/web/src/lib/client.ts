import axios from "axios";

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const apiBase = (env.VITE_API_URL ?? "").replace(/\/+$/, "");

// Absolute API origin when VITE_API_URL is set at build time; otherwise the
// relative path through the local proxy (vite dev / vite preview)
export function apiUrl(path: string): string {
  return apiBase ? `${apiBase}${path}` : path;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await axios.request<T>({
      url: apiUrl(path),
      method: options.method ?? "GET",
      data: options.body,
      withCredentials: true,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> | undefined),
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const body = error.response?.data as { message?: string | string[]; error?: string } | undefined;
      const message = Array.isArray(body?.message) ? body.message.join(", ") : (body?.message ?? body?.error ?? error.message);
      throw new ApiError(message, error.response?.status ?? 500);
    }
    throw error;
  }
}

export function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const result = search.toString();
  return result ? `?${result}` : "";
}

export async function download(path: string) {
  // Verified sink: the destination is the build-time API origin (apiUrl) or the same-origin
  // dev proxy, never attacker-controlled input.
  const response = await axios.get<Blob>(apiUrl(path), { responseType: "blob", withCredentials: true });
  return response.data;
}
