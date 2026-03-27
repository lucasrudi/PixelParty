export function jsonRequest(
  url: string,
  body?: Record<string, unknown>,
  init?: RequestInit,
) {
  return new Request(url, {
    method: body ? "POST" : init?.method ?? "GET",
    headers: body
      ? {
          "Content-Type": "application/json",
          ...init?.headers,
        }
      : init?.headers,
    body: body ? JSON.stringify(body) : init?.body,
    ...init,
  });
}

export function formRequest(url: string, formData: FormData, init?: RequestInit) {
  return new Request(url, {
    method: "POST",
    body: formData,
    ...init,
  });
}

export function routeContext<TParams extends Record<string, string>>(params: TParams) {
  return { params: Promise.resolve(params) };
}

export async function readJson<T>(response: Response) {
  return (await response.json()) as T;
}
