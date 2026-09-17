import { Client } from '../types';
import { safeGetJson, safeSetJson } from '../utils/storage';
import { generateId } from '../utils/id';

const STORAGE_KEY = 'bs_clients';

/**
 * Servicio de Clientas (Capa de abstracción de datos)
 * Actualmente implementado sobre localStorage. En la fase de migración a Supabase,
 * estas funciones implementarán llamadas a `supabase.from('clients')` manteniendo la misma firma.
 */
export const clientsService = {
  async getClients(): Promise<Client[]> {
    return safeGetJson<Client[]>(STORAGE_KEY, []);
  },

  async saveClients(clients: Client[]): Promise<void> {
    safeSetJson(STORAGE_KEY, clients);
  },

  async getClientById(id: string): Promise<Client | null> {
    const clients = await this.getClients();
    return clients.find((c) => c.id === id) || null;
  },

  async createClient(clientData: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
    const clients = await this.getClients();
    const newClient: Client = {
      ...clientData,
      id: generateId('client'),
      createdAt: new Date().toISOString().split('T')[0],
    };
    clients.push(newClient);
    await this.saveClients(clients);
    return newClient;
  },

  async updateClient(id: string, updates: Partial<Omit<Client, 'id' | 'createdAt'>>): Promise<Client> {
    const clients = await this.getClients();
    const index = clients.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error(`Client with id ${id} not found`);
    }
    const updatedClient = { ...clients[index], ...updates };
    clients[index] = updatedClient;
    await this.saveClients(clients);
    return updatedClient;
  },

  async deleteClient(id: string): Promise<void> {
    const clients = await this.getClients();
    const filtered = clients.filter((c) => c.id !== id);
    await this.saveClients(filtered);
  },
};
