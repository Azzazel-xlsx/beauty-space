/**
 * Capa de Servicios y Acceso a Datos — Beauty Space
 * 
 * Este módulo unifica las operaciones de lectura y escritura para todas las entidades.
 * Actualmente encapsula `localStorage`, pero expone interfaces asíncronas idénticas
 * a las que consumirá Supabase en la fase de migración.
 */

export * from './clientsService';
export * from './servicesService';
export * from './extrasService';
export * from './appointmentsService';
export * from './financialsService';
export * from './specialPricesService';
export * from './auditService';
export * from './settingsService';
