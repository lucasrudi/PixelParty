import {
  createHash,
  createHmac,
  createPublicKey,
  createVerify,
  randomBytes,
  timingSafeEqual,
} from "crypto";

type Environment = Record<string, string | undefined>;
type NodeJsonWebKey = import("crypto").JsonWebKey;

interface TelegramCookieState {
  createdAt: number;
  nonce: string;
  returnTo: string;
  state: string;
  verifier: string;
}

interface TelegramTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  token_type: string;
}

interface TelegramIdTokenHeader {
  alg?: string;
  kid?: string;
}

interface TelegramIdTokenClaims {
  aud?: number | string;
  exp?: number;
  iat?: number;
  id?: number | string;
  iss?: string;
  name?: string;
  nonce?: string;
  phone_number?: string;
  picture?: string;
  preferred_username?: string;
  sub?: string;
}

interface TelegramJwk {
  alg?: string;
  e?: string;
  kid?: string;
  kty?: string;
  n?: string;
  use?: string;
}

export interface TelegramAuthSession {
  authDate: number;
  id: string;
  name: string;
  phoneNumber?: string;
  photoUrl?: string;
  username?: string;
  verifiedAt: string;
}

export const TELEGRAM_AUTH_COOKIE_NAME = "pixelparty_tg_auth";
export const TELEGRAM_OAUTH_COOKIE_NAME = "pixelparty_tg_oauth";

const DEFAULT_RETURN_TO = "/";
const JWKS_URL = "https://oauth.telegram.org/.well-known/jwks.json";
const TELEGRAM_ISSUER = "https://oauth.telegram.org";

let jwksCache:
  | {
      expiresAt: number;
      keys: TelegramJwk[];
    }
  | undefined;

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signValue(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function encodeSignedJson(payload: unknown, secret: string) {
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encoded, secret);
  return `${encoded}.${signature}`;
}

function decodeSignedJson<T>(value: string | undefined, secret: string): T | null {
  if (!value) {
    return null;
  }

  const [encoded, signature] = value.split(".");

  if (!encoded || !signature) {
    return null;
  }

  const expectedSignature = signValue(encoded, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(encoded)) as T;
  } catch {
    return null;
  }
}

function sha256Base64Url(value: string) {
  return createHash("sha256").update(value).digest("base64url");
}

function decodeJwtPart<T>(value: string) {
  return JSON.parse(base64UrlDecode(value)) as T;
}

function decodeJwt(token: string) {
  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new Error("Telegram returned an invalid ID token.");
  }

  return {
    encodedHeader,
    encodedPayload,
    encodedSignature,
    header: decodeJwtPart<TelegramIdTokenHeader>(encodedHeader),
    payload: decodeJwtPart<TelegramIdTokenClaims>(encodedPayload),
    signingInput: `${encodedHeader}.${encodedPayload}`,
    signature: Buffer.from(encodedSignature, "base64url"),
  };
}

function normalizeUsername(value?: string) {
  const normalized = value?.trim().replace(/^@/, "") ?? "";
  return normalized || undefined;
}

function normalizeReturnTo(value?: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_RETURN_TO;
  }

  return value;
}

function buildCookieSecret(env: Environment = process.env) {
  return (
    env.PIXELPARTY_TELEGRAM_SESSION_SECRET ??
    env.TELEGRAM_LOGIN_SESSION_SECRET ??
    getTelegramLoginClientSecret(env)
  );
}

function shouldUseSecureCookies(env: Environment = process.env) {
  return env.INSECURE_COOKIES !== "true";
}

async function fetchTelegramJwks() {
  const now = Date.now();

  if (jwksCache && jwksCache.expiresAt > now) {
    return jwksCache.keys;
  }

  const response = await fetch(JWKS_URL, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Could not load Telegram login keys.");
  }

  const payload = (await response.json()) as { keys?: TelegramJwk[] };
  const keys = Array.isArray(payload.keys) ? payload.keys : [];

  if (keys.length === 0) {
    throw new Error("Telegram login keys were empty.");
  }

  jwksCache = {
    expiresAt: now + 5 * 60 * 1000,
    keys,
  };

  return keys;
}

