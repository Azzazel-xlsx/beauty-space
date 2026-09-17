import { Service } from '../types';
import { safeGetJson, safeSetJson } from '../utils/storage';
import { generateId } from '../utils/id';

const STORAGE_KEY = 'bs_services';

/**
 * Servicio de Servicios y Catálogo (Capa de abstracción de datos)
 */
export const servicesService = {
  async getServices(): Promise<Service[]> {
    return safeGetJson<Service[]>(STORAGE_KEY, []);
  },

  async saveServices(services: Service[]): Promise<void> {
    safeSetJson(STORAGE_KEY, services);
  },

  async getServiceById(id: string): Promise<Service | null> {
    const services = await this.getServices();
    return services.find((s) => s.id === id) || null;
  },

  async createService(serviceData: Omit<Service, 'id'>): Promise<Service> {
    const services = await this.getServices();
    const newService: Service = {
      ...serviceData,
      id: generateId('srv'),
    };
    services.push(newService);
    await this.saveServices(services);
    return newService;
  },

  async updateServicePrice(id: string, newPrice: number, date: string, reason: string): Promise<Service> {
    const services = await this.getServices();
    const index = services.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new Error(`Service with id ${id} not found`);
    }

    const current = services[index];
    const updatedHistory = [
      { date, price: newPrice, reason },
      ...(current.priceHistory || []),
    ];

    const updatedService: Service = {
      ...current,
      basePrice: newPrice,
      priceHistory: updatedHistory,
    };

    services[index] = updatedService;
    await this.saveServices(services);
    return updatedService;
  },

  async deleteService(id: string): Promise<void> {
    const services = await this.getServices();
    const filtered = services.filter((s) => s.id !== id);
    await this.saveServices(filtered);
  },
};
