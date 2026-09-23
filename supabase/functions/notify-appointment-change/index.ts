// Edge Function: notify-appointment-change
// Beauty Space — Notificación inmediata ante cancelaciones y reprogramaciones de citas
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const bodyJson = await req.json().catch(() => ({}));

    // Soporta tanto Webhook de Supabase ({ record: ... }) como llamada directa
    const event = bodyJson.record || bodyJson;

    let eventsToProcess = [];

    if (event && event.change_type) {
      eventsToProcess = [event];
    } else {
      // Si se invoca sin payload específico, procesa los eventos pendientes
      const { data: pendingEvents, error: err } = await supabase
        .from("appointment_change_events")
        .select("*")
        .eq("processed", false)
        .order("created_at", { ascending: true })
        .limit(20);

      if (err) throw err;
      eventsToProcess = pendingEvents || [];
    }

    let processedCount = 0;

    for (const ev of eventsToProcess) {
      const clientName = ev.client_name || "Clienta";
      const serviceName = ev.service_name || "Servicio";
      let title = "Actualización de Cita";
      let body = "";

      if (ev.change_type === "cancelled") {
        title = "🚫 Cita Cancelada";
        body = `La cita de ${clientName} (${serviceName}) de las ${ev.old_time || ""} fue cancelada.`;
      } else if (ev.change_type === "rescheduled") {
        title = "📅 Cita Reprogramada";
        const newDate = ev.new_date || "";
        const newTime = ev.new_time || "";
        body = `La cita de ${clientName} (${serviceName}) fue movida al ${newDate} a las ${newTime}.`;
      }

      if (body) {
        // Enviar notificación a través de la Edge Function send-push
        await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            title,
            body,
            url: "/?tab=agenda",
            tag: `change-${ev.appointment_id || Date.now()}`
          })
        }).catch((err) => console.error("Error invoking send-push:", err));

        // Marcar como procesado si tiene ID en la base de datos
        if (ev.id) {
          await supabase
            .from("appointment_change_events")
            .update({ processed: true })
            .eq("id", ev.id);
        }
        processedCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processedCount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("notify-appointment-change error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
