import { NextResponse, type NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Rate limiting
// In-memory sliding-window counter keyed by IP.
// NOTE: This is per-instance — adequate for basic abuse protection on
// low-traffic deployments. For distributed/serverless production use,
// replace with Upstash Redis + @upstash/ratelimit.
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const ipCounters = new Map<string, RateLimitEntry>();
const RATE_LIMIT_REQUESTS = 120;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounters.get(ip);

  if (!entry || entry.resetAt <= now) {
    ipCounters.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_REQUESTS) {
    return true;
  }

  entry.count++;
  return false;
}

// ---------------------------------------------------------------------------
// CSRF — Origin header check
// Blocks cross-origin state-changing requests in production.
// Requests without an Origin header (server-to-server, curl, etc.) are
// allowed — the Telegram webhook handles its own auth via a secret header.
// ---------------------------------------------------------------------------

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isCrossOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return false;
  }

  const serverOrigin = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
  return origin !== serverOrigin;
}

// ---------------------------------------------------------------------------
// Middleware entry point — applies to /api/games/* routes only
// ---------------------------------------------------------------------------

export function middleware(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 },
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    MUTATING_METHODS.has(request.method) &&
    isCrossOrigin(request)
  ) {
    return NextResponse.json(
      { error: "Cross-origin request rejected." },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/games/:path*"],
};
