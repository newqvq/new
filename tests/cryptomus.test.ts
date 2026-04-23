import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??= "mysql://user:password@localhost:3306/test";
process.env.AUTH_SECRET ??= "test-auth-secret-with-enough-length-for-env-parse";
process.env.USDT_TRC20_ADDRESS ??= "TLsV52sRDL79HXGGm9v2Vya66z5R6LkQkD";
process.env.USDT_ERC20_ADDRESS ??= "0x1111111111111111111111111111111111111111";
process.env.USDT_BEP20_ADDRESS ??= "0x2222222222222222222222222222222222222222";
process.env.USDT_TRC20_TOKEN_CONTRACT ??= "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
process.env.USDT_ERC20_TOKEN_CONTRACT ??= "0xdAC17F958D2ee523a2206206994597C13D831ec7";
process.env.CRYPTOMUS_PAYMENT_API_KEY ??= "cryptomus-test-key";

test("cryptomus webhook signature ignores the sign field and verifies payload integrity", async () => {
  const { signCryptomusPayload, verifyCryptomusWebhookSignature } = await import(
    "../src/lib/cryptomus"
  );
  const unsignedPayload = {
    uuid: "pay-uuid",
    order_id: "RC123",
    status: "paid",
    is_final: true,
    amount: "50.00",
    currency: "USDT",
  };
  const sign = signCryptomusPayload(unsignedPayload, "cryptomus-test-key");

  assert.equal(verifyCryptomusWebhookSignature({ ...unsignedPayload, sign }), true);
  assert.equal(
    verifyCryptomusWebhookSignature({
      ...unsignedPayload,
      amount: "51.00",
      sign,
    }),
    false,
  );
});

test("cryptomus only credits successful final payment statuses", async () => {
  const { isCryptomusFailedFinal, isCryptomusPaidFinal } = await import(
    "../src/lib/cryptomus"
  );

  assert.equal(isCryptomusPaidFinal({ status: "paid", is_final: true }), true);
  assert.equal(isCryptomusPaidFinal({ status: "paid", is_final: false }), false);
  assert.equal(isCryptomusPaidFinal({ status: "check", is_final: true }), false);
  assert.equal(isCryptomusFailedFinal({ status: "fail", is_final: true }), true);
});
