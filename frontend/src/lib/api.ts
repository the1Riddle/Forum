export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8080";

export const WS_BASE_URL = API_BASE_URL.replace(/^http/, "ws");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown; raw?: boolean };

export async function apiFetch<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { body, raw, headers, signal: userSignal, ...rest } = opts;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  if (userSignal) {
    userSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const init: RequestInit = {
    credentials: "include",
    ...rest,
    signal: controller.signal,
    headers: {
      ...(isForm ? {} : body !== undefined ? { "Content-Type": "application/json" } : {}),
      Accept: "application/json",
      ...(headers as Record<string, string> | undefined),
    },
    body: isForm ? (body as FormData) : body !== undefined ? JSON.stringify(body) : undefined,
  };
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, init);
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) {
      const msg =
        (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) ||
        res.statusText ||
        "Request failed";
      throw new ApiError(String(msg), res.status);
    }
    return (raw ? (data as T) : (data as T)) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function resolveAsset(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path) || path.startsWith("data:")) return path;
  if (path.startsWith("/")) return `${API_BASE_URL}${path}`;
  return `${API_BASE_URL}/${path}`;
}
