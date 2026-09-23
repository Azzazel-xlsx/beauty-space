import { supabase } from '../lib/supabaseClient';
import { AdminProfile, DEFAULT_ADMIN_PHOTO } from '../types';

const DEFAULT_CATEGORIES = [
  'Suministros & Esmaltes',
  'Mantenimiento Equipo',
  'Publicidad & RRSS',
  'Alquiler & Expensas',
  'Insumos Descartables',
];

const DEFAULT_PAYMENT_METHODS = ['TRANSFERENCIA', 'EFECTIVO', 'TARJETA'];

const DEFAULT_ADMIN_PROFILE: AdminProfile = {
  name: 'Valentina Moretti',
  photoUrl: DEFAULT_ADMIN_PHOTO,
};

export const settingsService = {
  async getCategories(): Promise<string[]> {
    const { data, error } = await supabase.from('categories').select('name').order('created_at');
    if (error) throw error;
    if (!data || data.length === 0) {
      return DEFAULT_CATEGORIES;
    }
    return data.map((r: { name: string }) => r.name);
  },

  async saveCategories(newCategories: string[]): Promise<void> {
    const { data: currentRows, error: fetchErr } = await supabase.from('categories').select('name');
    if (fetchErr) throw fetchErr;

    const currentNames = (currentRows ?? []).map((r: { name: string }) => r.name);
    const toInsert = newCategories.filter((cat) => !currentNames.includes(cat));
    const toDelete = currentNames.filter((cat) => !newCategories.includes(cat));

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from('categories').insert(toInsert.map((name) => ({ name })));
      if (insErr) throw insErr;
    }

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase.from('categories').delete().in('name', toDelete);
      if (delErr) throw delErr;
    }
  },

  async addCategory(name: string): Promise<void> {
    const { error } = await supabase.from('categories').insert({ name });
    if (error) throw error;
  },

  async deleteCategory(name: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('name', name);
    if (error) throw error;
  },

  async getPaymentMethods(): Promise<string[]> {
    const { data, error } = await supabase.from('payment_methods').select('name').order('created_at');
    if (error) throw error;
    if (!data || data.length === 0) {
      return DEFAULT_PAYMENT_METHODS;
    }
    return data.map((r: { name: string }) => r.name);
  },

  async savePaymentMethods(newMethods: string[]): Promise<void> {
    const { data: currentRows, error: fetchErr } = await supabase.from('payment_methods').select('name');
    if (fetchErr) throw fetchErr;

    const currentNames = (currentRows ?? []).map((r: { name: string }) => r.name);
    const toInsert = newMethods.filter((m) => !currentNames.includes(m));
    const toDelete = currentNames.filter((m) => !newMethods.includes(m));

    if (toInsert.length > 0) {
      const { error: insErr } = await supabase.from('payment_methods').insert(toInsert.map((name) => ({ name })));
      if (insErr) throw insErr;
    }

    if (toDelete.length > 0) {
      const { error: delErr } = await supabase.from('payment_methods').delete().in('name', toDelete);
      if (delErr) throw delErr;
    }
  },

  async addPaymentMethod(name: string): Promise<void> {
    const { error } = await supabase.from('payment_methods').insert({ name });
    if (error) throw error;
  },

  async deletePaymentMethod(name: string): Promise<void> {
    const { error } = await supabase.from('payment_methods').delete().eq('name', name);
    if (error) throw error;
  },

  async getPublicAdminProfile(): Promise<AdminProfile> {
    const { data, error } = await supabase.from('public_admin_profile').select('*').maybeSingle();
    if (error) {
      // No bloquear el login por esto — si falla, se queda con el placeholder
      // hasta que cargue el perfil completo tras autenticarse.
      console.warn('No se pudo precargar el perfil público:', error);
      return DEFAULT_ADMIN_PROFILE;
    }
    if (!data) return DEFAULT_ADMIN_PROFILE;
    return {
      name: data.name || DEFAULT_ADMIN_PROFILE.name,
      photoUrl: data.photo_url || DEFAULT_ADMIN_PROFILE.photoUrl,
    };
  },

  async getAdminProfile(): Promise<AdminProfile> {
    const { data, error } = await supabase.from('admin_profile').select('*').limit(1).maybeSingle();
    if (error) throw error;
    if (!data) {
      return DEFAULT_ADMIN_PROFILE;
    }
    return {
      name: data.name || DEFAULT_ADMIN_PROFILE.name,
      photoUrl: data.photo_url || DEFAULT_ADMIN_PROFILE.photoUrl,
    };
  },

  async saveAdminProfile(profile: AdminProfile): Promise<void> {
    const { data: existing, error: findErr } = await supabase.from('admin_profile').select('id').limit(1).maybeSingle();
    if (findErr) throw findErr;

    if (existing?.id) {
      const { error: updateErr } = await supabase
        .from('admin_profile')
        .update({
          name: profile.name,
          photo_url: profile.photoUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase
        .from('admin_profile')
        .insert({
          name: profile.name,
          photo_url: profile.photoUrl,
        });
      if (insertErr) throw insertErr;
    }
  },
};
