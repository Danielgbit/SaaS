import { Database } from "@/types/supabase";
import { createClient } from "@supabase/supabase-js";

// Este se puede importar en componentes React (frontend)
export const supabaseClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // seguro para el navegador
);
