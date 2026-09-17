import { Appointment } from '../types';
import { safeGetJson, safeSetJson } from '../utils/storage';
import { generateId } from '../utils/id';

const STORAGE_KEY = 'bs_appointments';

/**
 * Servicio de Citas y Agenda (Capa de abstracción de datos)
 * 
 * TODO Fase 4: Al migrar a Supabase, reemplazar el patrón actual (leer array completo -> mutar en memoria -> regrabar todo)
 * por llamadas directas por fila a Supabase:
 * - getAppointments()    -> supabase.from('appointments').select('*, appointment_extras(*)')
 * - createAppointment()  -> supabase.from('appointments').insert(row).select().single()
 * - updateAppointment()  -> supabase.from('appointments').update(updates).eq('id', id).select().single()
 * - deleteAppointment()  -> supabase.from('appointments').delete().eq('id', id)
 */
export const appointmentsService = {
  async getAppointments(): Promise<Appointment[]> {
    return safeGetJson<Appointment[]>(STORAGE_KEY, []);
  },

  async saveAppointments(appointments: Appointment[]): Promise<void> {
    safeSetJson(STORAGE_KEY, appointments);
  },

  async getAppointmentById(id: string): Promise<Appointment | null> {
    const appointments = await this.getAppointments();
    return appointments.find((a) => a.id === id) || null;
  },

  async createAppointment(appointmentData: Omit<Appointment, 'id'>): Promise<Appointment> {
    const appointments = await this.getAppointments();
    const newAppointment: Appointment = {
      ...appointmentData,
      id: generateId('appt'),
    };
    appointments.push(newAppointment);
    await this.saveAppointments(appointments);
    return newAppointment;
  },

  async updateAppointment(id: string, updates: Partial<Omit<Appointment, 'id'>>): Promise<Appointment> {
    const appointments = await this.getAppointments();
    const index = appointments.findIndex((a) => a.id === id);
    if (index === -1) {
      throw new Error(`Appointment with id ${id} not found`);
    }

    const updated = { ...appointments[index], ...updates };
    appointments[index] = updated;
    await this.saveAppointments(appointments);
    return updated;
  },

  async deleteAppointment(id: string): Promise<void> {
    const appointments = await this.getAppointments();
    const filtered = appointments.filter((a) => a.id !== id);
    await this.saveAppointments(filtered);
  },
};
