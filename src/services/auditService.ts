import { PriceChangeEvent } from '../types';
import { safeGetJson, safeSetJson } from '../utils/storage';
import { generateId } from '../utils/id';

const STORAGE_KEY = 'bs_price_changes';

/**
 * Servicio de Auditoría de Precios (Capa de abstracción de datos)
 * 
 * TODO Fase 4: Al migrar a Supabase, reemplazar el patrón actual (leer array completo -> mutar en memoria -> regrabar todo)
 * por inserciones y consultas directas:
 * - getPriceChanges()   -> supabase.from('price_change_events').select('*').order('date', { ascending: false })
 * - recordPriceChange() -> supabase.from('price_change_events').insert(row).select().single()
 */
export const auditService = {
  async getPriceChanges(): Promise<PriceChangeEvent[]> {
    return safeGetJson<PriceChangeEvent[]>(STORAGE_KEY, []);
  },

  async savePriceChanges(events: PriceChangeEvent[]): Promise<void> {
    safeSetJson(STORAGE_KEY, events);
  },

  async recordPriceChange(
    eventData: Omit<PriceChangeEvent, 'id' | 'date'> & { date?: string }
  ): Promise<PriceChangeEvent> {
    const events = await this.getPriceChanges();
    const newEvent: PriceChangeEvent = {
      ...eventData,
      id: generateId('audit'),
      date: eventData.date || new Date().toISOString().split('T')[0],
    };
    events.unshift(newEvent);
    await this.savePriceChanges(events);
    return newEvent;
  },
};
