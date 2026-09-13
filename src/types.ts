/**
 * Shared Type Definitions for Beauty Space
 */

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  photoUrl: string;
  createdAt: string;
  photos?: ClientPhoto[];
}

export interface ClientPhoto {
  id: string;
  date: string;
  beforeUrl: string;
  afterUrl: string;
  notes?: string;
}

export interface ServicePriceHistory {
  date: string;
  price: number;
  reason?: string;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  duration?: number; // in minutes
  priceHistory: ServicePriceHistory[];
}

export interface Appointment {
  id: string;
  clientId: string;
  serviceId: string;
  date: string;
  time: string;
  duration: number; // in minutes
  isHomeVisit: boolean;
  status: 'pending' | 'completed' | 'cancelled' | 'reagendada';
  priceCharged: number;
  cancelReason?: string;
  rescheduledToId?: string; // Links to new appointment if rescheduled
}

export interface FinancialMovement {
  id: string;
  type: 'income' | 'expense';
  category: string; // e.g., 'Suministros & Esmaltes', 'Mantenimiento', 'Publicidad', 'Servicios', or Service Name for Incomes
  amount: number;
  date: string;
  description: string;
  paymentMethod?: 'EFECTIVO' | 'TRANSFERENCIA' | 'TARJETA';
  clientName?: string; // Cache for presentation
  serviceName?: string; // Cache for presentation
  appointmentId?: string;
  costOfSupplies?: number; // Added for Version 2.0 profitability
  staffCommission?: number; // Added for margin calculations
  notes?: string; // Addition observations
}

export interface SpecialPrice {
  id: string;
  clientId: string;
  serviceId: string;
  specialPrice: number;
  groupLabel: 'VIP DIAMANTE' | 'AMIGA & FAMILIA' | 'CUENTA PAUSADA' | string;
  isActive: boolean;
}

export interface PriceChangeEvent {
  id: string;
  type: 'catalog' | 'special';
  targetId: string; // Service ID or Special Price ID
  name: string; // e.g. "Manicura Rusa" or "Lucía Méndez - Gel X"
  oldPrice: number;
  newPrice: number;
  date: string;
  user: string;
  reason: string;
}

export interface DashboardStats {
  clientsToday: number;
  servicesToday: number;
  incomeToday: number;
  profitToday: number;
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  retentionRate: number; // e.g. 70 for 70%
}

export interface AdminProfile {
  name: string;
  photoUrl: string;
}

export interface AuthSession {
  isAuthenticated: boolean;
  authenticatedAt: number;
  lastActiveAt: number;
}

