"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

/**
 * This is just a starter component.
 * You will:
 *  - Copy your existing HTML from index.html into the JSX below
 *  - Gradually move logic from main.js into React hooks,
 *    OR attach your old script in useEffect for a quick migration.
 */

export default function HomePage() {
  useEffect(() => {
    console.log("Supabase client is ready:", !!supabase);
    // You can do initial Supabase checks here.
  }, []);

  return (
    <main style={{ padding: "2rem" }}>
      <h1>Gallery (Next.js version)</h1>
      <p>
        Next.js app is running. Now copy your old UI and wire up your Supabase
        logic here.
      </p>

      {/* TODO:
          1. Copy the main layout from your old index.html body here.
          2. Replace direct DOM manipulation with React state & handlers
             OR temporarily load your old main.js as a script.
      */}
    </main>
  );
}
