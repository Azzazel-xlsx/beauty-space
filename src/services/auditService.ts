import { supabase } from '../lib/supabaseClient';
import { PriceChangeEvent } from '../types';
import { isValidUUID } from '../utils/uuid';

const mapRow = (row: any): PriceChangeEvent => ({
  id: row.id,
  type: row.type as 'catalog' | 'special',
  targetId: row.target_id,
  name: row.name,
  oldPrice: Number(row.old_price),
  newPrice: Number(row.new_price),
  date: row.date,
  user: row.changed_by ?? 'Administradora',
  reason: row.reason ?? '',
});

export const auditService = {
  async getPriceChanges(): Promise<PriceChangeEvent[]> {
    const { data, error } = await supabase
      .from('price_change_events')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async recordPriceChange(
    eventData: Omit<PriceChangeEvent, 'id' | 'date'> & { date?: string; id?: string }
  ): Promise<PriceChangeEvent> {
    const targetId = isValidUUID(eventData.targetId)
      ? eventData.targetId
      : '00000000-0000-0000-0000-000000000000';

    const payload: Record<string, any> = {
      type: eventData.type,
      target_id: targetId,
      name: eventData.name,
      old_price: eventData.oldPrice,
      new_price: eventData.newPrice,
      date: eventData.date || new Date().toISOString().split('T')[0],
      changed_by: eventData.user || 'Administradora',
      reason: eventData.reason || '',
    };
    if (eventData.id && isValidUUID(eventData.id)) {
      payload.id = eventData.id;
    }

    const { data, error } = await supabase
      .from('price_change_events')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },
};
