// One-shot installer that POSTs db/install.sql to the Supabase Management API.
// Reads PAT + project ref from argv so we don't bake creds into the file.

import fs from "node:fs/promises";
import path from "node:path";

const [, , pat, projectRef, sqlPath] = process.argv;
if (!pat || !projectRef || !sqlPath) {
  console.error("Usage: node apply-migrations.mjs <PAT> <project-ref> <sql-file>");
  process.exit(1);
}

const sql = await fs.readFile(path.resolve(sqlPath), "utf8");
console.log(`Applying ${sql.length} bytes of SQL to project ${projectRef}…`);

const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  },
);

const text = await res.text();
console.log("HTTP", res.status);
console.log(text.slice(0, 4000));
process.exit(res.ok ? 0 : 1);
