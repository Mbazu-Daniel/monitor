const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "").replace(/\/api\/v1$/, "");

export function apiUrl(path: string): string {
  if (!apiBase) return path;
  return `${apiBase}${path.replace(/^\/api(?!\/v1)/, "/api/v1")}`;
}

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function readErrorBody(response: Response): Promise<{ message?: string | string[]; error?: string } | undefined> {
  try {
    return (await response.json()) as { message?: string | string[]; error?: string };
  } catch {
    return undefined;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), {
      ...options,
      method: options.method ?? "GET",
      body: options.body ?? null,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError("Network error. Check your connection and try again.", 0);
    }
    throw error;
  }
  if (!response.ok) {
    const body = await readErrorBody(response);
    const raw = Array.isArray(body?.message) ? body.message.join(", ") : (body?.message ?? body?.error);
    throw new ApiError(raw ?? `Request failed with status ${response.status}`, response.status);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
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
  const response = await fetch(apiUrl(path), { credentials: "include" });
  if (!response.ok) {
    throw new ApiError(`Download failed with status ${response.status}`, response.status);
  }
  return response.blob();
}
