import assert from "node:assert/strict";
import test from "node:test";

import { Role } from "@prisma/client";

import { resolveSessionUser } from "../src/lib/session-resolver";

test("deleted users invalidate an otherwise valid session identity", () => {
  assert.equal(resolveSessionUser({ userId: "user_1" }, null), null);
});

test("database role and profile override stale token claims", () => {
  const session = resolveSessionUser(
    { userId: "user_1" },
    {
      id: "user_1",
      email: "member@example.com",
      displayName: "当前用户",
      role: Role.USER,
    },
  );

  assert.deepEqual(session, {
    userId: "user_1",
    email: "member@example.com",
    displayName: "当前用户",
    role: Role.USER,
  });
});
