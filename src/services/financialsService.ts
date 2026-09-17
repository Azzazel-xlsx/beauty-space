import { FinancialMovement } from '../types';
import { safeGetJson, safeSetJson } from '../utils/storage';
import { generateId } from '../utils/id';

const STORAGE_KEY = 'bs_movements';

/**
 * Servicio de Movimientos Financieros (Capa de abstracción de datos)
 */
export const financialsService = {
  async getMovements(): Promise<FinancialMovement[]> {
    const raw = safeGetJson<FinancialMovement[]>(STORAGE_KEY, []);
    const seen = new Set<string>();
    return raw.filter((m) => {
      if (!m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  },

  async saveMovements(movements: FinancialMovement[]): Promise<void> {
    safeSetJson(STORAGE_KEY, movements);
  },

  async createMovement(movementData: Omit<FinancialMovement, 'id'>): Promise<FinancialMovement> {
    const movements = await this.getMovements();
    const newMovement: FinancialMovement = {
      ...movementData,
      id: generateId('move'),
    };
    movements.unshift(newMovement);
    await this.saveMovements(movements);
    return newMovement;
  },

  async deleteMovement(id: string): Promise<void> {
    const movements = await this.getMovements();
    const filtered = movements.filter((m) => m.id !== id);
    await this.saveMovements(filtered);
  },
};
