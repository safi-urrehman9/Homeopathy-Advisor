"use client";

import { toast } from "sonner";

export function showError(error: unknown, fallback = "Something went wrong") {
  const message = error instanceof Error ? error.message : fallback;
  toast.error(message || fallback);
}
