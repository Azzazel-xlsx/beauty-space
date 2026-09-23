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
}

export interface ServicePriceHistory {
  date: string;
  price: number;
  reason?: string;
}

export interface ExtraPriceHistory {
  date: string;
  price: number;
  reason?: string;
}

export interface Extra {
  id: string;
  name: string;
  pricePerNail: number; // Unit price per nail
  serviceId?: string | null; // null or undefined = global
  priceHistory: ExtraPriceHistory[];
}

export interface AppointmentExtra {
  extraId: string;
  name: string;
  pricePerNail: number;
  quantity: number; // 0 to 10
  subtotal: number;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  duration?: number; // in minutes (approximate duration)
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
  homeVisitFee?: number; // Surcharge for home visit
  status: 'pending' | 'completed' | 'cancelled' | 'reagendada';
  basePrice?: number;
  extras?: AppointmentExtra[];
  priceCharged: number;
  cancelReason?: string;
  rescheduledToId?: string; // Links to new appointment if rescheduled
  reminderSentAt?: string;
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

export const DEFAULT_ADMIN_PHOTO =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBY-F9jrf6P_SkfHeHl51GzEIYfoydwPR8G2qCfRsheEg3NJPoq6fpSUdN1z4SZ1z8wjvQd9f6WsL9bsSGKXmKBMPhouu5Rr-NfHjOTXpcmEFA7v7oK4qJ-Roi0nmMUvJFNuTCRlijPw1FGIktp03sNiBF9R2uqBTyF6LygFvW5E8tUmF6ErSN6P0Qo7c_300bb-Gaagy8kYv16HiUPE6wnYUE37ExXB09alovCjyl0VcIDmWemT2Pr';


export interface AuthSession {
  isAuthenticated: boolean;
  authenticatedAt: number;
  lastActiveAt: number;
}

