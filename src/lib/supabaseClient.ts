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

let clientInstance: SupabaseClient | null = null;

/**
 * Obtiene o inicializa la instancia del cliente Supabase.
 * Lanza un error descriptivo si se intenta realizar una llamada sin haber configurado
 * `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en el archivo `.env`.
 */
export const getSupabase = (): SupabaseClient => {
  if (!clientInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        '[Beauty Space] Faltan las variables de entorno de Supabase.\n' +
        'Por favor define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env.\n' +
        'Consulta .env.example para ver la plantilla de configuración.'
      );
    }

    if (!isSupabaseConfigured()) {
      console.warn(
        '[Beauty Space] VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY contienen valores de ejemplo/placeholder.\n' +
        'Configura credenciales reales de tu proyecto Supabase en .env para habilitar sincronización en la nube.'
      );
    }

    // Inicializar cliente con opciones estándar
    clientInstance = createClient(
      supabaseUrl || 'https://placeholder.supabase.co',
      supabaseAnonKey || 'placeholder-anon-key',
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
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
