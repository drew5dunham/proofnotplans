import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  console.log("[PUSH_DEBUG] register-ios-push-token called, method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authenticate caller ---
    const authHeader = req.headers.get("Authorization");
    console.log("[PUSH_DEBUG] Authorization header present:", !!authHeader);

    if (!authHeader?.startsWith("Bearer ")) {
      console.error("[PUSH_DEBUG] Missing or invalid Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await anonClient.auth.getUser(jwt);

    if (userError || !userData?.user) {
      console.error("[PUSH_DEBUG] Auth getUser failed:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    console.log("[PUSH_DEBUG] Authenticated user:", userId);

    // --- Validate body ---
    const body = await req.json();
    const deviceToken = body?.token;

    console.log("[PUSH_DEBUG] Token present:", !!deviceToken, "length:", deviceToken?.length ?? 0);

    if (!deviceToken || typeof deviceToken !== "string" || !deviceToken.trim()) {
      console.error("[PUSH_DEBUG] Invalid or missing token in body");
      return new Response(
        JSON.stringify({ error: "Missing or empty token" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      "[PUSH_DEBUG] Upserting token for user",
      userId,
      "token prefix:",
      deviceToken.substring(0, 12)
    );

    // --- Upsert with service-role client (bypasses RLS) ---
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: upsertError } = await serviceClient
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: `apns:${deviceToken}`,
          device_token: deviceToken,
          platform: "ios",
          p256dh: "",
          auth: "",
        },
        { onConflict: "user_id,endpoint,platform" }
      );

    if (upsertError) {
      console.error(
        "[PUSH_DEBUG] Upsert FAILED:",
        upsertError.message,
        upsertError.details
      );
      return new Response(
        JSON.stringify({ error: "Failed to save token", details: upsertError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[PUSH_DEBUG] Upsert SUCCESS for user", userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[PUSH_DEBUG] Unexpected error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
