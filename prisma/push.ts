import { execFileSync } from "node:child_process";
import path from "node:path";

const npxCommand = process.platform === "win32" ? "npx.cmd" : "npx";
const schemaPath = path.join("prisma", "schema.prisma");

execFileSync(
  npxCommand,
  ["prisma", "db", "push", "--schema", schemaPath, "--skip-generate"],
  {
    cwd: process.cwd(),
    stdio: "inherit",
  },
);

execFileSync(npxCommand, ["prisma", "generate", "--schema", schemaPath], {
  cwd: process.cwd(),
  stdio: "inherit",
});

console.log("Database schema synchronized.");
