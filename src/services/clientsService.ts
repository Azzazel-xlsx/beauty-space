import { supabase } from '../lib/supabaseClient';
import { Client } from '../types';
import { isValidUUID } from '../utils/uuid';

const mapRow = (row: any): Client => ({
  id: row.id,
  name: row.name,
  phone: row.phone ?? '',
  email: row.email ?? '',
  notes: row.notes ?? '',
  photoUrl: row.photo_url ?? '',
  createdAt: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
});

export const clientsService = {
  async getClients(): Promise<Client[]> {
    const { data, error } = await supabase.from('clients').select('*').order('name');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async getClientById(id: string): Promise<Client | null> {
    const { data, error } = await supabase.from('clients').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return mapRow(data);
  },

  async createClient(clientData: Omit<Client, 'id' | 'createdAt'> & { id?: string }): Promise<Client> {
    const payload: Record<string, any> = {
      name: clientData.name,
      phone: clientData.phone ?? '',
      email: clientData.email ?? '',
      notes: clientData.notes ?? '',
      photo_url: clientData.photoUrl ?? '',
    };
    if (clientData.id && isValidUUID(clientData.id)) {
      payload.id = clientData.id;
    }

    const { data, error } = await supabase
      .from('clients')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async updateClient(id: string, updates: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<Client> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.email !== undefined) payload.email = updates.email;
    if (updates.notes !== undefined) payload.notes = updates.notes;
    if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;

    const { data, error } = await supabase
      .from('clients')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async deleteClient(id: string): Promise<void> {
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) throw error;
  },
};
