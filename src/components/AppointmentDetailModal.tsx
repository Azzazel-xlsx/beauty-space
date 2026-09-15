import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, Client, Service, Extra, AppointmentExtra } from '../types';
import { Modal } from './Modal';
import { Check, Plus, Minus, Trash2, Clock, MapPin, Sparkles, CheckCircle2, ChevronDown, DollarSign } from 'lucide-react';
import { formatMoney } from '../utils/formatters';

interface AppointmentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  client?: Client;
  service?: Service;
  catalogExtras: Extra[];
  onSave: (
    appointmentId: string,
    updatedExtras: AppointmentExtra[],
    isHomeVisit: boolean,
    homeVisitFee: number,
    newTotal: number
  ) => void;
  onCharge: (appointment: Appointment) => void;
}

export const AppointmentDetailModal: React.FC<AppointmentDetailModalProps> = ({
  isOpen,
  onClose,
  appointment,
  client,
  service,
  catalogExtras,
  onSave,
  onCharge
}) => {
  // Local state for editing extras
  const [currentExtras, setCurrentExtras] = useState<AppointmentExtra[]>([]);
  const [isHomeVisit, setIsHomeVisit] = useState(false);
  const [homeVisitFee, setHomeVisitFee] = useState('0');
  const [showAddSelector, setShowAddSelector] = useState(false);
  const [selectedCatalogExtraId, setSelectedCatalogExtraId] = useState('');
  const [newExtraQty, setNewExtraQty] = useState(1);

  // Sync state when appointment opens
  useEffect(() => {
    if (appointment) {
      setCurrentExtras(appointment.extras || []);
      setIsHomeVisit(appointment.isHomeVisit || false);
      setHomeVisitFee((appointment.homeVisitFee || 0).toString());
      setShowAddSelector(false);
    }
  }, [appointment]);

  const basePrice = useMemo(() => {
    if (!appointment) return 0;
    return appointment.basePrice ?? (service?.basePrice || appointment.priceCharged);
  }, [appointment, service]);

  const totalNails = useMemo(() => {
    return currentExtras.reduce((acc, curr) => acc + curr.quantity, 0);
  }, [currentExtras]);

  const extrasSubtotal = useMemo(() => {
    return currentExtras.reduce((acc, curr) => acc + (curr.pricePerNail * curr.quantity), 0);
  }, [currentExtras]);

  const calculatedHomeFee = useMemo(() => {
    return isHomeVisit ? (parseFloat(homeVisitFee) || 0) : 0;
  }, [isHomeVisit, homeVisitFee]);

  const totalToCharge = useMemo(() => {
    return basePrice + extrasSubtotal + calculatedHomeFee;
  }, [basePrice, extrasSubtotal, calculatedHomeFee]);

  if (!appointment) return null;

  // Available extras from catalog that are not yet in currentExtras
  const availableCatalogExtras = catalogExtras.filter(
    (extra) => !currentExtras.some((item) => item.extraId === extra.id)
  );

  const handleUpdateQty = (extraId: string, delta: number) => {
    setCurrentExtras((prev) =>
      prev
        .map((item) => {
          if (item.extraId === extraId) {
            const nextQty = Math.max(1, Math.min(10, item.quantity + delta));
            return {
              ...item,
              quantity: nextQty,
              subtotal: nextQty * item.pricePerNail
            };
          }
          return item;
        })
    );
  };

  const handleRemoveExtra = (extraId: string) => {
    setCurrentExtras((prev) => prev.filter((item) => item.extraId !== extraId));
  };

  const handleAddNewExtra = () => {
    if (!selectedCatalogExtraId) return;
    const cat = catalogExtras.find((e) => e.id === selectedCatalogExtraId);
    if (!cat) return;

    const newApptExtra: AppointmentExtra = {
      extraId: cat.id,
      name: cat.name,
      pricePerNail: cat.pricePerNail,
      quantity: newExtraQty,
      subtotal: newExtraQty * cat.pricePerNail
    };

    setCurrentExtras((prev) => [...prev, newApptExtra]);
    setSelectedCatalogExtraId('');
    setNewExtraQty(1);
    setShowAddSelector(false);
  };

  const handleSaveChanges = () => {
    onSave(
      appointment.id,
      currentExtras,
      isHomeVisit,
      calculatedHomeFee,
      totalToCharge
    );
    onClose();
  };

  const handleDirectCharge = () => {
    // Save state first then launch charge flow
    onSave(
      appointment.id,
      currentExtras,
      isHomeVisit,
      calculatedHomeFee,
      totalToCharge
    );
    onCharge({
      ...appointment,
      extras: currentExtras,
      isHomeVisit,
      homeVisitFee: calculatedHomeFee,
      priceCharged: totalToCharge
    });
    onClose();
  };

  const formatDurationText = (minutes?: number) => {
    const total = minutes || 90;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m (${total} min)`;
    if (hours > 0) return `${hours}h (${total} min)`;
    return `${mins} min`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Detalle del Servicio & Extras"
      subtitle={`Cita del ${appointment.date} a las ${appointment.time} hs`}
      maxWidth="lg"
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">

        {/* 1. CARD CLIENTA */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 p-3.5 sm:p-4 rounded-2xl flex items-center justify-between gap-3 hard-shadow">
          <div className="flex items-center gap-3 min-w-0">
            {client?.photoUrl ? (
              <img
                src={client.photoUrl}
                alt={client.name}
                className="w-12 h-12 rounded-full object-cover border border-primary/20 p-0.5 bg-white shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0 text-sm">
                {client?.name ? client.name.charAt(0) : 'C'}
              </div>
            )}
            <div className="min-w-0 space-y-0.5">
              <h4 className="font-serif text-sm font-bold text-on-surface truncate">{client?.name || 'Clienta'}</h4>
              <p className="text-[11px] text-on-surface-variant/75 truncate font-medium">
                {client?.phone || client?.email || 'Sin contacto directo registrado'}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <span
            className={`inline-flex px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
              appointment.status === 'completed'
                ? 'bg-sage/15 text-sage border border-sage/30'
                : appointment.status === 'cancelled'
                ? 'bg-terracotta/15 text-terracotta border border-terracotta/30'
                : appointment.status === 'reagendada'
                ? 'bg-gold/15 text-gold-dark border border-gold/30'
                : 'bg-primary/10 text-primary border border-primary/25'
            }`}
          >
            {appointment.status === 'completed' && 'Completada'}
            {appointment.status === 'cancelled' && 'Cancelada'}
            {appointment.status === 'reagendada' && 'Reagendada'}
            {appointment.status === 'pending' && 'Programada'}
          </span>
        </div>

        {/* 2. CARD SERVICIO BASE */}
        <div className="bg-surface-container-low border border-outline-variant/30 p-4 rounded-2xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant">
              Servicio Base
            </span>
            <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/70 font-semibold bg-surface-container px-2 py-0.5 rounded-md">
              <Clock size={11} className="text-primary" />
              <span>{formatDurationText(service?.duration || appointment.duration)}</span>
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <h5 className="font-serif text-sm sm:text-base font-bold text-primary">{service?.name || 'Tratamiento'}</h5>
            <span className="font-mono text-base font-black text-on-surface">{formatMoney(basePrice)}</span>
          </div>
          {service?.description && (
            <p className="text-[11px] text-on-surface-variant/80 font-medium leading-relaxed">
              {service.description}
            </p>
          )}
        </div>

        {/* 3. SECCIÓN EXTRAS */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 p-4 rounded-2xl space-y-3 hard-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-serif text-xs sm:text-sm font-bold text-primary flex items-center gap-1.5">
                <Sparkles size={14} className="text-primary-container" />
                Extras & Diseños de Uñas
              </h5>
              <p className="text-[10px] text-on-surface-variant/70 mt-0.5">
                {currentExtras.length > 0
                  ? `${totalNails} uñas con diseño adicional`
                  : 'Ningún diseño adicional aplicado todavía'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowAddSelector(!showAddSelector)}
              className="flex items-center gap-1 px-3 py-1 bg-primary/10 hover:bg-primary/15 text-primary text-[11px] font-bold rounded-full transition-colors cursor-pointer"
            >
              <Plus size={13} />
              <span>Agregar extra</span>
            </button>
          </div>

          {/* Selector Dropdown to add an Extra */}
          {showAddSelector && (
            <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/30 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-wider font-bold text-primary">
                  Seleccionar Extra del Catálogo
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddSelector(false)}
                  className="text-on-surface-variant/60 hover:text-on-surface text-[10px] font-bold"
                >
                  Cerrar
                </button>
              </div>

              {availableCatalogExtras.length === 0 ? (
                <p className="text-[11px] text-on-surface-variant/60 font-medium">
                  Todos los extras disponibles ya están agregados.
                </p>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedCatalogExtraId}
                    onChange={(e) => setSelectedCatalogExtraId(e.target.value)}
                    className="w-full bg-surface-container-lowest text-xs py-2 px-3 rounded-lg border border-outline-variant/30 font-semibold text-on-surface focus:outline-none"
                  >
                    <option value="">Elige un extra o diseño...</option>
                    {availableCatalogExtras.map((extra) => (
                      <option key={extra.id} value={extra.id}>
                        {extra.name} — {formatMoney(extra.pricePerNail)} / uña
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-on-surface-variant">Uñas:</span>
                      <div className="flex items-center gap-1.5 bg-surface-container-lowest px-2 py-1 rounded-lg border border-outline-variant/30">
                        <button
                          type="button"
                          onClick={() => setNewExtraQty(Math.max(1, newExtraQty - 1))}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-container text-on-surface font-bold text-xs"
                        >
                          -
                        </button>
                        <span className="font-mono font-bold text-xs w-4 text-center">{newExtraQty}</span>
                        <button
                          type="button"
                          onClick={() => setNewExtraQty(Math.min(10, newExtraQty + 1))}
                          className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-container text-on-surface font-bold text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!selectedCatalogExtraId}
                      onClick={handleAddNewExtra}
                      className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-40 cursor-pointer"
                    >
                      Añadir a la Cita
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* List of Applied Extras */}
          <div className="space-y-2">
            {currentExtras.length === 0 ? (
              <div className="py-4 text-center text-xs text-on-surface-variant/50 font-medium border border-dashed border-outline-variant/20 rounded-xl">
                Sin extras. Presiona "+ Agregar extra" para registrar diseños.
              </div>
            ) : (
              currentExtras.map((item) => (
                <div
                  key={item.extraId}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low border border-outline-variant/25 gap-2"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="w-5 h-5 rounded-full bg-sage/15 text-sage flex items-center justify-center shrink-0">
                      <Check size={12} className="stroke-[3]" />
                    </div>
                    <div className="min-w-0">
                      <h6 className="text-xs font-bold text-on-surface truncate">{item.name}</h6>
                      <p className="text-[10px] text-on-surface-variant/70 font-mono">
                        {formatMoney(item.pricePerNail)} <span className="font-sans text-[9px]">/ uña</span>
                      </p>
                    </div>
                  </div>

                  {/* Quantity Stepper */}
                  <div className="flex items-center gap-1.5 bg-surface-container-lowest px-2 py-1 rounded-lg border border-outline-variant/20 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.extraId, -1)}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-bold text-xs cursor-pointer"
                      title="Disminuir uñas"
                    >
                      <Minus size={11} />
                    </button>
                    <span className="font-mono font-bold text-xs w-4 text-center text-on-surface">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateQty(item.extraId, 1)}
                      className="w-5 h-5 flex items-center justify-center rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface font-bold text-xs cursor-pointer"
                      title="Aumentar uñas"
                    >
                      <Plus size={11} />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right min-w-[70px] shrink-0">
                    <span className="font-mono text-xs font-black text-primary block">
                      {formatMoney(item.pricePerNail * item.quantity)}
                    </span>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveExtra(item.extraId)}
                    className="p-1 text-terracotta/60 hover:text-terracotta hover:bg-terracotta/10 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Quitar este extra"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 4. SECCIÓN DOMICILIO */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 p-3.5 sm:p-4 rounded-2xl space-y-2 hard-shadow">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isHomeVisit}
              onChange={(e) => setIsHomeVisit(e.target.checked)}
              className="w-4 h-4 accent-primary rounded cursor-pointer shrink-0"
            />
            <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <MapPin size={13} className="text-primary" />
              ¿Servicio prestado a domicilio?
            </span>
          </label>

          {/* Smooth collapse / expand */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              isHomeVisit ? 'max-h-24 opacity-100 mt-2' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="p-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold text-on-surface-variant">
                Recargo por traslado:
              </span>
              <div className="relative w-32">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary font-bold text-xs">$</span>
                <input
                  type="number"
                  value={homeVisitFee}
                  onChange={(e) => setHomeVisitFee(e.target.value)}
                  className="w-full bg-surface-container-lowest text-xs py-1 pl-6 pr-2 rounded-lg border border-outline-variant/30 font-mono font-bold text-primary focus:outline-none focus:border-primary text-right"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 5. CARD RESUMEN */}
        <div className="bg-surface-container border border-outline-variant/40 p-4 rounded-2xl space-y-2">
          <h5 className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant/80">
            Resumen de Facturación
          </h5>

          <div className="space-y-1 text-xs pt-1">
            <div className="flex justify-between items-center text-on-surface-variant">
              <span>Servicio base ({service?.name || 'Tratamiento'}):</span>
              <span className="font-mono font-bold text-on-surface">{formatMoney(basePrice)}</span>
            </div>

            {currentExtras.length > 0 && (
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>Extras ({totalNails} uñas aplicadas):</span>
                <span className="font-mono font-bold text-primary">+{formatMoney(extrasSubtotal)}</span>
              </div>
            )}

            {isHomeVisit && calculatedHomeFee > 0 && (
              <div className="flex justify-between items-center text-on-surface-variant">
                <span>Recargo domicilio:</span>
                <span className="font-mono font-bold text-primary">+{formatMoney(calculatedHomeFee)}</span>
              </div>
            )}

            <div className="wavy-divider opacity-40 my-2"></div>

            <div className="flex justify-between items-baseline pt-1">
              <span className="font-serif text-sm sm:text-base font-bold text-primary">Total a cobrar</span>
              <span className="font-serif text-xl sm:text-2xl font-black text-primary">
                {formatMoney(totalToCharge)}
              </span>
            </div>
          </div>
        </div>

        {/* 6. ACCIONES */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleSaveChanges}
            className="flex-1 py-3 px-4 bg-surface-container-high hover:bg-surface-container-high/80 rounded-xl text-xs font-bold text-on-surface transition-all cursor-pointer"
          >
            Guardar Cambios
          </button>

          {appointment.status === 'pending' && (
            <button
              type="button"
              onClick={handleDirectCharge}
              className="flex-1 py-3 px-4 bg-sage hover:bg-sage/95 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 size={15} />
              <span>Marcar como cobrado</span>
            </button>
          )}
        </div>

      </div>
    </Modal>
  );
};
