// Centralized Supabase env access. Throws a useful error message if a required
// var is missing — better than the cryptic "fetch failed" you get when @supabase
// is handed an empty URL.

function required(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local (see .env.example).`,
    );
  }
  return v;
}

export const supabaseUrl = (): string => required("NEXT_PUBLIC_SUPABASE_URL");
export const supabaseAnonKey = (): string => required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
export const supabaseServiceRoleKey = (): string => required("SUPABASE_SERVICE_ROLE_KEY");
