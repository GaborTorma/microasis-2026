import { defineConfig } from "drizzle-kit";

// Load DATABASE_URL for the CLI (Next.js loads .env.local on its own at runtime).
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local may be absent in CI; rely on the ambient environment then.
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
  strict: true,
  verbose: true,
});
