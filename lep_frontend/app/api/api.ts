export const BASE_URL = "https://nominally-huge-millipede.cloudpub.ru/api/"; //для апи
export const BASE_MINI = "https://intangibly-tender-bobwhite.cloudpub.ru/"; //для файлохранилища

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });


  if (!res.ok) {
    throw new Error(`API request failed: ${res.status}`);
  }

  return res.json();
}