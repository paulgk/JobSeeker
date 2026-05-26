import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  out: './drizzle',
  schema: './src/lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    // DATABASE_URL_UNPOOLED (direct connection) is required for drizzle-kit migrations.
    // Pooled connections (PgBouncer transaction mode) break multi-statement migration scripts.
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
})
