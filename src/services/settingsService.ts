import { AdminProfile } from '../types';
import { safeGetJson, safeSetJson } from '../utils/storage';

const CATEGORIES_KEY = 'bs_categories';
const PAYMENT_METHODS_KEY = 'bs_payment_methods';
const ADMIN_PROFILE_KEY = 'bs_admin_profile';

const DEFAULT_CATEGORIES = [
  'Suministros & Esmaltes',
  'Mantenimiento Equipo',
  'Publicidad & RRSS',
  'Alquiler & Expensas',
  'Insumos Descartables',
];

const DEFAULT_PAYMENT_METHODS = ['TRANSFERENCIA', 'EFECTIVO', 'TARJETA'];

const DEFAULT_ADMIN_PROFILE: AdminProfile = {
  name: 'Administradora',
  photoUrl: '',
};

/**
 * Servicio de Configuración y Ajustes (Capa de abstracción de datos)
 */
export const settingsService = {
  async getCategories(): Promise<string[]> {
    return safeGetJson<string[]>(CATEGORIES_KEY, DEFAULT_CATEGORIES);
  },

  async saveCategories(categories: string[]): Promise<void> {
    safeSetJson(CATEGORIES_KEY, categories);
  },

  async getPaymentMethods(): Promise<string[]> {
    return safeGetJson<string[]>(PAYMENT_METHODS_KEY, DEFAULT_PAYMENT_METHODS);
  },

  async savePaymentMethods(methods: string[]): Promise<void> {
    safeSetJson(PAYMENT_METHODS_KEY, methods);
  },

  async getAdminProfile(): Promise<AdminProfile> {
    return safeGetJson<AdminProfile>(ADMIN_PROFILE_KEY, DEFAULT_ADMIN_PROFILE);
  },

  async saveAdminProfile(profile: AdminProfile): Promise<void> {
    safeSetJson(ADMIN_PROFILE_KEY, profile);
  },
};
