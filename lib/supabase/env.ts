const LOCAL_SUPABASE_URL = "http://127.0.0.1:54321";

function requireValue(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is required.`);
  }
  return value;
}

export function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? LOCAL_SUPABASE_URL;
}

export function getSupabasePublishableKey() {
  return requireValue(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function hasSupabasePublishableKey() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
