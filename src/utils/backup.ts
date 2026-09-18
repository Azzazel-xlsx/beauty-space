/**
 * Backup and Data Preservation Engine for Beauty Space
 * Mitigates data loss risk by generating full portable JSON snapshots
 * and restoring them with schema validation.
 */

import {
  Client,
  Service,
  SpecialPrice,
  Appointment,
  FinancialMovement,
  PriceChangeEvent,
  AdminProfile
} from '../types';
import { getAllImagesFromIndexedDB, bulkSaveImagesToIndexedDB } from './indexedDb';
import { safeSetJson } from './storage';

export interface CompleteBackupData {
  schemaVersion: '1.0';
  exportedAt: string;
  app: 'Beauty Space' | 'Beauty Space Studio';
  summary: {
    clientsCount: number;
    appointmentsCount: number;
    movementsCount: number;
    servicesCount: number;
    specialPricesCount: number;
    imagesCount: number;
  };
  payload: {
    clients: Client[];
    services: Service[];
    specialPrices: SpecialPrice[];
    appointments: Appointment[];
    movements: FinancialMovement[];
    priceChanges: PriceChangeEvent[];
    categories: string[];
    paymentMethods: string[];
    adminProfile?: AdminProfile;
    images?: Record<string, string>;
  };
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  backupData?: CompleteBackupData;
}

/**
 * Computes rough estimate of current localStorage consumption in KB and MB
 */
export function getStorageMetrics(): {
  usedKb: number;
  usedMb: number;
  percentageOf5Mb: number;
} {
  let totalChars = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const val = localStorage.getItem(key) || '';
        totalChars += key.length + val.length;
      }
    }
  } catch {
    // ignore
  }

  // In UTF-16 strings, 1 char ≈ 2 bytes
  const bytes = totalChars * 2;
  const usedKb = Math.round((bytes / 1024) * 10) / 10;
  const usedMb = Math.round((bytes / (1024 * 1024)) * 100) / 100;
  const percentageOf5Mb = Math.min(Math.round((bytes / (5 * 1024 * 1024)) * 100), 100);

  return { usedKb, usedMb, percentageOf5Mb };
}

/**
 * Gathers all active state slices and IndexedDB images into a single downloadable JSON backup
 */
export async function generateCompleteBackup(): Promise<CompleteBackupData> {
  const parseSlice = <T>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch {
      return fallback;
    }
  };

  const clients = parseSlice<Client[]>('bs_clients', []);
  const services = parseSlice<Service[]>('bs_services', []);
  const specialPrices = parseSlice<SpecialPrice[]>('bs_special_prices', []);
  const appointments = parseSlice<Appointment[]>('bs_appointments', []);
  const movements = parseSlice<FinancialMovement[]>('bs_movements', []);
  const priceChanges = parseSlice<PriceChangeEvent[]>('bs_price_changes', []);
  const categories = parseSlice<string[]>('bs_categories', [
    'Suministros & Esmaltes',
    'Mantenimiento Equipo',
    'Publicidad & RRSS',
    'Alquiler & Expensas',
    'Insumos Descartables'
  ]);
  const paymentMethods = parseSlice<string[]>('bs_payment_methods', ['TRANSFERENCIA', 'EFECTIVO', 'TARJETA']);
  const adminProfile = parseSlice<AdminProfile | undefined>('bs_admin_profile', undefined);

  // Retrieve photography store from IndexedDB
  const images = await getAllImagesFromIndexedDB();
  const imagesCount = Object.keys(images).length;

  const backup: CompleteBackupData = {
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    app: 'Beauty Space',
    summary: {
      clientsCount: clients.length,
      appointmentsCount: appointments.length,
      movementsCount: movements.length,
      servicesCount: services.length,
      specialPricesCount: specialPrices.length,
      imagesCount
    },
    payload: {
      clients,
      services,
      specialPrices,
      appointments,
      movements,
      priceChanges,
      categories,
      paymentMethods,
      adminProfile,
      images
    }
  };

  return backup;
}

