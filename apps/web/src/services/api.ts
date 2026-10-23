const baseUrl = import.meta.env.VITE_API_URL || "/api/v1";
let csrfToken = "";

export class ApiError extends Error { constructor(public status: number, message: string, public code?: string) { super(message); } }
export const setCsrfToken = (token: string) => { csrfToken = token; };

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfToken) headers.set("X-CSRF-Token", csrfToken);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, { ...options, headers, credentials: "include" });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError(0, "Cannot reach the API server. Start it with `npm run dev` from the project root, then try again.", "API_UNAVAILABLE");
    }
    throw error;
  }
  if (response.status === 204) return undefined as T;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(response.status, payload.error || "The request could not be completed", payload.code);
  return payload as T;
}

export const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });
