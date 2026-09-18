/**
 * Backup and Data Preservation Engine for Beauty Space
 * Generates portable JSON snapshots and restores them safely into the system.
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
    imagesCount?: number;
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
 * Validates the schema and structure of an uploaded JSON backup before attempting restore
 */
export function validateBackupPayload(rawJson: string): BackupValidationResult {
  try {
    const parsed = JSON.parse(rawJson);

    if (!parsed || typeof parsed !== 'object') {
      return { valid: false, error: 'El archivo no contiene un objeto JSON válido.' };
    }

    if (!parsed.payload || typeof parsed.payload !== 'object') {
      return { valid: false, error: 'Estructura inválida: Falta la sección "payload" requerida.' };
    }

    const { clients, services, appointments, movements } = parsed.payload;

    if (!Array.isArray(clients)) {
      return { valid: false, error: 'Estructura inválida: "payload.clients" debe ser un arreglo.' };
    }
    if (!Array.isArray(services)) {
      return { valid: false, error: 'Estructura inválida: "payload.services" debe ser un arreglo.' };
    }
    if (!Array.isArray(appointments)) {
      return { valid: false, error: 'Estructura inválida: "payload.appointments" debe ser un arreglo.' };
    }
    if (!Array.isArray(movements)) {
      return { valid: false, error: 'Estructura inválida: "payload.movements" debe ser un arreglo.' };
    }

    const backupData: CompleteBackupData = {
      schemaVersion: '1.0',
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
 * Downloads a backup snapshot file
 */
export function downloadBackupSnapshot(backup: CompleteBackupData): void {
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `beauty-space-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