/**
 * Triggers browser download of the backup file
 */
export async function downloadBackupFile(): Promise<void> {
  const backup = await generateCompleteBackup();
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const dateTag = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `beauty_space_respaldo_${dateTag}.json`;

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Validates the schema and structure of an uploaded JSON backup before attempting restore
 */
export function validateBackupJson(rawJson: string): BackupValidationResult {
  try {
    const parsed = JSON.parse(rawJson);

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'El archivo no contiene un objeto JSON válido.' };
    }

    if (!parsed.payload || typeof parsed.payload !== 'object') {
      return { valid: false, error: 'Estructura inválida: Falta la sección "payload" de datos.' };
    }

    const { clients, services, appointments, movements } = parsed.payload;

    if (!Array.isArray(clients)) {
      return { valid: false, error: 'Estructura inválida: El listado de clientas no es un arreglo.' };
    }
    if (!Array.isArray(services)) {
      return { valid: false, error: 'Estructura inválida: El listado de servicios no es un arreglo.' };
    }
    if (!Array.isArray(appointments)) {
      return { valid: false, error: 'Estructura inválida: El listado de citas no es un arreglo.' };
    }
    if (!Array.isArray(movements)) {
      return { valid: false, error: 'Estructura inválida: El listado de movimientos no es un arreglo.' };
    }

    // Prepare standardized backup object
    const backupData: CompleteBackupData = {
      schemaVersion: parsed.schemaVersion || '1.0',
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      app: 'Beauty Space',
      summary: {
        clientsCount: clients.length,
        appointmentsCount: appointments.length,
        movementsCount: movements.length,
        servicesCount: services.length,
        specialPricesCount: Array.isArray(parsed.payload.specialPrices) ? parsed.payload.specialPrices.length : 0,
        imagesCount: parsed.payload.images ? Object.keys(parsed.payload.images).length : 0
      },
      payload: {
        clients,
        services,
        specialPrices: Array.isArray(parsed.payload.specialPrices) ? parsed.payload.specialPrices : [],
        appointments,
        movements,
        priceChanges: Array.isArray(parsed.payload.priceChanges) ? parsed.payload.priceChanges : [],
        categories: Array.isArray(parsed.payload.categories)
          ? parsed.payload.categories
          : ['Suministros & Esmaltes', 'Mantenimiento Equipo', 'Publicidad & RRSS'],
        paymentMethods: Array.isArray(parsed.payload.paymentMethods)
          ? parsed.payload.paymentMethods
          : ['TRANSFERENCIA', 'EFECTIVO', 'TARJETA'],
        adminProfile: parsed.payload.adminProfile,
        images: parsed.payload.images || {}
      }
    };

    return { valid: true, backupData };
  } catch (err: any) {
    return { valid: false, error: `Error de sintaxis JSON: ${err?.message || 'Archivo corrupto'}` };
  }
}

/**
 * Restores a validated backup into localStorage and IndexedDB
 */
export async function applyRestoreBackup(backup: CompleteBackupData): Promise<void> {
  const {
    clients,
    services,
    specialPrices,
    appointments,
    movements,
    priceChanges,
    categories,
    paymentMethods,
    adminProfile,
    images
  } = backup.payload;

  // 1. Restore IndexedDB images first
  if (images && Object.keys(images).length > 0) {
    await bulkSaveImagesToIndexedDB(images);
  }

  // 2. Safely store each slice in localStorage
  safeSetJson('bs_clients', clients);
  safeSetJson('bs_services', services);
  safeSetJson('bs_special_prices', specialPrices);
  safeSetJson('bs_appointments', appointments);
  safeSetJson('bs_movements', movements);
  safeSetJson('bs_price_changes', priceChanges);
  safeSetJson('bs_categories', categories);
  safeSetJson('bs_payment_methods', paymentMethods);

  if (adminProfile) {
    safeSetJson('bs_admin_profile', adminProfile);
  }
}
