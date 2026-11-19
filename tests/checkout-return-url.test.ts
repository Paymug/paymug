import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseCheckoutCustomData,
  parseInitialCheckoutEmail,
} from "../src/lib/checkout-custom-data";
import {
  productRedirectUrlSchema,
  resolveProductRedirectUrl,
} from "../src/lib/product-redirect-url";
import {
  isRedirectHostAllowed,
  normalizeRedirectDomain,
  parseRedirectDomains,
  resolveReturnUrl,
} from "../src/lib/return-url";

const live = (allowedDomains: string[]) => ({ allowedDomains, sandbox: false });

test("normalizes redirect domain patterns", () => {
  assert.equal(normalizeRedirectDomain(" HTTPS://*.MailFlare.app/x?y "), "*.mailflare.app");
  assert.equal(normalizeRedirectDomain("app.example.com:8443"), "app.example.com");
  for (const bad of ["", "*", "*.com", "a b.com", "exa_mple.com", "*.*.com", "-a.com"]) {
    assert.equal(normalizeRedirectDomain(bad), undefined, bad);
  }
  assert.deepEqual(parseRedirectDomains('["a.com","*.b.com",1,"*"]'), ["a.com", "*.b.com"]);
  assert.deepEqual(parseRedirectDomains("not json"), []);
});

test("wildcards match subdomains but not the apex or lookalikes", () => {
  const allowed = ["*.mailflare.app", "cloud.example.com"];
  assert.equal(isRedirectHostAllowed("acme.mailflare.app", allowed), true);
  assert.equal(isRedirectHostAllowed("a.b.mailflare.app", allowed), true);
  assert.equal(isRedirectHostAllowed("mailflare.app", allowed), false);
  assert.equal(isRedirectHostAllowed("evilmailflare.app", allowed), false);
  assert.equal(isRedirectHostAllowed("acme.mailflare.app.evil.com", allowed), false);
  assert.equal(isRedirectHostAllowed("cloud.example.com", allowed), true);
  assert.equal(isRedirectHostAllowed("x.cloud.example.com", allowed), false);
});

test("return URL is only honored for allowlisted https hosts", () => {
  const allowed = live(["*.mailflare.app", "cloud.example.com"]);
  assert.equal(
    resolveReturnUrl("https://acme.mailflare.app/", allowed),
    "https://acme.mailflare.app/",
  );
  assert.equal(
    resolveReturnUrl("https://cloud.example.com/billing/return?ws=1", allowed),
    "https://cloud.example.com/billing/return?ws=1",
  );
  const rejected = [
    "https://evil.com/",
    "http://acme.mailflare.app/",
    "javascript:alert(1)",
    "//acme.mailflare.app/",
    "https://acme.mailflare.app@evil.com/",
    "https://user:pw@acme.mailflare.app/",
    "https://evil.com/?u=https://acme.mailflare.app/",
    "not a url",
    "",
  ];
  for (const value of rejected) {
    assert.equal(resolveReturnUrl(value, allowed), undefined, value);
  }
  assert.equal(resolveReturnUrl(undefined, allowed), undefined);
  assert.equal(resolveReturnUrl("https://acme.mailflare.app/", live([])), undefined);
});

test("http localhost is allowed only in sandbox", () => {
  const sandbox = { allowedDomains: [], sandbox: true };
  assert.equal(resolveReturnUrl("http://localhost:3000/done", sandbox), "http://localhost:3000/done");
  assert.equal(resolveReturnUrl("http://127.0.0.1:3000/", sandbox), "http://127.0.0.1:3000/");
  assert.equal(resolveReturnUrl("http://localhost:3000/done", live([])), undefined);
  assert.equal(resolveReturnUrl("http://evil.com/", sandbox), undefined);
  assert.equal(resolveReturnUrl("http://localhost.evil.com/", sandbox), undefined);
});

test("[return_url] is stored as custom data", () => {
  assert.deepEqual(
    parseCheckoutCustomData({
      "[custom][workspace_id]": "w1",
      "[return_url]": "https://w1.example.com/",
    }),
    { workspace_id: "w1", return_url: "https://w1.example.com/" },
  );
  assert.deepEqual(
    parseCheckoutCustomData({
      "[custom][return_url]": "https://a.example.com/",
      "[return_url]": "https://b.example.com/",
    }),
    { return_url: "https://a.example.com/" },
  );
});

test("email prefill accepts only plain emails", () => {
  assert.equal(parseInitialCheckoutEmail(" jane@example.com "), "jane@example.com");
  assert.equal(parseInitialCheckoutEmail(["a@b.co", "c@d.co"]), "c@d.co");
  assert.equal(parseInitialCheckoutEmail("nope"), undefined);
  assert.equal(parseInitialCheckoutEmail('"><script>@x.co'), undefined);
  assert.equal(parseInitialCheckoutEmail(undefined), undefined);
});

test("product redirect URL supports custom placeholders", () => {
  const url = resolveProductRedirectUrl(
    "https://app.example.com/r?o=[order_id]&e=[email]&w=[custom][workspace_id]&m=[custom][missing]",
    {
      orderId: "o1",
      email: "a+b@example.com",
      productId: "p1",
      custom: { workspace_id: "w 1&x=[order_id]" },
    },
  );
  assert.equal(
    url,
    "https://app.example.com/r?o=o1&e=a%2Bb%40example.com&w=w%201%26x%3D%5Border_id%5D&m=",
  );
  assert.equal(
    resolveProductRedirectUrl("https://x.com/[custom][__proto__]", {
      orderId: "o",
      email: "e",
      productId: "p",
      custom: {},
    }),
    "https://x.com/",
  );
});

test("product redirect URL schema validates placeholders", () => {
  assert.equal(
    productRedirectUrlSchema.safeParse("https://x.com/?w=[custom][workspace_id]&o=[order_id]").success,
    true,
  );
  assert.equal(productRedirectUrlSchema.safeParse("https://[custom][ws].x.com/").success, true);
  assert.equal(productRedirectUrlSchema.safeParse("https://x.com/?a=[unknown]").success, false);
  assert.equal(productRedirectUrlSchema.safeParse("https://x.com/?a=[custom][bad name]").success, false);
  assert.equal(productRedirectUrlSchema.safeParse("ftp://x.com/").success, false);
});
