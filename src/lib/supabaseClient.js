// src/lib/supabaseClient.js

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

// BAD PRACTICE: exposing service role key via NEXT_PUBLIC_
const supabaseServiceRoleKey =
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// (Optional) still keep anon key around to compare good vs bad later
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Helpful logs so you can talk about this in your write-up
if (!supabaseUrl) {
  console.warn(
    "[Supabase] NEXT_PUBLIC_SUPABASE_URL is not set. " +
      "Client will be null. Check your .env.local."
  );
}

if (!supabaseServiceRoleKey) {
  console.warn(
    "[Supabase] NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY is not set. " +
      "For this DEMO we expect the service role key in the browser, " +
      "which is insecure in real applications."
  );
}

// For this assignment, we *intentionally* use the service role key
// instead of the anon key.
export const supabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;



