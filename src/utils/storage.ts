/**
 * Safe LocalStorage Utility
 * Guards against QuotaExceededError, SecurityError (incognito/restricted mode),
 * and JSON serialization crashes.
 */

export interface StorageResult {
  success: boolean;
  error?: string;
  isQuotaExceeded?: boolean;
}

/**
 * Safely writes a key-value pair to localStorage.
 * Catches QuotaExceededError and SecurityError gracefully.
 */
export function safeSetItem(key: string, value: string): StorageResult {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { success: false, error: 'LocalStorage no está disponible en este entorno.' };
    }
    localStorage.setItem(key, value);
    return { success: true };
  } catch (err: unknown) {
    const error = err as DOMException;
    const isQuota =
      error?.name === 'QuotaExceededError' ||
      error?.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error?.code === 22 ||
      error?.code === 1014;

    console.warn(`[SafeStorage] Error al escribir en localStorage clave "${key}":`, error?.message || err);
    return {
      success: false,
      error: error?.message || 'Error desconocido al guardar en almacenamiento local.',
      isQuotaExceeded: isQuota
    };
  }
}

/**
 * Safely writes an object to localStorage by serializing it to JSON.
 */
export function safeSetJson<T>(key: string, data: T): StorageResult {
  try {
    const serialized = JSON.stringify(data);
    return safeSetItem(key, serialized);
  } catch (err: unknown) {
    console.error(`[SafeStorage] Error serializando a JSON clave "${key}":`, err);
    return {
      success: false,
      error: 'Error al serializar los datos para almacenamiento.'
    };
  }
}

/**
 * Safely reads a string from localStorage.
 */
export function safeGetItem(key: string): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[SafeStorage] Error al leer localStorage clave "${key}":`, err);
    return null;
  }
}

/**
 * Safely reads and parses a JSON object from localStorage with fallback.
 */
export function safeGetJson<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[SafeStorage] JSON corrupto o inválido en clave "${key}". Usando valor inicial:`, err);
    return fallback;
  }
}

/**
 * Safely removes an item from localStorage.
 */
export function safeRemoveItem(key: string): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`[SafeStorage] Error eliminando clave "${key}":`, err);
    return false;
  }
}
