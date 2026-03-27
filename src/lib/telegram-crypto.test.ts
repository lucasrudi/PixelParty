import { describe, expect, it } from "vitest";
import {
  decryptTelegramValue,
  encryptTelegramValue,
  hashTelegramValue,
} from "@/lib/telegram-crypto";

describe("telegram crypto", () => {
  const env = {
    TELEGRAM_BINDING_ENCRYPTION_KEY: "pixelparty-test-key",
  };

  it("encrypts and decrypts telegram values", () => {
    const encrypted = encryptTelegramValue("123456789", env);

    expect(encrypted).not.toContain("123456789");
    expect(decryptTelegramValue(encrypted, env)).toBe("123456789");
  });

  it("hashes telegram values deterministically", () => {
    expect(hashTelegramValue("abc")).toBe(hashTelegramValue("abc"));
    expect(hashTelegramValue("abc")).not.toBe(hashTelegramValue("def"));
  });
});
