/**
 * IndexedDB storage utility for Beauty Space
 * Used for storing high-resolution image blobs and photography evidence
 * preventing localStorage quota exhaustion (5MB limit).
 * 
 * ---------------------------------------------------------------------------
 * PLAN TÉCNICO DE MIGRACIÓN A SUPABASE STORAGE (FUTURA FASE):
 * ---------------------------------------------------------------------------
 * Actualmente, las fotos de clientas y avatar de admin se guardan localmente
 * como DataURLs en IndexedDB (y transitoriamente en localStorage si falla).
 * 
 * Durante la fase de migración a Supabase:
 * 1. Crear un Bucket público o semi-privado en Supabase Storage (ej. `salon-media` o `avatars`).
 * 2. Convertir los blobs/DataURLs a File/Blob y subirlos mediante:
 *      `supabase.storage.from('salon-media').upload(`${path}/${id}.webp`, blob, { upsert: true })`
 * 3. Obtener la URL pública persistente:
 *      `const { data } = supabase.storage.from('salon-media').getPublicUrl(path);`
 * 4. Almacenar exclusivamente dicha URL como cadena (`photo_url text`) en las tablas
 *    de PostgreSQL (`clients`, `admin_profile`), eliminando la necesidad de persistir
 *    pesados strings base64 o depender de IndexedDB del navegador.
 * ---------------------------------------------------------------------------
 */

const DB_NAME = 'beauty_space_storage';
const DB_VERSION = 1;
const STORE_NAME = 'images_store';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no está disponible en este entorno.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(new Error('Error al abrir IndexedDB'));
    };
  });
}

export async function saveImageToIndexedDB(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({ id, dataUrl, updatedAt: Date.now() });

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] No se pudo guardar imagen en IndexedDB:', err);
  }
}

export async function getImageFromIndexedDB(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        if (req.result && req.result.dataUrl) {
          resolve(req.result.dataUrl);
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] No se pudo leer imagen de IndexedDB:', err);
    return null;
  }
}

export async function deleteImageFromIndexedDB(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] No se pudo eliminar imagen de IndexedDB:', err);
  }
}

export async function getAllImagesFromIndexedDB(): Promise<Record<string, string>> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const result: Record<string, string> = {};
        const items = req.result as Array<{ id: string; dataUrl: string }>;
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item && item.id && item.dataUrl) {
              result[item.id] = item.dataUrl;
            }
          }
        }
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] No se pudieron obtener imágenes:', err);
    return {};
  }
}

export async function bulkSaveImagesToIndexedDB(records: Record<string, string>): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      for (const [id, dataUrl] of Object.entries(records)) {
        if (id && dataUrl) {
          store.put({ id, dataUrl, updatedAt: Date.now() });
        }
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Error en guardado masivo en IndexedDB:', err);
  }
}

export async function clearIndexedDBImages(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();

      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[IndexedDB] Error al vaciar IndexedDB:', err);
  }
}
