import { supabase } from '../lib/supabaseClient';
import { FinancialMovement } from '../types';
import { isValidUUID } from '../utils/uuid';

const mapRow = (row: any): FinancialMovement => ({
  id: row.id,
  type: row.type,
  category: row.category,
  amount: Number(row.amount),
  date: row.date,
  description: row.description ?? '',
  paymentMethod: row.payment_method ?? undefined,
  clientName: row.client_name ?? undefined,
  serviceName: row.service_name ?? undefined,
  appointmentId: row.appointment_id ?? undefined,
  costOfSupplies: Number(row.cost_of_supplies) || 0,
  staffCommission: Number(row.staff_commission) || 0,
  notes: row.notes ?? '',
});

export const financialsService = {
  async getMovements(): Promise<FinancialMovement[]> {
    const { data, error } = await supabase
      .from('financial_movements')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async createMovement(movementData: Omit<FinancialMovement, 'id'> & { id?: string }): Promise<FinancialMovement> {
    const payload: Record<string, any> = {
      type: movementData.type,
      category: movementData.category,
      amount: movementData.amount,
      date: movementData.date,
      description: movementData.description ?? '',
      payment_method: movementData.paymentMethod ?? null,
      client_name: movementData.clientName ?? '',
      service_name: movementData.serviceName ?? '',
      appointment_id: isValidUUID(movementData.appointmentId) ? movementData.appointmentId : null,
      cost_of_supplies: movementData.costOfSupplies ?? 0,
      staff_commission: movementData.staffCommission ?? 0,
      notes: movementData.notes ?? '',
    };
    if (movementData.id && isValidUUID(movementData.id)) {
      payload.id = movementData.id;
    }

    const { data, error } = await supabase
      .from('financial_movements')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async deleteMovement(id: string): Promise<void> {
    const { error } = await supabase.from('financial_movements').delete().eq('id', id);
    if (error) throw error;
  },
};
