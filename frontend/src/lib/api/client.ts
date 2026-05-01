"use client";

import { auth } from "@/lib/firebase";
import type { ApiEnvelope } from "@/lib/api/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) {
    throw new ApiError("You must sign in before using the API.", 401, "unauthorized");
  }
  const token = await user.getIdToken();
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const body = init.body;
  if (body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const auth = await authHeaders();
  Object.entries(auth).forEach(([key, value]) => headers.set(key, String(value)));

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
