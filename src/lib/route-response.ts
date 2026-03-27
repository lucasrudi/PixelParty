import { NextResponse } from "next/server";
import { logServerError, logServerWarning } from "@/lib/server-log";

export function jsonError(error: unknown, status = 400) {
  if (status >= 500) {
    logServerError("route-error", error, { status });
  } else {
    logServerWarning("route-error", error, { status });
  }

  const message = error instanceof Error ? error.message : "Unexpected error.";
  return NextResponse.json({ error: message }, { status });
}
