import { supabase } from '../lib/supabaseClient';
import { Service } from '../types';
import { isValidUUID } from '../utils/uuid';

const mapRow = (row: any): Service => ({
  id: row.id,
  name: row.name,
  description: row.description ?? '',
  basePrice: Number(row.base_price),
  duration: row.duration ? Number(row.duration) : 90,
  priceHistory: (row.service_price_history ?? [])
    .map((h: any) => ({
      date: h.date,
      price: Number(h.price),
      reason: h.reason ?? '',
    }))
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
});

export const servicesService = {
  async getServices(): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*, service_price_history(*)')
      .order('name');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async getServiceById(id: string): Promise<Service | null> {
    const { data, error } = await supabase
      .from('services')
      .select('*, service_price_history(*)')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
  },

  async createService(
    serviceData: Omit<Service, 'id' | 'priceHistory'> & {
      initialPrice?: number;
      basePrice?: number;
      id?: string;
      priceHistory?: Service['priceHistory'];
    }
  ): Promise<Service> {
    const basePrice = serviceData.basePrice ?? serviceData.initialPrice ?? 0;
    const payload: Record<string, any> = {
      name: serviceData.name,
      description: serviceData.description ?? '',
      base_price: basePrice,
      duration: serviceData.duration ?? 90,
    };
    if (serviceData.id && isValidUUID(serviceData.id)) {
      payload.id = serviceData.id;
    }

    const { data, error } = await supabase
      .from('services')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    // Record initial price history
    const historyEntry = (serviceData.priceHistory && serviceData.priceHistory.length > 0)
      ? serviceData.priceHistory[0]
      : {
          date: new Date().toISOString().split('T')[0],
          price: basePrice,
          reason: 'Tarifa de apertura de catálogo.',
        };

    await supabase.from('service_price_history').insert({
      service_id: data.id,
      date: historyEntry.date || new Date().toISOString().split('T')[0],
      price: historyEntry.price ?? basePrice,
      reason: historyEntry.reason || 'Tarifa de apertura de catálogo.',
    });

    const full = await this.getServiceById(data.id);
    return full || mapRow(data);
  },

  async updateServicePrice(id: string, newPrice: number, date: string, reason: string): Promise<Service> {
    const { error: updateErr } = await supabase
      .from('services')
      .update({ base_price: newPrice, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateErr) throw updateErr;

    const { error: histErr } = await supabase
      .from('service_price_history')
      .insert({
        service_id: id,
        date,
        price: newPrice,
        reason: reason || 'Actualización periódica.',
      });
    if (histErr) throw histErr;

    const updated = await this.getServiceById(id);
    if (!updated) throw new Error(`Service with id ${id} not found after update`);
    return updated;
  },

  async deleteService(id: string): Promise<void> {
    const { error } = await supabase.from('services').delete().eq('id', id);
    if (error) throw error;
  },
};
