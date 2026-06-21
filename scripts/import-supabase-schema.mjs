import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import postgresClient from "postgresql-client";

const { Connection } = postgresClient;

dotenv.config({ path: ".env.local", override: false, quiet: true });
dotenv.config({ path: ".env", override: false, quiet: true });

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const sqlFile = args.find((arg) => !arg.startsWith("--")) || "database/supabase_schema.sql";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
const databasePassword = process.env.SUPABASE_DB_PASSWORD;

function defaultDatabaseUrl() {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const password = encodeURIComponent(databasePassword || "");

  return `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
}

function connectionConfig(value) {
  const url = new URL(value);

  return {
    host: url.hostname,
    port: Number(url.port || 5432),
    user: decodeURIComponent(url.username || "postgres"),
    password: decodeURIComponent(url.password || ""),
    database: decodeURIComponent(url.pathname.replace(/^\//, "") || "postgres"),
    requireSSL: true,
    ssl: { rejectUnauthorized: false }
  };
}

if (!databaseUrl && (!supabaseUrl || !databasePassword)) {
  console.error([
    "Missing database connection.",
    "Set SUPABASE_DB_PASSWORD to use the direct Supabase DB host,",
    "or set SUPABASE_DB_URL/DATABASE_URL to a full Postgres connection string."
  ].join("\n"));
  process.exit(1);
}

const connectionString = databaseUrl || defaultDatabaseUrl();
const sql = await readFile(sqlFile, "utf8");
const statementCount = sql.split(";").filter((part) => part.trim()).length;

if (dryRun) {
  console.log(`Ready to import ${sqlFile} (${statementCount} SQL chunks before parsing).`);
  process.exit(0);
}

const started = Date.now();
const connection = new Connection(connectionConfig(connectionString));

try {
  await connection.connect();
  await connection.execute(sql, { autoCommit: true });
  console.log(`Imported ${sqlFile} in ${Date.now() - started}ms.`);
} finally {
  await connection.close().catch(() => {});
}
