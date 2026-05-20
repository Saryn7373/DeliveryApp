/**
 * ПАТТЕРН: ЗАМЕСТИТЕЛЬ (Proxy)
 *
 * ApiProxy — заместитель реального HTTP-транспорта.
 * Перехватывает все запросы к Django API, добавляет:
 *   - базовый URL (/api)
 *   - заголовки Content-Type
 *   - централизованную обработку ошибок
 *   - логирование запросов
 * Клиентский код работает только с ApiProxy и не знает
 * деталей транспортного слоя.
 */

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

export class ApiError extends Error {
  public status: number;
  public detail: string;

  constructor(
    status: number,
    detail: string,
    message?: string,
  ) {
    super(message ?? detail);

    this.status = status;
    this.detail = detail;

    this.name = 'ApiError';
  }
}

class ApiProxy {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /** Строит итоговый URL с query-параметрами */
  private buildUrl(path: string, params?: Record<string, string | number | undefined>): string {
    const url = new URL(this.baseUrl + path, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, String(v));
      });
    }
    return url.toString();
  }

  /** Перехватывает запрос, добавляет заголовки, обрабатывает ошибки */
  private async intercept<T>(url: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    console.debug(`[ApiProxy] ${options.method ?? 'GET'} ${url}`);

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const body = await response.json();
        detail = body.detail ?? JSON.stringify(body);
      } catch {
        // ignore invalid json response
      }
      throw new ApiError(response.status, detail);
    }

    if (response.status === 204) return undefined as unknown as T;
    return response.json() as Promise<T>;
  }

  async get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
    return this.intercept<T>(this.buildUrl(path, params), { method: 'GET' });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.intercept<T>(this.buildUrl(path), {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.intercept<T>(this.buildUrl(path), {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T = void>(path: string): Promise<T> {
    return this.intercept<T>(this.buildUrl(path), { method: 'DELETE' });
  }
}

/** Единственный экземпляр прокси — все модули используют его */
export const api = new ApiProxy('/api');