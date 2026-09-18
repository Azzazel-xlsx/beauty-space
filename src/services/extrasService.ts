import { supabase } from '../lib/supabaseClient';
import { Extra } from '../types';
import { isValidUUID } from '../utils/uuid';

const mapRow = (row: any): Extra => ({
  id: row.id,
  name: row.name,
  pricePerNail: Number(row.price_per_nail),
  serviceId: row.service_id ?? null,
  priceHistory: (row.extra_price_history ?? [])
    .map((h: any) => ({
      date: h.date,
      price: Number(h.price),
      reason: h.reason ?? '',
    }))
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
});

export const extrasService = {
  async getExtras(): Promise<Extra[]> {
    const { data, error } = await supabase
      .from('extras')
      .select('*, extra_price_history(*)')
      .order('name');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async getExtraById(id: string): Promise<Extra | null> {
    const { data, error } = await supabase
      .from('extras')
      .select('*, extra_price_history(*)')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
  },

  async createExtra(
    extraData: Omit<Extra, 'id' | 'priceHistory'> & {
      initialReason?: string;
      id?: string;
      initialPrice?: number;
      priceHistory?: Extra['priceHistory'];
    }
  ): Promise<Extra> {
    const pricePerNail = extraData.pricePerNail ?? extraData.initialPrice ?? 0;
    const payload: Record<string, any> = {
      name: extraData.name,
      price_per_nail: pricePerNail,
      service_id: isValidUUID(extraData.serviceId) ? extraData.serviceId : null,
    };
    if (extraData.id && isValidUUID(extraData.id)) {
      payload.id = extraData.id;
    }

    const { data, error } = await supabase
      .from('extras')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    const historyEntry = (extraData.priceHistory && extraData.priceHistory.length > 0)
      ? extraData.priceHistory[0]
      : {
          date: new Date().toISOString().split('T')[0],
          price: pricePerNail,
          reason: extraData.initialReason || 'Tarifa inicial registrada.',
        };

    await supabase.from('extra_price_history').insert({
      extra_id: data.id,
      date: historyEntry.date || new Date().toISOString().split('T')[0],
      price: historyEntry.price ?? pricePerNail,
      reason: historyEntry.reason || 'Tarifa inicial registrada.',
    });

    const full = await this.getExtraById(data.id);
    return full || mapRow(data);
  },

  async updateExtraPrice(id: string, newPrice: number, date: string, reason: string): Promise<Extra> {
    const { error: updateErr } = await supabase
      .from('extras')
      .update({ price_per_nail: newPrice, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (updateErr) throw updateErr;

    const { error: histErr } = await supabase
      .from('extra_price_history')
      .insert({
        extra_id: id,
        date,
        price: newPrice,
        reason: reason || 'Actualización periódica.',
      });
    if (histErr) throw histErr;

    const updated = await this.getExtraById(id);
    if (!updated) throw new Error(`Extra with id ${id} not found after update`);
    return updated;
  },

  async deleteExtra(id: string): Promise<void> {
    const { error } = await supabase.from('extras').delete().eq('id', id);
    if (error) throw error;
  },
};
