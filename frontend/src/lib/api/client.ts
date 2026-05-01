"use client";

import type { ApiEnvelope } from "@/lib/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";
const AUTH_TOKEN_KEY = "vitalforce.auth-token";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredAuthToken(token: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

function authHeaders(): HeadersInit {
  const token = getStoredAuthToken();
  if (!token) {
    throw new ApiError("You must sign in before using the API.", 401, "unauthorized");
  }

  return { Authorization: `Bearer ${token}` };
}

export async function apiRequest<T>(path: string, init: RequestInit = {}, options: { auth?: boolean } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const body = init.body;
  if (body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.auth !== false) {
    const auth = authHeaders();
    Object.entries(auth).forEach(([key, value]) => headers.set(key, String(value)));
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new ApiError(
      payload?.error?.message || "Request failed.",
      response.status,
      payload?.error?.code || "request_failed",
    );
  }

  return (payload as ApiEnvelope<T>).data;
}

export function jsonBody(value: unknown): BodyInit {
  return JSON.stringify(value);
}
