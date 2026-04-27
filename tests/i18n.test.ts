import assert from "node:assert/strict";
import test from "node:test";

import { resolveLocale } from "../src/lib/i18n";

test("default locale is English for first-time visitors", () => {
  assert.equal(resolveLocale(), "en");
  assert.equal(resolveLocale(""), "en");
  assert.equal(resolveLocale("invalid"), "en");
});

test("explicit supported locale is preserved", () => {
  assert.equal(resolveLocale("zh"), "zh");
  assert.equal(resolveLocale("en"), "en");
  assert.equal(resolveLocale("ko"), "ko");
});
