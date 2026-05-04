// Run a single SQL query via the Supabase Management API. Useful for ad-hoc
// state checks during install/migration debugging.
//
// Usage: node sql.mjs <PAT> <project-ref> "<sql>"

const [, , pat, projectRef, query] = process.argv;
const res = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
  {
    method: "POST",
    headers: { Authorization: `Bearer ${pat}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  },
);
console.log("HTTP", res.status);
console.log(await res.text());
