import { Extra } from '../types';
import { safeGetJson, safeSetJson } from '../utils/storage';
import { generateId } from '../utils/id';

const STORAGE_KEY = 'bs_extras';

/**
 * Servicio de Extras y Nail Art (Capa de abstracción de datos)
 * 
 * TODO Fase 4: Al migrar a Supabase, reemplazar el patrón actual (leer array completo -> mutar en memoria -> regrabar todo)
 * por operaciones atómicas directas:
 * - getExtras()        -> supabase.from('extras').select('*, extra_price_history(*)')
 * - createExtra()      -> supabase.from('extras').insert(row).select().single()
 * - updateExtraPrice() -> supabase.from('extras').update({ price_per_nail: newPrice }).eq('id', id)
 *                         más insert en 'extra_price_history'
 * - deleteExtra()      -> supabase.from('extras').delete().eq('id', id)
 */
export const extrasService = {
  async getExtras(): Promise<Extra[]> {
    return safeGetJson<Extra[]>(STORAGE_KEY, []);
  },

  async saveExtras(extras: Extra[]): Promise<void> {
    safeSetJson(STORAGE_KEY, extras);
  },

  async getExtraById(id: string): Promise<Extra | null> {
    const extras = await this.getExtras();
    return extras.find((e) => e.id === id) || null;
  },

  async createExtra(extraData: Omit<Extra, 'id' | 'priceHistory'> & { initialReason?: string }): Promise<Extra> {
    const extras = await this.getExtras();
    const today = new Date().toISOString().split('T')[0];
    const newExtra: Extra = {
      id: generateId('extra'),
      name: extraData.name,
      pricePerNail: extraData.pricePerNail,
      serviceId: extraData.serviceId ?? null,
      priceHistory: [
        {
          date: today,
          price: extraData.pricePerNail,
          reason: extraData.initialReason || 'Tarifa inicial',
        },
      ],
    };
    extras.push(newExtra);
    await this.saveExtras(extras);
    return newExtra;
  },

  async updateExtraPrice(id: string, newPrice: number, date: string, reason: string): Promise<Extra> {
    const extras = await this.getExtras();
    const index = extras.findIndex((e) => e.id === id);
    if (index === -1) {
      throw new Error(`Extra with id ${id} not found`);
    }

    const current = extras[index];
    const updatedHistory = [
      { date, price: newPrice, reason },
      ...(current.priceHistory || []),
    ];

    const updatedExtra: Extra = {
      ...current,
      pricePerNail: newPrice,
      priceHistory: updatedHistory,
    };

    extras[index] = updatedExtra;
    await this.saveExtras(extras);
    return updatedExtra;
  },

  async deleteExtra(id: string): Promise<void> {
    const extras = await this.getExtras();
    const filtered = extras.filter((e) => e.id !== id);
    await this.saveExtras(filtered);
  },
};
