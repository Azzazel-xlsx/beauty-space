import { clientsService } from '../services/clientsService';
import { servicesService } from '../services/servicesService';
import { extrasService } from '../services/extrasService';
import { specialPricesService } from '../services/specialPricesService';
import { appointmentsService } from '../services/appointmentsService';
import { financialsService } from '../services/financialsService';
import { auditService } from '../services/auditService';
import { settingsService } from '../services/settingsService';
import { Client, Service, Extra, SpecialPrice, Appointment, FinancialMovement, PriceChangeEvent, AdminProfile } from '../types';

export interface LocalDataSummary {
  clientsCount: number;
  servicesCount: number;
  extrasCount: number;
  specialPricesCount: number;
  appointmentsCount: number;
  movementsCount: number;
  priceChangesCount: number;
  hasCategories: boolean;
  hasPaymentMethods: boolean;
  hasAdminProfile: boolean;
  totalItems: number;
}

export const getLegacyLocalDataSummary = (): LocalDataSummary => {
  const getCount = (key: string): number => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return 0;
      const parsed = JSON.parse(item);
      return Array.isArray(parsed) ? parsed.length : 0;
    } catch {
      return 0;
    }
  };

  const clientsCount = getCount('bs_clients');
  const servicesCount = getCount('bs_services');
  const extrasCount = getCount('bs_extras');
  const specialPricesCount = getCount('bs_special_prices');
  const appointmentsCount = getCount('bs_appointments');
  const movementsCount = getCount('bs_movements');
  const priceChangesCount = getCount('bs_price_changes');
  const hasCategories = Boolean(localStorage.getItem('bs_categories'));
  const hasPaymentMethods = Boolean(localStorage.getItem('bs_payment_methods'));
  const hasAdminProfile = Boolean(localStorage.getItem('bs_admin_profile'));

  const totalItems =
    clientsCount +
    servicesCount +
    extrasCount +
    specialPricesCount +
    appointmentsCount +
    movementsCount +
    priceChangesCount;

  return {
    clientsCount,
    servicesCount,
    extrasCount,
    specialPricesCount,
    appointmentsCount,
    movementsCount,
    priceChangesCount,
    hasCategories,
    hasPaymentMethods,
    hasAdminProfile,
    totalItems,
  };
};

export interface MigrationProgressReport {
  clientsMigrated: number;
  servicesMigrated: number;
  extrasMigrated: number;
  specialPricesMigrated: number;
  appointmentsMigrated: number;
  movementsMigrated: number;
  priceChangesMigrated: number;
  errors: string[];
}

