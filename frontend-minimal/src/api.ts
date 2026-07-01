const BASE = "/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type Options = Omit<RequestInit, "body"> & { body?: unknown };

export async function apiFetch<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { body, headers, signal: userSignal, ...rest } = opts;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  if (userSignal) {
    userSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const isForm = body instanceof FormData;
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
    const res = await fetch(`${BASE}${path}`, init);
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
    return data as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function assetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path) || path.startsWith("data:")) return path;
  return path; // proxied by vite
}
