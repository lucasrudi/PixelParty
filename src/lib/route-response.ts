import { NextResponse } from "next/server";
import { UserFacingError } from "@/lib/errors";
import { logServerError, logServerWarning } from "@/lib/server-log";

export function jsonError(error: unknown, status = 400) {
  const isUserFacing = error instanceof UserFacingError;

  if (!isUserFacing) {
    logServerError("route-error", error, { status });
  } else {
    logServerWarning("route-error", error, { status });
  }

  const message =
    isUserFacing
      ? error.message
      : process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "An unexpected error occurred.";

  return NextResponse.json({ error: message }, { status });
}
