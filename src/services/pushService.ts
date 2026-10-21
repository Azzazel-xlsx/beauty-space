import { supabase } from '../lib/supabaseClient';

export interface PushSubscriptionState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  endpoint?: string;
  error?: string | null;
}

export interface PushDiagnostics {
  timestamp: string;
  isSecureContext: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  isPushSupported: boolean;
  notificationPermission: NotificationPermission;
  vapidKey: {
    isConfigured: boolean;
    keyPreview: string;
    rawLength: number;
    byteLength: number | null;
    isValidFormat: boolean;
    error?: string;
  };
  serviceWorker: {
    isRegistered: boolean;
    state: string | null;
    scope: string | null;
    scriptURL: string | null;
  };
  subscription: {
    isSubscribed: boolean;
    endpoint: string | null;
    endpointDomain: string | null;
    hasP256dh: boolean;
    hasAuth: boolean;
  };
  environment: {
    userAgent: string;
    isBrave: boolean;
    isIncognitoEstimate: boolean;
  };
  logs: string[];
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
    let subscription: PushSubscription | null = null;

    try {
      subscription = await reg.pushManager.getSubscription();
    } catch {
      subscription = null;
    }

    if (!subscription) {
      try {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedKey
        });
      } catch (err: any) {
        console.warn('Primer intento de suscripción falló, intentando limpieza:', err);
        // Si falló por push service error o conflicto, limpiar cualquier suscripción residual
        try {
          const existing = await reg.pushManager.getSubscription();
          if (existing) {
            await existing.unsubscribe();
          }
          // Reintentar suscripción limpia
          subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedKey
          });
        } catch (retryErr: any) {
          const errMsg = retryErr?.message || err?.message || '';
          if (errMsg.includes('push service error') || retryErr?.name === 'AbortError') {
            throw new Error(
              'Error del servicio Push en esta PC: Esto ocurre si estás en Modo Incógnito/Privado, si usas Brave (debes activar "Usar servicios de Google para mensajería push" en brave://settings/privacy), o si un antivirus/bloqueador impide la conexión con los servidores de notificaciones.'
            );
          }
          throw new Error(`No se pudo registrar el servicio push: ${errMsg}`);
        }
      }
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
  },

  async requestPermissionOnly(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return await Notification.requestPermission();
  },

  async runDiagnostics(): Promise<PushDiagnostics> {
    const logs: string[] = [];
    const now = new Date().toLocaleTimeString('es', { hour12: false });
    logs.push(`[${now}] Iniciando diagnóstico de entorno y Web Push...`);

    const isSecureContext = typeof window !== 'undefined' ? Boolean(window.isSecureContext) : false;
    logs.push(`[${now}] Contexto seguro (HTTPS / Localhost): ${isSecureContext ? 'SÍ ✅' : 'NO ❌ (Requerido para Service Worker y Push)'}`);

    const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
    logs.push(`[${now}] Soporte Service Worker: ${hasServiceWorker ? 'Disponible ✅' : 'No disponible ❌'}`);

    const hasPushManager = typeof window !== 'undefined' && 'PushManager' in window;
    logs.push(`[${now}] Soporte PushManager API: ${hasPushManager ? 'Disponible ✅' : 'No disponible ❌'}`);

    const hasNotification = typeof window !== 'undefined' && 'Notification' in window;
    logs.push(`[${now}] Soporte Notification API: ${hasNotification ? 'Disponible ✅' : 'No disponible ❌'}`);

    const isPushSupported = isSecureContext && hasServiceWorker && hasPushManager && hasNotification;

    const notificationPermission: NotificationPermission = hasNotification
      ? Notification.permission
      : 'denied';
    logs.push(`[${now}] Permiso del navegador: "${notificationPermission}" ${
      notificationPermission === 'granted'
        ? '✅ Concedido'
        : notificationPermission === 'denied'
        ? '❌ Bloqueado en opciones de sitio'
        : '⚠️ Pendiente de autorización'
    }`);

    // Verificación de clave pública VAPID
    let vapidByteLength: number | null = null;
    let isVapidValid = false;
    let vapidError: string | undefined = undefined;

    try {
      if (VAPID_PUBLIC_KEY && VAPID_PUBLIC_KEY.length > 20) {
        const u8 = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        vapidByteLength = u8.length;
        // Las claves públicas VAPID son claves P-256 no comprimidas (65 bytes)
        isVapidValid = vapidByteLength === 65;
        if (isVapidValid) {
          logs.push(`[${now}] Clave VAPID pública: Válida ✅ (${vapidByteLength} bytes decodificados P-256)`);
        } else {
          logs.push(`[${now}] Clave VAPID pública: Longitud atípica (${vapidByteLength} bytes, esperado 65) ⚠️`);
        }
      } else {
        vapidError = 'Clave VAPID ausente o demasiado corta';
        logs.push(`[${now}] Clave VAPID pública: NO CONFIGURADA ❌`);
      }
    } catch (err: any) {
      vapidError = err?.message || 'Error decodificando clave VAPID';
      logs.push(`[${now}] Error al analizar clave VAPID: ${vapidError} ❌`);
    }

    const vapidKeyPreview = VAPID_PUBLIC_KEY
      ? `${VAPID_PUBLIC_KEY.slice(0, 10)}...${VAPID_PUBLIC_KEY.slice(-8)}`
      : 'No configurada';

    // Verificación de Service Worker
    let swRegistered = false;
    let swState: string | null = null;
    let swScope: string | null = null;
    let swScriptURL: string | null = null;

    if (hasServiceWorker) {
      try {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js');
        if (reg) {
          swRegistered = true;
          swScope = reg.scope;
          const activeWorker = reg.active || reg.installing || reg.waiting;
          swState = activeWorker ? activeWorker.state : 'registrado';
          swScriptURL = activeWorker ? activeWorker.scriptURL : null;
          logs.push(`[${now}] Service Worker registrado: SÍ ✅ (Estado: ${swState}, Scope: ${swScope})`);
        } else {
          logs.push(`[${now}] Service Worker (/sw.js): Aún no registrado en este navegador ⚠️`);
        }
      } catch (swErr: any) {
        logs.push(`[${now}] Error consultando Service Worker: ${swErr?.message} ❌`);
      }
    }

    // Verificación de Suscripción Push
    let isSubscribed = false;
    let endpoint: string | null = null;
    let endpointDomain: string | null = null;
    let hasP256dh = false;
    let hasAuth = false;

    if (hasServiceWorker && hasPushManager) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            isSubscribed = true;
            endpoint = sub.endpoint;
            try {
              endpointDomain = new URL(sub.endpoint).hostname;
            } catch {
              endpointDomain = 'Desconocido';
            }
            const rawJson = sub.toJSON();
            hasP256dh = Boolean(rawJson.keys?.p256dh);
            hasAuth = Boolean(rawJson.keys?.auth);
            logs.push(`[${now}] Suscripción push activa: SÍ ✅ (Servidor: ${endpointDomain})`);
          } else {
            logs.push(`[${now}] Suscripción push: Inactiva en este navegador.`);
          }
        }
      } catch (subErr: any) {
        logs.push(`[${now}] Error leyendo suscripción: ${subErr?.message} ❌`);
      }
    }

    // Entorno del Navegador
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isBrave = typeof navigator !== 'undefined' && Boolean((navigator as any).brave);
    if (isBrave) {
      logs.push(`[${now}] Navegador Brave detectado: Requiere activar 'Usar servicios de Google para mensajería push' en brave://settings/privacy.`);
    }

    let isIncognitoEstimate = false;
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const est = await navigator.storage.estimate();
        // En modo incógnito Chromium suele fijar una cuota reducida
        if (est.quota && est.quota < 120000000) {
          isIncognitoEstimate = true;
          logs.push(`[${now}] Advertencia: Es probable que la ventana esté en Modo Incógnito/Privado (cuota reducida: ${Math.round(est.quota / (1024 * 1024))} MB). Las notificaciones Push fallan en incógnito.`);
        }
      }
    } catch {
      // Ignorar error de cuota
    }

    logs.push(`[${now}] Diagnóstico completado.`);

    return {
      timestamp: new Date().toISOString(),
      isSecureContext,
      hasServiceWorker,
      hasPushManager,
      hasNotification,
      isPushSupported,
      notificationPermission,
      vapidKey: {
        isConfigured: Boolean(VAPID_PUBLIC_KEY),
        keyPreview: vapidKeyPreview,
        rawLength: VAPID_PUBLIC_KEY.length,
        byteLength: vapidByteLength,
        isValidFormat: isVapidValid,
        error: vapidError
      },
      serviceWorker: {
        isRegistered: swRegistered,
        state: swState,
        scope: swScope,
        scriptURL: swScriptURL
      },
      subscription: {
        isSubscribed,
        endpoint,
        endpointDomain,
        hasP256dh,
        hasAuth
      },
      environment: {
        userAgent,
        isBrave,
        isIncognitoEstimate
      },
      logs
    };
  }
};
