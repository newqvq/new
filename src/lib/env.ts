import { z } from "zod";

const optionalUrl = z.union([z.string().url(), z.literal("")]).default("");
const optionalString = z.string().optional().default("");
const optionalHosts = z.string().optional().default("");

const DEFAULT_ADMIN_PASSWORD = "ChangeMe123!";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  RATE_LIMIT_SECRET: optionalString,
  SITE_URL: z.string().url().default("http://localhost:3000"),
  SERVER_ACTION_ALLOWED_ORIGINS: optionalHosts,
  CRAZYSMM_API_URL: z.string().url().default("https://crazysmm.com/api/v2"),
  CRAZYSMM_API_KEY: optionalString,
  USDT_TRC20_ADDRESS: z.string().min(8),
  USDT_ERC20_ADDRESS: z.string().min(8),
  USDT_BEP20_ADDRESS: z.string().min(8),
  USDT_TRC20_TOKEN_CONTRACT: z.string().min(8),
  USDT_ERC20_TOKEN_CONTRACT: z.string().min(8),
  USDT_BEP20_TOKEN_CONTRACT: optionalString,
  TRONGRID_API_BASE_URL: z.string().url().default("https://api.trongrid.io"),
  TRONGRID_API_KEY: optionalString,
  ETH_RPC_URL: optionalUrl,
  BSC_RPC_URL: optionalUrl,
  TRC20_MIN_CONFIRMATIONS: z.coerce.number().int().min(1).max(1000).default(20),
  ERC20_MIN_CONFIRMATIONS: z.coerce.number().int().min(1).max(1000).default(12),
  BEP20_MIN_CONFIRMATIONS: z.coerce.number().int().min(1).max(1000).default(15),
  COMMISSION_RATE_BPS: z.coerce.number().int().min(0).max(5000).default(500),
  ADMIN_EMAIL: z.string().email().default("admin@xinglian.local"),
  ADMIN_PASSWORD: z.string().min(8).default("ChangeMe123!"),
});

const parsedEnv = envSchema.parse(process.env);

if (process.env.NODE_ENV === "production") {
  const siteUrl = new URL(parsedEnv.SITE_URL);
  const isLocalSite =
    siteUrl.hostname === "localhost" || siteUrl.hostname === "127.0.0.1";

  if (!isLocalSite && siteUrl.protocol !== "https:") {
    throw new Error("SITE_URL must use https in production.");
  }

  if (parsedEnv.AUTH_SECRET.length < 48) {
    throw new Error("AUTH_SECRET must be at least 48 characters in production.");
  }

  if (!isLocalSite && parsedEnv.ADMIN_PASSWORD === DEFAULT_ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD must be changed before starting production.");
  }
}

export const env = {
  ...parsedEnv,
  RATE_LIMIT_SECRET: parsedEnv.RATE_LIMIT_SECRET || parsedEnv.AUTH_SECRET,
};
