import React from 'react';
import { ServiceHistoryEntry } from '../utils/clientHistory';
import { formatDate, formatMoney } from '../utils/formatters';
import { Home } from 'lucide-react';

interface ClientServiceHistoryProps {
  entries: ServiceHistoryEntry[];
}

export const ClientServiceHistory: React.FC<ClientServiceHistoryProps> = ({ entries }) => {
  if (entries.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-on-surface-variant/60 font-medium">
        Sin servicios realizados
      </div>
    );
  }

  return (
    <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 divide-y divide-outline-variant/15">
      {entries.map((entry) => (
        <div
          key={entry.appointmentId}
          className="pt-2 first:pt-0 flex items-center justify-between gap-3 text-xs"
        >
          {/* Fecha (ancho fijo) */}
          <div className="w-20 sm:w-24 shrink-0 text-on-surface-variant/80 font-mono text-[11px]">
            {formatDate(entry.date)}
          </div>

          {/* Servicio y badges */}
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <span className="truncate font-semibold text-on-surface" title={entry.serviceName}>
              {entry.serviceName}
            </span>

            {entry.extras.length > 0 && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-surface-container font-medium text-on-surface-variant">
                +{entry.extras.length} extra{entry.extras.length > 1 ? 's' : ''}
              </span>
            )}

            {entry.isHomeVisit && (
              <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 font-medium flex items-center gap-0.5">
                <Home size={10} /> Domicilio
              </span>
            )}
          </div>

          {/* Importe Cobrado */}
          <div className="shrink-0 text-right font-bold text-primary font-mono text-[11px]">
            {formatMoney(entry.priceCharged)}
          </div>
        </div>
      ))}
    </div>
  );
};
