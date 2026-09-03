export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function parseJson(response: Response) {
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) {
    throw new ApiRequestError(body.error ?? "Request failed", response.status);
  }
  return body;
}

export async function apiGet<T>(path: string) {
  const response = await fetch(path, { credentials: "include" });
  return parseJson(response) as Promise<T>;
}

export async function apiSend<T>(path: string, method: "POST" | "PATCH", body: unknown) {
  const response = await fetch(path, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return parseJson(response) as Promise<T>;
}
