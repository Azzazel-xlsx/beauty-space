import { useState, useEffect, useCallback } from 'react';
import { pushService } from '../services/pushService';

export function usePushSubscription() {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Inicializar estado del Service Worker y suscripción actual
  const checkStatus = useCallback(async () => {
    try {
      const supported = pushService.isSupported();
      setIsSupported(supported);
      if (!supported) {
        setLoading(false);
        return;
      }

      setPermission(pushService.getPermission());

      const sub = await pushService.getSubscription();
      setIsSubscribed(!!sub);
    } catch (err: any) {
      setError(err?.message || 'Error verificando suscripción push');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const subscribe = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await pushService.subscribe();
      setIsSubscribed(true);
      setPermission(pushService.getPermission());
      return true;
    } catch (err: any) {
      const msg = err?.message || 'No se pudo activar las notificaciones push';
      setError(msg);
      setPermission(pushService.getPermission());
      setIsSubscribed(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await pushService.unsubscribe();
      setIsSubscribed(false);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Error desactivando las notificaciones');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async (): Promise<{ via: string; success: boolean }> => {
    setError(null);
    try {
      return await pushService.sendTestNotification();
    } catch (err: any) {
      setError(err?.message || 'Error enviando notificación de prueba');
      throw err;
    }
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    loading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
    refreshStatus: checkStatus
  };
}
