import { Appointment, Service, Client } from '../types';

export interface ServiceHistoryEntry {
  appointmentId: string;
  date: string;
  time: string;
  serviceName: string;
  extras: string[];
  priceCharged: number;
  isHomeVisit: boolean;
}

/**
 * Normaliza una cadena a minúsculas y remueve acentos/diacríticos (NFD).
 */
export const normalizeText = (s: string): string => {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

/**
 * Obtiene el historial ordenado de servicios completados para una clienta.
 * Filtra solo citas 'completed', fecha válida (YYYY-MM-DD), deduplica por ID y ordena descendentemente.
 */
export const getClientServiceHistory = (
  appointments: Appointment[],
  services: Service[],
  clientId: string
): ServiceHistoryEntry[] => {
  if (!clientId) return [];
  const seenIds = new Set<string>();
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  const filtered = appointments.filter(
    (a) => a.clientId === clientId && a.status === 'completed' && dateRegex.test(a.date)
  );

  const entries: ServiceHistoryEntry[] = [];

  for (const a of filtered) {
    if (seenIds.has(a.id)) continue;
    seenIds.add(a.id);

    const sName = services.find((s) => s.id === a.serviceId)?.name || 'Servicio';
    const extrasList = (a.extras || []).map((e) => e.name);

    entries.push({
      appointmentId: a.id,
      date: a.date,
      time: a.time || '',
      serviceName: sName,
      extras: extrasList,
      priceCharged: a.priceCharged,
      isHomeVisit: a.isHomeVisit,
    });
  }

  // Orden: date desc, luego time desc (comparación de strings)
  return entries.sort((a, b) => {
    if (b.date !== a.date) {
      return b.date.localeCompare(a.date);
    }
    return b.time.localeCompare(a.time);
  });
};

/**
 * Busca clientas por tokens contenidos en nombre, teléfono (solo dígitos) o email.
 */
export const searchClients = (clients: Client[], query: string, limit = 8): Client[] => {
  const normalizedQuery = normalizeText(query).trim();
  if (!normalizedQuery) return [];

  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const matches = clients.filter((c) => {
    const normName = normalizeText(c.name);
    const normPhone = (c.phone || '').replace(/\D/g, '');
    const normEmail = normalizeText(c.email || '');

    return tokens.every((token) => {
      const isDigitsOnly = /^\d+$/.test(token);
      return (
        normName.includes(token) ||
        (isDigitsOnly && normPhone.includes(token)) ||
        normEmail.includes(token)
      );
    });
  });

  return matches.slice(0, limit);
};
