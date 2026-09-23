// Edge Function: send-push
// Beauty Space — Envío firmado VAPID de notificaciones Web Push
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "BNkk-OSQz2ATOipBVqSpnaYJi9NCpGu7NdNOkzu_YwowR238nMff7JxoDVWM_rtjkGK3VZcoDbPX3YbEbd9pmqQ";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "EQ-uwUefO8zkyVpul0kXNux3-MXkTJiLGgOX4OAVcXQ";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:soporte@beautyspace.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const bodyJson = await req.json().catch(() => ({}));
    const { user_id, endpoint, title, body, url, tag } = bodyJson;

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title and body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Consulta de suscripciones activas
    let query = supabase.from("push_subscriptions").select("*");
    if (endpoint) {
      query = query.eq("endpoint", endpoint);
    } else if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: subscriptions, error: fetchErr } = await query;
    if (fetchErr) {
      throw fetchErr;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active push subscriptions found", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      url: url || "/",
      tag: tag || "beauty-space",
      timestamp: Date.now(),
    });

    let sentCount = 0;
    let failedCount = 0;
    const expiredEndpoints: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub: any) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth_key,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          sentCount++;
        } catch (err: any) {
          failedCount++;
          // Si el endpoint ya no existe (404) o expiró (410 Gone), registrarlo para borrar
          if (err.statusCode === 410 || err.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint);
          } else {
            console.error(`Error enviando push a ${sub.endpoint}:`, err);
          }
        }
      })
    );

    // Limpieza de endpoints obsoletos / desinstalados
    if (expiredEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        cleaned: expiredEndpoints.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("send-push error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