async function verifyTelegramIdToken(
  idToken: string,
  expectedNonce: string,
  env: Environment = process.env,
) {
  const clientId = getTelegramLoginClientId(env);

  if (!clientId) {
    throw new Error("Telegram Login client ID is not configured.");
  }

  const decoded = decodeJwt(idToken);

  if (decoded.header.alg !== "RS256" || !decoded.header.kid) {
    throw new Error("Telegram returned an unsupported ID token.");
  }

  const jwks = await fetchTelegramJwks();
  const jwk = jwks.find((entry) => entry.kid === decoded.header.kid);

  if (!jwk) {
    throw new Error("Telegram login key rotation is out of sync.");
  }

  const verifier = createVerify("RSA-SHA256");
  verifier.update(decoded.signingInput);
  verifier.end();

  const publicKey = createPublicKey({
    format: "jwk",
    key: jwk as NodeJsonWebKey,
  });

  if (!verifier.verify(publicKey, decoded.signature)) {
    throw new Error("Telegram ID token verification failed.");
  }

  if (decoded.payload.iss !== TELEGRAM_ISSUER) {
    throw new Error("Telegram ID token issuer was invalid.");
  }

  if (String(decoded.payload.aud ?? "") !== clientId) {
    throw new Error("Telegram ID token audience was invalid.");
  }

  if (!decoded.payload.exp || decoded.payload.exp * 1000 <= Date.now()) {
    throw new Error("Telegram login expired. Please try again.");
  }

  if (decoded.payload.nonce !== expectedNonce) {
    throw new Error("Telegram login nonce did not match.");
  }

  const telegramId = String(decoded.payload.id ?? decoded.payload.sub ?? "");

  if (!telegramId) {
    throw new Error("Telegram login did not include a user identifier.");
  }

  return decoded.payload;
}

export function getTelegramLoginClientId(env: Environment = process.env) {
  return (
    env.PIXELPARTY_TELEGRAM_LOGIN_CLIENT_ID ??
    env.TELEGRAM_LOGIN_CLIENT_ID ??
    null
  );
}

export function getTelegramLoginClientSecret(env: Environment = process.env) {
  return (
    env.PIXELPARTY_TELEGRAM_LOGIN_CLIENT_SECRET ??
    env.TELEGRAM_LOGIN_CLIENT_SECRET ??
    null
  );
}

export function isTelegramLoginEnabled(env: Environment = process.env) {
  return Boolean(
    getTelegramLoginClientId(env) && getTelegramLoginClientSecret(env),
  );
}

export function assertTelegramLoginConfigured(env: Environment = process.env) {
  if (!isTelegramLoginEnabled(env)) {
    throw new Error(
      "Telegram Login is not configured. Set PIXELPARTY_TELEGRAM_LOGIN_CLIENT_ID and PIXELPARTY_TELEGRAM_LOGIN_CLIENT_SECRET.",
    );
  }
}

export function getTelegramSession(
  cookieValue: string | undefined,
  env: Environment = process.env,
) {
  const secret = buildCookieSecret(env);

  if (!secret) {
    return null;
  }

  return decodeSignedJson<TelegramAuthSession>(cookieValue, secret);
}

export function createTelegramSessionCookie(
  session: TelegramAuthSession,
  env: Environment = process.env,
) {
  const secret = buildCookieSecret(env);

  if (!secret) {
    throw new Error("Telegram session secret is not configured.");
  }

  return encodeSignedJson(session, secret);
}

export function clearTelegramCookieOptions(env: Environment = process.env) {
  return {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(env),
  };
}

export function getTelegramSessionCookieOptions(env: Environment = process.env) {
  return {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(env),
  };
}

