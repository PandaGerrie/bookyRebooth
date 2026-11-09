const TOKEN_KEY = "booky_cms_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

type ApiError = {
  error?: string;
  details?: unknown;
};

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const data = (await response.json().catch(() => ({}))) as T & ApiError;

  if (!response.ok) {
    throw new Error(data.error || "Er ging iets mis");
  }

  return data;
}

/** entityKey defaults to "global" for shared content (product sets) */
export async function uploadMedia(
  file: File,
  entityKey = "global",
): Promise<string> {
  const body = new FormData();
  body.append("entity", entityKey);
  body.append("file", file);

  const data = await api<{ url: string }>(
    `/media?entity=${encodeURIComponent(entityKey)}`,
    {
      method: "POST",
      body,
    },
  );

  return data.url;
}
