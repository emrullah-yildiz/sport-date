import { neon } from "@neondatabase/serverless";

export class DatabaseNotConfiguredError extends Error {
  constructor() {
    super("Database URL is not configured.");
    this.name = "DatabaseNotConfiguredError";
  }
}

export function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
  if (!databaseUrl) throw new DatabaseNotConfiguredError();
  return neon(databaseUrl);
}

