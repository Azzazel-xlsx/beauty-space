import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Variables de entorno para Supabase (definidas en .env / .env.example)
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Valida si las credenciales de Supabase están configuradas con valores reales.
 */
export const isSupabaseConfigured = (): boolean => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (supabaseUrl.includes('tu-proyecto.supabase.co') || supabaseAnonKey.includes('tu-anon-key')) {
    return false;
  }
  return true;
};

/**
 * Custom fetch wrapper that automatically handles clock skew between Supabase Auth
 * and PostgREST (PGRST303: "JWT issued at future").
 * When a fresh JWT is issued, server container clock drift can cause PostgREST to
 * reject requests for 1-2 seconds. Retrying after a brief pause allows the clock
 * to catch up and the request to succeed transparently.
 */
const fetchWithClockSkewRetry: typeof fetch = async (input, init) => {
  const maxRetries = 3;
  let attempt = 0;

  while (true) {
    attempt++;
    const response = await fetch(input, init);

    // If PostgREST reports clock skew / future JWT
    if (!response.ok && (response.status === 401 || response.status === 400)) {
      try {
        const clone = response.clone();
        const text = await clone.text();
        if (
          text.includes('PGRST303') ||
          text.includes('JWT issued at future') ||
          text.includes('issued at future')
        ) {
          if (attempt <= maxRetries) {
            console.warn(
              `[Supabase] Desfase de reloj detectado (PGRST303: JWT issued at future). Reintentando petición (${attempt}/${maxRetries}) tras esperar sincronización...`
            );
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            continue;
          }
        }
      } catch {
        // Continue with original response if clone fails
      }
    }

    return response;
  }
};

let clientInstance: SupabaseClient | null = null;

/**
 * Obtiene o inicializa la instancia del cliente Supabase.
 * Lanza un error descriptivo si se intenta realizar una llamada sin haber configurado
 * `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el archivo `.env`.
 */
export const getSupabase = (): SupabaseClient => {
  if (!clientInstance) {
    const url = supabaseUrl && !supabaseUrl.includes('tu-proyecto.supabase.co')
      ? supabaseUrl
      : 'https://placeholder.supabase.co';
    const key = supabaseAnonKey && !supabaseAnonKey.includes('tu-anon-key')
      ? supabaseAnonKey
      : 'placeholder-anon-key';

    if (!isSupabaseConfigured()) {
      console.warn(
        '[Beauty Space] VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no están configuradas con valores reales.\n' +
        'Configura credenciales reales de tu proyecto Supabase en .env para habilitar sincronización en la nube.'
      );
    }

    // Inicializar cliente con opciones estándar y tolerancia a desfase horario
    clientInstance = createClient(
      url,
      key,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
        global: {
          fetch: fetchWithClockSkewRetry,
        },
      }
    );
  }

  return clientInstance;
};

/**
 * Instancia exportada por conveniencia.
 * Utiliza Proxy para inicialización bajo demanda (lazy), evitando caídas al importar
 * si aún no se han provisto credenciales de Supabase.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    const value = (client as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
