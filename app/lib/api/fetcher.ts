'use client';

/**
 * BIKA v2 — Typed fetch wrapper.
 *
 * Every API response is `{ ok: true, data }` or `{ ok: false, error, code }`.
 * This wrapper enforces that and turns failures into typed ApiError throws.
 *
 * Never call fetch() directly in a component or hook — go through here.
 */

import type { ApiResponse } from '@/app/types';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  /** Include credentials (default true — needed for auth cookies). */
  credentials?: RequestCredentials;
}

export async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { body, credentials = 'include', headers, ...rest } = options;

  let response: Response;
  try {
    response = await fetch(path, {
      ...rest,
      credentials,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new ApiError(
      'NETWORK_ERROR',
      'Could not reach the server. Check your connection.',
      0,
      error
    );
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(
      'INVALID_RESPONSE',
      `Server returned a non-JSON response (HTTP ${response.status}).`,
      response.status
    );
  }

  if (!payload || typeof payload !== 'object' || !('ok' in payload)) {
    throw new ApiError(
      'MALFORMED_RESPONSE',
      'Server returned an unexpected response shape.',
      response.status,
      payload
    );
  }

  if (payload.ok === false) {
    throw new ApiError(payload.code, payload.error, response.status, payload.details);
  }

  return payload.data;
}
