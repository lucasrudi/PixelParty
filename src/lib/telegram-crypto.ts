import crypto from "crypto";

type Environment = Record<string, string | undefined>;

function getEncryptionSecret(env: Environment = process.env) {
  const secret = env.TELEGRAM_BINDING_ENCRYPTION_KEY?.trim() ?? "";

  if (!secret) {
    throw new Error("Missing TELEGRAM_BINDING_ENCRYPTION_KEY.");
  }

  return secret;
}

function getEncryptionKey(env: Environment = process.env) {
  return crypto.createHash("sha256").update(getEncryptionSecret(env)).digest();
}

export function encryptTelegramValue(
  value: string,
  env: Environment = process.env,
) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(env), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptTelegramValue(
  payload: string,
  env: Environment = process.env,
) {
  const [ivValue, tagValue, encryptedValue] = payload.split(".");

  if (!ivValue || !tagValue || !encryptedValue) {
    throw new Error("Stored Telegram secret is invalid.");
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(env),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function hashTelegramValue(value: string) {
  return crypto.createHash("sha256").update(value).digest("base64url");
}
