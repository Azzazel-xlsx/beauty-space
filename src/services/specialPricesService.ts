import { supabase } from '../lib/supabaseClient';
import { SpecialPrice } from '../types';
import { isValidUUID } from '../utils/uuid';

const mapRow = (row: any): SpecialPrice => ({
  id: row.id,
  clientId: row.client_id,
  serviceId: row.service_id,
  specialPrice: Number(row.special_price),
  groupLabel: row.group_label ?? 'CLIENTA REGULAR',
  isActive: Boolean(row.is_active),
});

export const specialPricesService = {
  async getSpecialPrices(): Promise<SpecialPrice[]> {
    const { data, error } = await supabase
      .from('special_prices')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async setSpecialPrice(
    clientId: string,
    serviceId: string,
    specialPrice: number,
    groupLabel: string = 'CLIENTA REGULAR',
    isActive: boolean = true,
    id?: string
  ): Promise<SpecialPrice> {
    const payload: Record<string, any> = {
      client_id: clientId,
      service_id: serviceId,
      special_price: specialPrice,
      group_label: groupLabel,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    };
    if (id && isValidUUID(id)) {
      payload.id = id;
    }

    const { data, error } = await supabase
      .from('special_prices')
      .upsert(payload, { onConflict: 'client_id,service_id' })
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async deleteSpecialPrice(id: string): Promise<void> {
    const { error } = await supabase.from('special_prices').delete().eq('id', id);
    if (error) throw error;
  },
};
