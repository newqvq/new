const USDT_SCALE = 1_000_000n;

export function parseUsdt(value: string): bigint {
  const normalized = value.trim();

  if (!/^\d+(\.\d{1,6})?$/.test(normalized)) {
    throw new Error("请输入合法的 USDT 金额，最多支持 6 位小数。");
  }

  const [wholePart, fractionPart = ""] = normalized.split(".");
  const wholeMicros = BigInt(wholePart) * USDT_SCALE;
  const fractionMicros = BigInt((fractionPart + "000000").slice(0, 6));

  return wholeMicros + fractionMicros;
}

export function formatUsdt(value: bigint): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const wholePart = absolute / USDT_SCALE;
  const fractionPart = (absolute % USDT_SCALE).toString().padStart(6, "0");
  const trimmed = fractionPart.replace(/0+$/, "");
  const displayFraction = trimmed.length === 0 ? "00" : trimmed.padEnd(2, "0");

  return `${negative ? "-" : ""}${wholePart.toString()}.${displayFraction}`;
}

export function formatUsdtWithUnit(value: bigint): string {
  return `${formatUsdt(value)} USDT`;
}

export function calculateByBasisPoints(value: bigint, basisPoints: number): bigint {
  return (value * BigInt(basisPoints)) / 10_000n;
}