export function getTelegramOauthCookieOptions(env: Environment = process.env) {
  return {
    httpOnly: true,
    maxAge: 60 * 10,
    path: "/",
    sameSite: "lax" as const,
    secure: shouldUseSecureCookies(env),
  };
}

export function createTelegramOauthState(returnTo?: string | null) {
  return {
    createdAt: Date.now(),
    nonce: randomBytes(24).toString("base64url"),
    returnTo: normalizeReturnTo(returnTo),
    state: randomBytes(24).toString("base64url"),
    verifier: randomBytes(48).toString("base64url"),
  } satisfies TelegramCookieState;
}

export function createTelegramOauthCookie(
  state: ReturnType<typeof createTelegramOauthState>,
  env: Environment = process.env,
) {
  const secret = buildCookieSecret(env);

  if (!secret) {
    throw new Error("Telegram session secret is not configured.");
  }

  return encodeSignedJson(state, secret);
}

export function getTelegramOauthState(
  cookieValue: string | undefined,
  env: Environment = process.env,
) {
  const secret = buildCookieSecret(env);

  if (!secret) {
    return null;
  }

  const state = decodeSignedJson<TelegramCookieState>(cookieValue, secret);

  if (!state) {
    return null;
  }

  if (Date.now() - state.createdAt > 10 * 60 * 1000) {
    return null;
  }

  return state;
}

export function buildTelegramLoginUrl(args: {
  callbackUrl: string;
  state: ReturnType<typeof createTelegramOauthState>;
  env?: Environment;
}) {
  const clientId = getTelegramLoginClientId(args.env);

  if (!clientId) {
    throw new Error("Telegram Login client ID is not configured.");
  }

  const url = new URL("https://oauth.telegram.org/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", args.callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile telegram:bot_access");
  url.searchParams.set("state", args.state.state);
  url.searchParams.set("nonce", args.state.nonce);
  url.searchParams.set("code_challenge", sha256Base64Url(args.state.verifier));
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function exchangeTelegramCode(args: {
  callbackUrl: string;
  code: string;
  verifier: string;
  env?: Environment;
}) {
  const clientId = getTelegramLoginClientId(args.env);
  const clientSecret = getTelegramLoginClientSecret(args.env);

  if (!clientId || !clientSecret) {
    throw new Error("Telegram Login credentials are not configured.");
  }

  const body = new URLSearchParams({
    client_id: clientId,
    code: args.code,
    code_verifier: args.verifier,
    grant_type: "authorization_code",
    redirect_uri: args.callbackUrl,
  });

  const response = await fetch("https://oauth.telegram.org/token", {
    body,
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Telegram Login code exchange failed.");
  }

  return (await response.json()) as TelegramTokenResponse;
}

export async function createTelegramSessionFromIdToken(args: {
  env?: Environment;
  expectedNonce: string;
  idToken: string;
}) {
  const claims = await verifyTelegramIdToken(
    args.idToken,
    args.expectedNonce,
    args.env,
  );

  return {
    authDate: claims.iat ?? Math.floor(Date.now() / 1000),
    id: String(claims.id ?? claims.sub ?? ""),
    name:
      claims.name?.trim() ||
      normalizeUsername(claims.preferred_username) ||
      "Telegram player",
    phoneNumber: claims.phone_number,
    photoUrl: claims.picture,
    username: normalizeUsername(claims.preferred_username),
    verifiedAt: new Date().toISOString(),
  } satisfies TelegramAuthSession;
}

export function getTelegramHandleFromSession(session?: TelegramAuthSession | null) {
  return session?.username ? `@${session.username}` : "";
}

export function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return undefined;
  }

  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

export function buildTelegramAuthRedirect(returnTo: string, error?: string) {
  const url = new URL(normalizeReturnTo(returnTo), "https://pixelparty.local");

  if (error) {
    url.searchParams.set("telegramAuthError", error);
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
