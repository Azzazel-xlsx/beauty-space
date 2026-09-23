import { supabase } from '../lib/supabaseClient';
import { Appointment } from '../types';
import { isValidUUID } from '../utils/uuid';

const mapRow = (row: any): Appointment => ({
  id: row.id,
  clientId: row.client_id,
  serviceId: row.service_id,
  date: row.date,
  time: row.time,
  duration: Number(row.duration) || 90,
  isHomeVisit: Boolean(row.is_home_visit),
  homeVisitFee: row.home_visit_fee !== null ? Number(row.home_visit_fee) : 0,
  status: row.status as Appointment['status'],
  basePrice: row.base_price !== null ? Number(row.base_price) : 0,
  priceCharged: Number(row.price_charged) || 0,
  cancelReason: row.cancel_reason ?? '',
  rescheduledToId: row.rescheduled_to_id ?? undefined,
  reminderSentAt: row.reminder_sent_at ?? undefined,
  extras: (row.appointment_extras ?? []).map((e: any) => ({
    extraId: e.extra_id ?? e.id,
    name: e.name,
    pricePerNail: Number(e.price_per_nail),
    quantity: Number(e.quantity),
    subtotal: Number(e.subtotal),
  })),
});

export const appointmentsService = {
  async getAppointments(): Promise<Appointment[]> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, appointment_extras(*)')
      .order('date', { ascending: false })
      .order('time', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async getAppointmentById(id: string): Promise<Appointment | null> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, appointment_extras(*)')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
  },

  async createAppointment(appointmentData: Omit<Appointment, 'id'> & { id?: string }): Promise<Appointment> {
    const payload: Record<string, any> = {
      client_id: appointmentData.clientId,
      service_id: appointmentData.serviceId,
      date: appointmentData.date,
      time: appointmentData.time,
      duration: appointmentData.duration || 90,
      is_home_visit: Boolean(appointmentData.isHomeVisit),
      home_visit_fee: appointmentData.homeVisitFee ?? 0,
      status: appointmentData.status || 'pending',
      base_price: appointmentData.basePrice ?? null,
      price_charged: appointmentData.priceCharged ?? 0,
      cancel_reason: appointmentData.cancelReason || '',
      rescheduled_to_id: isValidUUID(appointmentData.rescheduledToId) ? appointmentData.rescheduledToId : null,
    };
    if (appointmentData.id && isValidUUID(appointmentData.id)) {
      payload.id = appointmentData.id;
    }

    const { data, error } = await supabase
      .from('appointments')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    if (appointmentData.extras && appointmentData.extras.length > 0) {
      const extrasRows = appointmentData.extras.map((extra) => ({
        appointment_id: data.id,
        extra_id: isValidUUID(extra.extraId) ? extra.extraId : null,
        name: extra.name,
        price_per_nail: extra.pricePerNail,
        quantity: extra.quantity,
        subtotal: extra.subtotal,
      }));
      const { error: extrasErr } = await supabase.from('appointment_extras').insert(extrasRows);
      if (extrasErr) throw extrasErr;
    }

    const full = await this.getAppointmentById(data.id);
    return full || mapRow(data);
  },

  async updateAppointment(id: string, updates: Partial<Omit<Appointment, 'id'>>): Promise<Appointment> {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.clientId !== undefined) payload.client_id = updates.clientId;
    if (updates.serviceId !== undefined) payload.service_id = updates.serviceId;
    if (updates.date !== undefined) payload.date = updates.date;
    if (updates.time !== undefined) payload.time = updates.time;
    if (updates.duration !== undefined) payload.duration = updates.duration;
    if (updates.isHomeVisit !== undefined) payload.is_home_visit = updates.isHomeVisit;
    if (updates.homeVisitFee !== undefined) payload.home_visit_fee = updates.homeVisitFee;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.basePrice !== undefined) payload.base_price = updates.basePrice;
    if (updates.priceCharged !== undefined) payload.price_charged = updates.priceCharged;
    if (updates.cancelReason !== undefined) payload.cancel_reason = updates.cancelReason;
    if (updates.rescheduledToId !== undefined) {
      payload.rescheduled_to_id = isValidUUID(updates.rescheduledToId) ? updates.rescheduledToId : null;
    }

    const { error } = await supabase.from('appointments').update(payload).eq('id', id);
    if (error) throw error;

    if (updates.extras !== undefined) {
      await supabase.from('appointment_extras').delete().eq('appointment_id', id);
      if (updates.extras.length > 0) {
        const extrasRows = updates.extras.map((extra) => ({
          appointment_id: id,
          extra_id: isValidUUID(extra.extraId) ? extra.extraId : null,
          name: extra.name,
          price_per_nail: extra.pricePerNail,
          quantity: extra.quantity,
          subtotal: extra.subtotal,
        }));
        const { error: extraErr } = await supabase.from('appointment_extras').insert(extrasRows);
        if (extraErr) throw extraErr;
      }
    }

    const updated = await this.getAppointmentById(id);
    if (!updated) throw new Error(`Appointment with id ${id} not found after update`);
    return updated;
  },

  async deleteAppointment(id: string): Promise<void> {
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) throw error;
  },
};
