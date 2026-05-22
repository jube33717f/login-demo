import config from '../config';
import type { ProtectedData, UserInfo } from '../types/api';

export class UnauthorizedError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'UnauthorizedError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${config.api.baseUrl}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new UnauthorizedError();
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getMe(): Promise<UserInfo> {
  return request<UserInfo>('/me');
}

export function getProtectedData(): Promise<ProtectedData> {
  return request<ProtectedData>('/api/data');
}

export async function logout(): Promise<void> {
  await request<{ ok: boolean }>('/logout', {
    method: 'POST',
  });
}
