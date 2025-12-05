"use client";

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY; // DEV ONLY if you must

if (!supabaseUrl || !supabaseKey) {
  // This will show in the browser console if env vars are missing
  console.error("Missing Supabase env vars. Check .env.local.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