export const migrateLocalDataToSupabase = async (
  onProgress?: (message: string) => void
): Promise<MigrationProgressReport> => {
  const report: MigrationProgressReport = {
    clientsMigrated: 0,
    servicesMigrated: 0,
    extrasMigrated: 0,
    specialPricesMigrated: 0,
    appointmentsMigrated: 0,
    movementsMigrated: 0,
    priceChangesMigrated: 0,
    errors: [],
  };

  const parseArray = <T>(key: string): T[] => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return [];
      const parsed = JSON.parse(item);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  // 1. Fetch current data from Supabase to avoid duplicates across devices
  onProgress?.('Verificando registros existentes en la base de datos...');
  const [existingClients, existingServices, existingExtras] = await Promise.all([
    clientsService.getClients().catch(() => [] as Client[]),
    servicesService.getServices().catch(() => [] as Service[]),
    extrasService.getExtras().catch(() => [] as Extra[]),
  ]);

  const clientMap = new Map<string, string>(); // oldId -> newSupabaseId
  const serviceMap = new Map<string, string>(); // oldId -> newSupabaseId
  const extraMap = new Map<string, string>(); // oldId -> newSupabaseId

  existingClients.forEach((c) => {
    if (c.phone) clientMap.set(c.phone.trim(), c.id);
    clientMap.set(c.name.trim().toLowerCase(), c.id);
  });

  existingServices.forEach((s) => {
    serviceMap.set(s.name.trim().toLowerCase(), s.id);
  });

  existingExtras.forEach((e) => {
    extraMap.set(e.name.trim().toLowerCase(), e.id);
  });

  // 2. Migrate Clients
  const localClients = parseArray<Client>('bs_clients');
  for (const client of localClients) {
    try {
      const phoneKey = client.phone ? client.phone.trim() : null;
      const nameKey = client.name.trim().toLowerCase();

      let matchedId = (phoneKey && clientMap.get(phoneKey)) || clientMap.get(nameKey);

      if (!matchedId) {
        onProgress?.(`Migrando clienta: ${client.name}...`);
        const created = await clientsService.createClient({
          name: client.name,
          phone: client.phone || '',
          email: client.email || '',
          notes: client.notes || '',
          photoUrl: client.photoUrl && !client.photoUrl.startsWith('indexeddb:') ? client.photoUrl : '',
        });
        matchedId = created.id;
        report.clientsMigrated++;
      }
      if (client.id && matchedId) {
        clientMap.set(client.id, matchedId);
      }
    } catch (err: any) {
      report.errors.push(`Error clienta ${client.name}: ${err?.message}`);
    }
  }

  // 3. Migrate Services
  const localServices = parseArray<Service>('bs_services');
  for (const service of localServices) {
    try {
      const nameKey = service.name.trim().toLowerCase();
      let matchedId = serviceMap.get(nameKey);

      if (!matchedId) {
        onProgress?.(`Migrando servicio: ${service.name}...`);
        const created = await servicesService.createService({
          name: service.name,
          description: service.description || '',
          basePrice: service.basePrice,
          duration: service.duration || 90,
          priceHistory: service.priceHistory,
        });
        matchedId = created.id;
        report.servicesMigrated++;
      }
      if (service.id && matchedId) {
        serviceMap.set(service.id, matchedId);
      }
    } catch (err: any) {
      report.errors.push(`Error servicio ${service.name}: ${err?.message}`);
    }
  }

  // 4. Migrate Extras
  const localExtras = parseArray<Extra>('bs_extras');
  for (const extra of localExtras) {
    try {
      const nameKey = extra.name.trim().toLowerCase();
      let matchedId = extraMap.get(nameKey);

      if (!matchedId) {
        onProgress?.(`Migrando extra: ${extra.name}...`);
        const mappedServiceId = extra.serviceId ? serviceMap.get(extra.serviceId) : undefined;
        const created = await extrasService.createExtra({
          name: extra.name,
          pricePerNail: extra.pricePerNail,
          serviceId: mappedServiceId,
          priceHistory: extra.priceHistory,
        });
        matchedId = created.id;
        report.extrasMigrated++;
      }
      if (extra.id && matchedId) {
        extraMap.set(extra.id, matchedId);
      }
    } catch (err: any) {
      report.errors.push(`Error extra ${extra.name}: ${err?.message}`);
    }
  }

  // 5. Migrate Special Prices
  const localSpecialPrices = parseArray<SpecialPrice>('bs_special_prices');
  for (const sp of localSpecialPrices) {
    try {
      const mappedClientId = clientMap.get(sp.clientId);
      const mappedServiceId = serviceMap.get(sp.serviceId);
      if (mappedClientId && mappedServiceId) {
        onProgress?.('Migrando tarifa especial...');
        await specialPricesService.setSpecialPrice(
          mappedClientId,
          mappedServiceId,
          sp.specialPrice,
          sp.groupLabel || 'CLIENTA REGULAR',
          sp.isActive ?? true
        );
        report.specialPricesMigrated++;
      }
    } catch (err: any) {
      report.errors.push(`Error tarifa especial: ${err?.message}`);
    }
  }

  // 6. Migrate Appointments
  const localAppointments = parseArray<Appointment>('bs_appointments');
  for (const appt of localAppointments) {
    try {
      const mappedClientId = clientMap.get(appt.clientId);
      const mappedServiceId = serviceMap.get(appt.serviceId);
      if (mappedClientId && mappedServiceId) {
        onProgress?.(`Migrando cita de fecha ${appt.date}...`);
        const mappedExtras = (appt.extras || []).map((e) => ({
          extraId: extraMap.get(e.extraId) || e.extraId,
          name: e.name,
          pricePerNail: e.pricePerNail,
          quantity: e.quantity,
          subtotal: e.subtotal,
        }));

        await appointmentsService.createAppointment({
          clientId: mappedClientId,
          serviceId: mappedServiceId,
          date: appt.date,
          time: appt.time,
          duration: appt.duration || 90,
          isHomeVisit: Boolean(appt.isHomeVisit),
          homeVisitFee: appt.homeVisitFee || 0,
          status: appt.status,
          basePrice: appt.basePrice,
          priceCharged: appt.priceCharged,
          cancelReason: appt.cancelReason,
          extras: mappedExtras,
        });
        report.appointmentsMigrated++;
      }
    } catch (err: any) {
      report.errors.push(`Error cita ${appt.date} ${appt.time}: ${err?.message}`);
    }
  }

  // 7. Migrate Movements
  const localMovements = parseArray<FinancialMovement>('bs_movements');
  for (const mov of localMovements) {
    try {
      onProgress?.(`Migrando movimiento financiero: ${mov.category}...`);
      await financialsService.createMovement({
        type: mov.type,
        category: mov.category,
        amount: mov.amount,
        date: mov.date,
        description: mov.description || '',
        paymentMethod: mov.paymentMethod,
        clientName: mov.clientName,
        serviceName: mov.serviceName,
        costOfSupplies: mov.costOfSupplies || 0,
        staffCommission: mov.staffCommission || 0,
        notes: mov.notes || '',
      });
      report.movementsMigrated++;
    } catch (err: any) {
      report.errors.push(`Error movimiento financiero ${mov.date}: ${err?.message}`);
    }
  }

  // 8. Migrate Price Changes
  const localPriceChanges = parseArray<PriceChangeEvent>('bs_price_changes');
  for (const pc of localPriceChanges) {
    try {
      const mappedTargetId = serviceMap.get(pc.targetId) || extraMap.get(pc.targetId) || pc.targetId;
      await auditService.recordPriceChange({
        type: pc.type,
        targetId: mappedTargetId,
        name: pc.name,
        oldPrice: pc.oldPrice,
        newPrice: pc.newPrice,
        date: pc.date,
        user: pc.user,
        reason: pc.reason,
      });
      report.priceChangesMigrated++;
    } catch (err: any) {
      report.errors.push(`Error auditoría precio ${pc.name}: ${err?.message}`);
    }
  }

  // 9. Migrate Categories & Payment Methods & Profile
  try {
    const rawCategories = localStorage.getItem('bs_categories');
    if (rawCategories) {
      const parsedCat = JSON.parse(rawCategories);
      if (Array.isArray(parsedCat) && parsedCat.length > 0) {
        await settingsService.saveCategories(parsedCat);
      }
    }
  } catch (err: any) {
    report.errors.push(`Error categorías: ${err?.message}`);
  }

  try {
    const rawMethods = localStorage.getItem('bs_payment_methods');
    if (rawMethods) {
      const parsedMethods = JSON.parse(rawMethods);
      if (Array.isArray(parsedMethods) && parsedMethods.length > 0) {
        await settingsService.savePaymentMethods(parsedMethods);
      }
    }
  } catch (err: any) {
    report.errors.push(`Error métodos de pago: ${err?.message}`);
  }

  try {
    const rawProfile = localStorage.getItem('bs_admin_profile');
    if (rawProfile) {
      const parsedProfile = JSON.parse(rawProfile);
      if (parsedProfile && parsedProfile.name) {
        await settingsService.saveAdminProfile({
          name: parsedProfile.name,
          photoUrl: parsedProfile.photoUrl && !parsedProfile.photoUrl.startsWith('indexeddb:') ? parsedProfile.photoUrl : '',
        });
      }
    }
  } catch (err: any) {
    report.errors.push(`Error perfil admin: ${err?.message}`);
  }

  onProgress?.('¡Migración a Supabase completada con éxito!');
  return report;
};

export const clearLegacyLocalData = (): void => {
  const legacyKeys = [
    'bs_clients',
    'bs_services',
    'bs_extras',
    'bs_special_prices',
    'bs_appointments',
    'bs_movements',
    'bs_price_changes',
    'bs_categories',
    'bs_payment_methods',
    'bs_admin_profile',
    'bs_auth_session',
    'bs_auth_hash',
    'bs_auth_salt',
  ];

  legacyKeys.forEach((key) => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch {
      // ignore
    }
  });
};
