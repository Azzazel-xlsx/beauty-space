import { supabase } from '../lib/supabaseClient';

export interface PushSubscriptionState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  endpoint?: string;
  error?: string | null;
}

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BNkk-OSQz2ATOipBVqSpnaYJi9NCpGu7NdNOkzu_YwowR238nMff7JxoDVWM_rtjkGK3VZcoDbPX3YbEbd9pmqQ';

/**
 * Convierte la clave pública VAPID en Base64 URL-safe a Uint8Array
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Dispositivo web';
  const ua = navigator.userAgent;
  let device = 'Navegador Web';
  if (/Android/i.test(ua)) device = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) device = 'iOS';
  else if (/Macintosh/i.test(ua)) device = 'Mac';
  else if (/Windows/i.test(ua)) device = 'Windows';
  return `${device} (${navigator.language || 'es'})`;
}

export const pushService = {
  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  },

  getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  },

  async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) return null;
    try {
      // Registra el service worker si aún no está activo
      await navigator.serviceWorker.register('/sw.js');
      return await navigator.serviceWorker.ready;
    } catch (err) {
      console.error('Error obteniendo Service Worker:', err);
      return null;
    }
  },

  async getSubscription(): Promise<PushSubscription | null> {
    const reg = await this.getRegistration();
    if (!reg) return null;
    try {
      return await reg.pushManager.getSubscription();
    } catch (err) {
      console.error('Error leyendo suscripción push:', err);
      return null;
    }
  },

  async subscribe(): Promise<PushSubscription> {
    if (!this.isSupported()) {
      throw new Error('Las notificaciones push no son compatibles con este navegador o dispositivo.');
    }

    // 1. Solicitar permiso al usuario
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Permiso de notificaciones denegado por el usuario o navegador.');
    }

    // 2. Obtener el service worker listo
    const reg = await this.getRegistration();
    if (!reg) {
      throw new Error('No se pudo inicializar el Service Worker en este dispositivo.');
    }

    // 3. Suscribirse a PushManager con la clave VAPID
    const convertedKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    // 4. Guardar las credenciales en Supabase push_subscriptions
    const subJson = subscription.toJSON();
    if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
      throw new Error('No se obtuvieron las claves criptográficas de la suscripción.');
    }

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;

    if (userId) {
      const { error: dbError } = await supabase.from('push_subscriptions').upsert({
        user_id: userId,
        endpoint: subJson.endpoint,
        p256dh: subJson.keys.p256dh,
        auth_key: subJson.keys.auth,
        device_label: getDeviceLabel()
      }, { onConflict: 'endpoint' });

      if (dbError) {
        console.warn('Advertencia guardando en push_subscriptions:', dbError.message);
      }
    }

    return subscription;
  },

  async unsubscribe(): Promise<boolean> {
    try {
      const reg = await this.getRegistration();
      if (!reg) return false;

      const subscription = await reg.pushManager.getSubscription();
      if (!subscription) return true;

      const endpoint = subscription.endpoint;
      const unsubscribed = await subscription.unsubscribe();

      // Borrar de la base de datos Supabase
      try {
        await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint);
      } catch (err) {
        console.warn('Error eliminando suscripción en Supabase:', err);
      }

      return unsubscribed;
    } catch (err) {
      console.error('Error al desuscribirse de push:', err);
      throw err;
    }
  },

  async sendTestNotification(): Promise<{ via: 'edge-function' | 'local'; success: boolean }> {
    const reg = await this.getRegistration();
    if (!reg) throw new Error('Service Worker no activo.');

    // Intenta enviar mediante la Edge Function send-push de Supabase
    try {
      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          user_id: userId,
          title: '🌸 Beauty Space — Prueba Exitosa',
          body: '¡Las notificaciones en segundo plano están activas y listas para avisarte de tus citas!',
          url: '/'
        })
      });

      if (response.ok) {
        return { via: 'edge-function', success: true };
      }
    } catch {
      // Si la Edge Function aún no está desplegada en el cloud, emitir notificación local de prueba
    }

    // Fallback: Probar directamente en el Service Worker del navegador
    const localOptions: any = {
      body: '¡Notificaciones activas en este dispositivo! Recibirás avisos de citas próximas y cambios.',
      icon: '/favicon.png',
      badge: '/favicon.png',
      vibrate: [100, 50, 100],
      data: { url: '/' }
    };
    await reg.showNotification('🌸 Beauty Space — Prueba Local', localOptions);

    return { via: 'local', success: true };
  }
};
