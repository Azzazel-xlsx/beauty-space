import { SpecialPrice } from '../types';
import { safeGetJson, safeSetJson } from '../utils/storage';
import { generateId } from '../utils/id';

const STORAGE_KEY = 'bs_special_prices';

/**
 * Servicio de Precios Especiales (Capa de abstracción de datos)
 */
export const specialPricesService = {
  async getSpecialPrices(): Promise<SpecialPrice[]> {
    return safeGetJson<SpecialPrice[]>(STORAGE_KEY, []);
  },

  async saveSpecialPrices(specialPrices: SpecialPrice[]): Promise<void> {
    safeSetJson(STORAGE_KEY, specialPrices);
  },

  async setSpecialPrice(
    clientId: string,
    serviceId: string,
    specialPrice: number,
    groupLabel: string = 'CLIENTA REGULAR',
    isActive: boolean = true
  ): Promise<SpecialPrice> {
    const prices = await this.getSpecialPrices();
    const existingIndex = prices.findIndex(
      (p) => p.clientId === clientId && p.serviceId === serviceId
    );

    if (existingIndex >= 0) {
      const updated: SpecialPrice = {
        ...prices[existingIndex],
        specialPrice,
        groupLabel,
        isActive,
      };
      prices[existingIndex] = updated;
      await this.saveSpecialPrices(prices);
      return updated;
    }

    const newPrice: SpecialPrice = {
      id: generateId('special'),
      clientId,
      serviceId,
      specialPrice,
      groupLabel,
      isActive,
    };
    prices.push(newPrice);
    await this.saveSpecialPrices(prices);
    return newPrice;
  },

  async deleteSpecialPrice(id: string): Promise<void> {
    const prices = await this.getSpecialPrices();
    const filtered = prices.filter((p) => p.id !== id);
    await this.saveSpecialPrices(filtered);
  },
};
