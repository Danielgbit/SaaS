import { supabaseServer as supabaseAdmin } from "../supabase/server";


export async function authTenant (tenantId: string) {
    const { data } = await supabaseAdmin
        .from("tenants")
        .select("*")
        .eq("id", tenantId)

    console.log(data);
    
    
}