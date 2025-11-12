"use client";

import { createPagesBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/supabase";

export const supabase = createPagesBrowserClient<Database>();
