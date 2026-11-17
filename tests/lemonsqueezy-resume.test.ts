import assert from "node:assert/strict";
import { test } from "node:test";
import { isValidMigrationResumeToken, migrationResumeToken } from "../src/lib/lemonsqueezy/resume-token";

// Same algorithm the worker uses (WebCrypto HMAC-SHA256, hex).
async function workerToken(secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("migration-resume"));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

test("worker token matches the app's verifier", async () => {
  assert.equal(await workerToken("secret"), migrationResumeToken("secret"));
  assert.equal(isValidMigrationResumeToken(await workerToken("secret"), "secret"), true);
});

test("rejects missing, wrong-secret and malformed tokens", async () => {
  assert.equal(isValidMigrationResumeToken(null, "secret"), false);
  assert.equal(isValidMigrationResumeToken("", "secret"), false);
  assert.equal(isValidMigrationResumeToken("abc", "secret"), false);
  assert.equal(isValidMigrationResumeToken(await workerToken("other"), "secret"), false);
});
