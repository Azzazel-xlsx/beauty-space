// Edge Function: check-upcoming-appointments
// Beauty Space — Chequeo periódico (pg_cron cada 5 min) de citas próximas a 1 hora
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
    const now = new Date();

    // Filtramos citas activas de hoy y mañana que no tengan reminder_sent_at
    const todayStr = now.toISOString().split("T")[0];
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("id, date, time, duration, status, client_id, service_id, reminder_sent_at, clients(name), services(name)")
      .in("status", ["pending", "confirmada"])
      .is("reminder_sent_at", null)
      .gte("date", todayStr)
      .lte("date", tomorrowStr);

    if (apptError) {
      throw apptError;
    }

    const notified: string[] = [];

    if (appointments && appointments.length > 0) {
      for (const appt of appointments) {
        // Parsear fecha y hora de la cita
        const [year, month, day] = appt.date.split("-").map(Number);
        const [hours, minutes] = appt.time.split(":").map(Number);
        const apptDate = new Date(year, month - 1, day, hours, minutes);

        const diffMs = apptDate.getTime() - now.getTime();
        const diffMinutes = diffMs / (1000 * 60);

        // Ventana de recordatorio: entre 55 y 65 minutos antes de la cita (1 hora antes)
        if (diffMinutes >= 55 && diffMinutes <= 65) {
          const clientName = (appt.clients as any)?.name || "Clienta";
          const serviceName = (appt.services as any)?.name || "Servicio";

          const pushBody = {
            title: "⏰ Cita próxima en 1 hora",
            body: `Cita con ${clientName} (${serviceName}) programada para las ${appt.time}.`,
            url: "/?tab=agenda",
            tag: `reminder-${appt.id}`
          };

          // Invocación a send-push
          await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify(pushBody)
          }).catch((err) => console.error("Error invoking send-push:", err));

          // Marcar reminder_sent_at para evitar duplicados
          await supabase
            .from("appointments")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", appt.id);

          notified.push(appt.id);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkedCount: appointments?.length || 0,
        notifiedCount: notified.length,
        notifiedAppointmentIds: notified
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("check-upcoming-appointments error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
