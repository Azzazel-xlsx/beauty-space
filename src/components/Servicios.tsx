import React, { useState } from 'react';
import { Service, Extra } from '../types';
import { Plus, Sparkles, Tag, Calendar, ChevronDown, ChevronUp, Clock, Trash2, Globe, Layers, X, AlertTriangle } from 'lucide-react';
import { formatMoney } from '../utils/formatters';
import { Modal } from './Modal';
import { useToast } from './Toast';

interface ServiciosProps {
  services: Service[];
  extras: Extra[];
  onAddService: (service: Omit<Service, 'id' | 'priceHistory'> & { initialPrice: number }) => void;
  onUpdateServicePrice: (serviceId: string, newPrice: number, date: string, reason?: string) => void;
  onDeleteService: (serviceId: string) => void;
  onAddExtra: (extra: Omit<Extra, 'id' | 'priceHistory'> & { initialPrice: number }) => void;
  onUpdateExtraPrice: (extraId: string, newPrice: number, date: string, reason?: string) => void;
  onDeleteExtra: (extraId: string) => void;
}

export const Servicios: React.FC<ServiciosProps> = ({
  services,
  extras,
  onAddService,
  onUpdateServicePrice,
  onDeleteService,
  onAddExtra,
  onUpdateExtraPrice,
  onDeleteExtra
}) => {
  const toast = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedSection, setExpandedSection] = useState<{ serviceId: string; type: 'extras' | 'prices' } | null>(null);

  // Deletion modals state
  const [extraToDelete, setExtraToDelete] = useState<Extra | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  // New Service Form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDurationHours, setNewDurationHours] = useState('1');
  const [newDurationMins, setNewDurationMins] = useState('30');
  const [addError, setAddError] = useState('');

  // Update Price Form state with audit reason
  const [updatePriceVal, setUpdatePriceVal] = useState('');
  const [updatePriceDate, setUpdatePriceDate] = useState(new Date().toISOString().split('T')[0]);
  const [updatePriceReason, setUpdatePriceReason] = useState('');
  const [updatingServiceId, setUpdatingServiceId] = useState<string | null>(null);

  // Extra management state
  const [showNewExtraFormForService, setShowNewExtraFormForService] = useState<string | null>(null);
  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPricePerNail, setNewExtraPricePerNail] = useState('');
  const [newExtraIsGlobal, setNewExtraIsGlobal] = useState(true);

  // Extra price update state with audit
  const [updatingExtraId, setUpdatingExtraId] = useState<string | null>(null);
  const [updateExtraPriceVal, setUpdateExtraPriceVal] = useState('');
  const [updateExtraPriceDate, setUpdateExtraPriceDate] = useState(new Date().toISOString().split('T')[0]);
  const [updateExtraPriceReason, setUpdateExtraPriceReason] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPrice) {
      setAddError('Por favor introduce el nombre y precio del servicio');
      return;
    }
    const parsedPrice = parseFloat(newPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      setAddError('El precio debe ser un número válido mayor a 0');
      return;
    }

    const totalMinutes = parseInt(newDurationHours || '0') * 60 + parseInt(newDurationMins || '0');
    const finalDuration = totalMinutes > 0 ? totalMinutes : 90;

    onAddService({
      name: newName,
      description: newDesc || 'Sin descripción particular.',
      basePrice: parsedPrice,
      duration: finalDuration,
      initialPrice: parsedPrice
    });

    toast.success(`Servicio "${newName.trim()}" creado.`);

    // Reset Form
    setNewName('');
    setNewDesc('');
    setNewPrice('');
    setNewDurationHours('1');
    setNewDurationMins('30');
    setAddError('');
    setShowAddForm(false);
  };

  const handleUpdatePriceSubmit = (e: React.FormEvent, serviceId: string) => {
    e.preventDefault();
    const parsedPrice = parseFloat(updatePriceVal);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error('Introduce un precio válido mayor a 0');
      return;
    }
    if (!updatePriceDate) {
      toast.error('Elige una fecha para el registro histórico');
      return;
    }

    const defaultReason = 'Actualización de tarifa por costes e inflación de insumos.';
    onUpdateServicePrice(serviceId, parsedPrice, updatePriceDate, updatePriceReason.trim() || defaultReason);
    toast.success('Tarifa de servicio actualizada.');
    
    // Reset state
    setUpdatePriceVal('');
    setUpdatePriceReason('');
    setUpdatingServiceId(null);
  };

  const handleAddExtraSubmit = (e: React.FormEvent, serviceId: string) => {
    e.preventDefault();
    if (!newExtraName.trim() || !newExtraPricePerNail) return;

    const price = parseFloat(newExtraPricePerNail);
    if (isNaN(price) || price <= 0) {
      toast.error('Introduce un precio por uña válido');
      return;
    }

    onAddExtra({
      name: newExtraName.trim(),
      pricePerNail: price,
      serviceId: newExtraIsGlobal ? null : serviceId,
      initialPrice: price
    });

    toast.success(`Diseño/extra "${newExtraName.trim()}" agregado.`);

    setNewExtraName('');
    setNewExtraPricePerNail('');
    setShowNewExtraFormForService(null);
  };

  const handleUpdateExtraPriceSubmit = (e: React.FormEvent, extraId: string) => {
    e.preventDefault();
    const parsedPrice = parseFloat(updateExtraPriceVal);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      toast.error('Introduce un precio por uña válido');
      return;
    }

    const defaultReason = 'Ajuste de tarifa de diseño adicional.';
    onUpdateExtraPrice(extraId, parsedPrice, updateExtraPriceDate, updateExtraPriceReason.trim() || defaultReason);
    toast.success('Precio de extra actualizado.');

    setUpdatingExtraId(null);
    setUpdateExtraPriceVal('');
    setUpdateExtraPriceReason('');
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
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Banner / Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container border border-outline-variant/40 rounded-2xl p-6 hard-shadow">
        <div>
          <h2 className="font-serif text-lg font-bold text-primary">Servicios del Atelier & Extras</h2>
          <p className="text-xs text-on-surface-variant/75 mt-0.5">
            Configura tus tratamientos base con duración aproximada, extras por uña e historial de tarifas
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full text-xs font-bold transition-all hover:bg-primary/90 editorial-shadow cursor-pointer"
        >
          <Plus size={16} /> {showAddForm ? 'Ocultar Formulario' : 'Nuevo Servicio'}
        </button>
      </div>

      {/* NEW SERVICE SLIDING/EXPANDABLE CARD */}
      {showAddForm && (
        <div className="bg-surface-container-lowest border border-outline-variant/40 p-6 rounded-3xl max-w-xl mx-auto hard-shadow animate-in slide-in-from-top-4 duration-300">
          <div className="text-center mb-5">
            <h3 className="font-serif text-base font-bold text-primary flex items-center justify-center gap-2">
              <Sparkles className="text-primary-container" size={16} />
              Agregar Tratamiento al Catálogo
            </h3>
            <p className="text-[11px] text-on-surface-variant/70 mt-1">Inserta los datos iniciales y duración aproximada para la reserva</p>
          </div>

          <div className="wavy-divider opacity-40 mb-6"></div>

          {addError && (
            <div className="mb-4 bg-terracotta/10 border border-terracotta/20 text-terracotta p-3 rounded-xl text-xs font-semibold">
              {addError}
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Nombre del Servicio</label>
              <input
                type="text"
                placeholder="Ej. Kapping + Soft Gel"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full bg-surface-container-low text-xs py-2.5 px-4 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold"
                required
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Descripción del Tratamiento</label>
              <textarea
                placeholder="Detalla los materiales, pasos o beneficios..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={2}
                className="w-full bg-surface-container-low text-xs py-2.5 px-4 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Precio Base (ARS/MXN)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-black text-xs">$</span>
                  <input
                    type="number"
                    placeholder="1200"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full bg-surface-container-low text-xs py-2.5 pl-8 pr-4 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Explicit Duration in Hours & Minutes */}
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">
                  Duración Aproximada
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-xl border border-outline-variant/30">
                    <select
                      value={newDurationHours}
                      onChange={(e) => setNewDurationHours(e.target.value)}
                      className="bg-transparent text-xs font-bold text-on-surface focus:outline-none w-full"
                    >
                      <option value="0">0h</option>
                      <option value="1">1h</option>
                      <option value="2">2h</option>
                      <option value="3">3h</option>
                      <option value="4">4h</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-1.5 bg-surface-container-low px-3 py-1.5 rounded-xl border border-outline-variant/30">
                    <select
                      value={newDurationMins}
                      onChange={(e) => setNewDurationMins(e.target.value)}
                      className="bg-transparent text-xs font-bold text-on-surface focus:outline-none w-full"
                    >
                      <option value="0">0 min</option>
                      <option value="15">15 min</option>
                      <option value="30">30 min</option>
                      <option value="45">45 min</option>
                    </select>
                  </div>
                </div>
                <span className="text-[10px] text-on-surface-variant/60 font-medium block mt-1">
                  Total: {parseInt(newDurationHours || '0') * 60 + parseInt(newDurationMins || '0')} minutos (se autocompleta al reservar)
                </span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-surface-container-high text-on-surface text-xs font-bold py-3 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary text-white text-xs font-bold py-3 rounded-xl transition-all editorial-shadow cursor-pointer"
              >
                Crear Servicio
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SERVICES LISTING GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
        {services.map((service) => {
          const isExtrasExpanded = expandedSection?.serviceId === service.id && expandedSection?.type === 'extras';
          const isPricesExpanded = expandedSection?.serviceId === service.id && expandedSection?.type === 'prices';
          const isUpdatingPrice = updatingServiceId === service.id;

          // Find extras available for this service: both global (null/undefined serviceId) and specific
          const serviceExtras = extras.filter(e => !e.serviceId || e.serviceId === service.id);

          return (
            <div
              key={service.id}
              className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl overflow-hidden hard-shadow flex flex-col justify-between transition-all duration-300"
            >
              <div className="p-5 space-y-3">
                {/* Header: Title & Action */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary/40 flex-shrink-0"></span>
                    <h4 className="font-serif text-sm font-bold text-on-surface tracking-wide">{service.name}</h4>
                  </div>
                  <button
                    onClick={() => setServiceToDelete(service)}
                    className="text-terracotta/70 hover:text-terracotta p-1 transition-colors rounded-lg hover:bg-terracotta/10 cursor-pointer"
                    title="Eliminar servicio"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-on-surface-variant/80 font-medium leading-relaxed min-h-[38px]">
                  {service.description}
                </p>

                {/* Duration info */}
                <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant/70 font-bold bg-surface-container-low px-2.5 py-1.5 rounded-lg w-fit">
                  <Clock size={12} className="text-primary" />
                  <span>Duración aproximada: {formatDurationText(service.duration)}</span>
                </div>

                {/* Base price */}
                <div className="flex items-baseline justify-between border-t border-outline-variant/20 pt-3">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant/60">Precio Base</span>
                  <span className="font-serif text-lg font-black text-primary">{formatMoney(service.basePrice)}</span>
                </div>
              </div>

              {/* Collapsible expansion zones */}
              <div className="bg-surface-container-low/40 border-t border-outline-variant/20 divide-y divide-outline-variant/20">
                
                {/* Accordion 1: EXTRAS & DISEÑOS ADICIONALES */}
                <div>
                  <button
                    onClick={() => {
                      if (isExtrasExpanded) {
                        setExpandedSection(null);
                      } else {
                        setExpandedSection({ serviceId: service.id, type: 'extras' });
                      }
                    }}
                    className="w-full flex items-center justify-between px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-primary/80 hover:text-primary transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Layers size={13} className="text-primary" />
                      <span>Extras & Diseños</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[9px] font-extrabold">
                        {serviceExtras.length}
                      </span>
                    </div>
                    {isExtrasExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {isExtrasExpanded && (
                    <div className="px-5 pb-5 pt-1 space-y-3.5 animate-in fade-in duration-200">
                      
                      {/* Top Action inside Extras Accordion */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-on-surface-variant/70 font-semibold">
                          Diseños aplicables
                        </span>
                        <button
                          onClick={() => setShowNewExtraFormForService(showNewExtraFormForService === service.id ? null : service.id)}
                          className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline bg-primary/10 px-2.5 py-1 rounded-full cursor-pointer"
                        >
                          <Plus size={11} /> Nuevo Extra
                        </button>
                      </div>

                      {/* New Extra Form */}
                      {showNewExtraFormForService === service.id && (
                        <form
                          onSubmit={(e) => handleAddExtraSubmit(e, service.id)}
                          className="bg-surface-container p-3 rounded-xl border border-outline-variant/30 space-y-2.5 animate-in fade-in duration-150"
                        >
                          <div className="flex items-center justify-between">
                            <h6 className="text-[9px] uppercase tracking-wider font-bold text-primary">Agregar Nuevo Extra</h6>
                            <button
                              type="button"
                              onClick={() => setShowNewExtraFormForService(null)}
                              className="text-on-surface-variant/50 hover:text-on-surface p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </div>

                          <input
                            type="text"
                            placeholder="Nombre del diseño (ej. Francés, Aurora...)"
                            value={newExtraName}
                            onChange={(e) => setNewExtraName(e.target.value)}
                            className="w-full bg-surface-container-lowest text-xs py-1.5 px-3 rounded-lg border border-outline-variant/25 font-bold focus:outline-none text-on-surface"
                            required
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary font-bold text-[10px]">$</span>
                              <input
                                type="number"
                                placeholder="Precio / uña"
                                value={newExtraPricePerNail}
                                onChange={(e) => setNewExtraPricePerNail(e.target.value)}
                                className="w-full bg-surface-container-lowest text-xs py-1.5 pl-6 pr-2 rounded-lg border border-outline-variant/25 font-mono font-bold focus:outline-none text-on-surface"
                                required
                              />
                            </div>
                            <label className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newExtraIsGlobal}
                                onChange={(e) => setNewExtraIsGlobal(e.target.checked)}
                                className="accent-primary rounded"
                              />
                              <span>Global (todos)</span>
                            </label>
                          </div>

                          <button
                            type="submit"
                            className="w-full text-[10px] font-bold bg-primary text-white py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Guardar Extra
                          </button>
                        </form>
                      )}

                      {/* Extra Price Audit Edit Form */}
                      {updatingExtraId && (
                        <form
                          onSubmit={(e) => handleUpdateExtraPriceSubmit(e, updatingExtraId)}
                          className="bg-surface-container p-3 rounded-xl border border-outline-variant/30 space-y-2.5 animate-in fade-in duration-150"
                        >
                          <div className="flex items-center justify-between">
                            <h6 className="text-[9px] uppercase tracking-wider font-bold text-primary">Ajustar Tarifa de Extra</h6>
                            <button
                              type="button"
                              onClick={() => setUpdatingExtraId(null)}
                              className="text-on-surface-variant/50 hover:text-on-surface p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              placeholder="Nuevo precio / uña"
                              value={updateExtraPriceVal}
                              onChange={(e) => setUpdateExtraPriceVal(e.target.value)}
                              className="bg-surface-container-lowest text-xs py-1.5 px-3 rounded-lg border border-outline-variant/25 font-mono font-bold focus:outline-none text-on-surface"
                              required
                            />
                            <input
                              type="date"
                              value={updateExtraPriceDate}
                              onChange={(e) => setUpdateExtraPriceDate(e.target.value)}
                              className="bg-surface-container-lowest text-[10px] py-1.5 px-2 rounded-lg border border-outline-variant/25 font-semibold focus:outline-none text-on-surface"
                              required
                            />
                          </div>

                          <input
                            type="text"
                            placeholder="Motivo (ej. Costo insumo importado)..."
                            value={updateExtraPriceReason}
                            onChange={(e) => setUpdateExtraPriceReason(e.target.value)}
                            className="w-full bg-surface-container-lowest text-[11px] py-1.5 px-3 rounded-lg border border-outline-variant/25 font-semibold focus:outline-none text-on-surface"
                          />

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setUpdatingExtraId(null)}
                              className="flex-1 text-[10px] font-bold bg-surface-container-high py-1.5 rounded-lg text-on-surface cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="submit"
                              className="flex-1 text-[10px] font-bold bg-primary text-white py-1.5 rounded-lg cursor-pointer"
                            >
                              Guardar Cambio
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Extras list */}
                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {serviceExtras.length === 0 ? (
                          <p className="text-[10px] text-on-surface-variant/50 text-center py-2 font-medium">
                            No hay extras configurados.
                          </p>
                        ) : (
                          serviceExtras.map((extra) => {
                            const isGlobal = !extra.serviceId;
                            return (
                              <div
                                key={extra.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-surface-container-lowest border border-outline-variant/25 text-xs hover:border-primary/30 transition-colors"
                              >
                                <div className="min-w-0 flex-1 pr-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-on-surface truncate">{extra.name}</span>
                                    {isGlobal ? (
                                      <span className="inline-flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-sage/10 text-sage" title="Disponible para cualquier servicio">
                                        <Globe size={9} /> Global
                                      </span>
                                    ) : (
                                      <span className="text-[8px] font-bold px-1.5 py-0.2 rounded-full bg-primary/10 text-primary">
                                        Exclusivo
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-mono font-bold text-primary mt-0.5">
                                    {formatMoney(extra.pricePerNail)} <span className="font-sans font-normal text-[9px] text-on-surface-variant/60">/ uña</span>
                                  </p>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      setUpdatingExtraId(extra.id);
                                      setUpdateExtraPriceVal(extra.pricePerNail.toString());
                                    }}
                                    className="p-1 rounded-lg text-on-surface-variant/60 hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                                    title="Modificar tarifa y registrar auditoría"
                                  >
                                    <Tag size={12} />
                                  </button>
                                  <button
                                    onClick={() => setExtraToDelete(extra)}
                                    className="p-1 rounded-lg text-terracotta/60 hover:text-terracotta hover:bg-terracotta/10 transition-colors cursor-pointer"
                                    title="Eliminar extra"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Accordion 2: HISTORIAL DE PRECIOS & AUDITORÍA */}
                <div>
                  <button
                    onClick={() => {
                      if (isPricesExpanded) {
                        setExpandedSection(null);
                      } else {
                        setExpandedSection({ serviceId: service.id, type: 'prices' });
                      }
                    }}
                    className="w-full flex items-center justify-between px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-primary/80 hover:text-primary transition-colors cursor-pointer"
                  >
                    <span>Historial de Precios & Auditoría</span>
                    {isPricesExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>

                  {isPricesExpanded && (
                    <div className="px-5 pb-5 pt-1 space-y-4 animate-in fade-in duration-200">
                      {/* Price update toggle form */}
                      {isUpdatingPrice ? (
                        <form
                          onSubmit={(e) => handleUpdatePriceSubmit(e, service.id)}
                          className="bg-surface-container p-3.5 rounded-2xl border border-outline-variant/30 space-y-3"
                        >
                          <h5 className="text-[9px] uppercase tracking-wider font-bold text-primary">Registrar Cambio de Tarifa</h5>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              placeholder="Nuevo Precio"
                              value={updatePriceVal}
                              onChange={(e) => setUpdatePriceVal(e.target.value)}
                              className="bg-surface-container-lowest text-xs py-1.5 px-3 rounded-lg border border-outline-variant/25 font-mono font-bold focus:outline-none text-on-surface"
                              required
                            />
                            <input
                              type="date"
                              value={updatePriceDate}
                              onChange={(e) => setUpdatePriceDate(e.target.value)}
                              className="bg-surface-container-lowest text-[10px] py-1.5 px-3 rounded-lg border border-outline-variant/25 font-semibold focus:outline-none text-on-surface"
                              required
                            />
                          </div>

                          <div>
                            <input
                              type="text"
                              placeholder="Motivo del cambio (Ej. Costos de acrílicos)..."
                              value={updatePriceReason}
                              onChange={(e) => setUpdatePriceReason(e.target.value)}
                              className="w-full bg-surface-container-lowest text-[11px] py-1.5 px-3 rounded-lg border border-outline-variant/25 font-semibold focus:outline-none text-on-surface"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setUpdatingServiceId(null)}
                              className="flex-1 text-[10px] font-bold bg-surface-container-high py-1.5 rounded-lg transition-colors text-on-surface cursor-pointer"
                            >
                              Atrás
                            </button>
                            <button
                              type="submit"
                              className="flex-1 text-[10px] font-bold bg-primary text-white py-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              Guardar
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-on-surface-variant/70 font-semibold">Toma de decisiones</span>
                          <button
                            onClick={() => {
                              setUpdatingServiceId(service.id);
                              setUpdatePriceVal(service.basePrice.toString());
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline bg-primary/5 px-2.5 py-1 rounded-full cursor-pointer"
                          >
                            <Tag size={10} /> Cambiar Tarifa
                          </button>
                        </div>
                      )}

                      {/* Timeline */}
                      <div className="space-y-3 pt-1">
                        {service.priceHistory && service.priceHistory.length > 0 ? (
                          <div className="relative border-l-2 border-outline-variant/40 ml-1.5 pl-3 space-y-4">
                            {service.priceHistory.map((history, idx) => (
                              <div key={idx} className="relative space-y-1 text-[11px] font-semibold">
                                {/* Node dot */}
                                <span className="absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full border-2 border-primary bg-white"></span>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1 text-on-surface-variant/80">
                                    <Calendar size={10} className="opacity-50" />
                                    <span>{history.date}</span>
                                  </div>
                                  <span className="font-mono font-black text-on-surface">{formatMoney(history.price)}</span>
                                </div>
                                {history.reason && (
                                  <p className="text-[10px] font-medium text-on-surface-variant/60 leading-normal italic pl-1">
                                    "{history.reason}"
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[10px] text-on-surface-variant/50 text-center font-medium">Sin historial registrado.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CONFIRMATION MODAL: ELIMINAR EXTRA */}
      <Modal
        isOpen={!!extraToDelete}
        onClose={() => setExtraToDelete(null)}
        icon={<AlertTriangle size={18} className="text-terracotta" />}
        title="¿Eliminar este diseño extra?"
        subtitle={extraToDelete ? `Extra: ${extraToDelete.name}` : undefined}
        maxWidth="sm"
      >
        {extraToDelete && (
          <div className="space-y-4">
            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/20 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-on-surface text-sm">{extraToDelete.name}</span>
                <span className="font-mono font-black text-primary">{formatMoney(extraToDelete.pricePerNail)} / uña</span>
              </div>
              <p className="text-[11px] text-on-surface-variant/70">
                {extraToDelete.serviceId ? 'Diseño exclusivo de servicio' : 'Diseño global (disponible en todos los servicios)'}
              </p>
            </div>

            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Esta acción removerá el diseño del catálogo de extras. No alterará las citas pasadas ya completadas.
            </p>

            <div className="flex gap-2.5 justify-end pt-1">
              <button
                type="button"
                onClick={() => setExtraToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-surface-container-high rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high/80 active:scale-95 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const extraName = extraToDelete.name;
                  onDeleteExtra(extraToDelete.id);
                  setExtraToDelete(null);
                  toast.info(`Diseño/extra "${extraName}" eliminado.`);
                }}
                className="flex-1 py-2.5 px-4 bg-terracotta text-white rounded-xl text-xs font-bold shadow-xs hover:bg-terracotta/95 active:scale-95 transition-all cursor-pointer"
              >
                Eliminar Extra
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* CONFIRMATION MODAL: ELIMINAR SERVICIO */}
      <Modal
        isOpen={!!serviceToDelete}
        onClose={() => setServiceToDelete(null)}
        icon={<AlertTriangle size={18} className="text-terracotta" />}
        title="¿Eliminar este servicio?"
        subtitle={serviceToDelete ? serviceToDelete.name : undefined}
        maxWidth="sm"
      >
        {serviceToDelete && (
          <div className="space-y-4">
            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/20 text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-on-surface text-sm">{serviceToDelete.name}</span>
                <span className="font-mono font-black text-primary">{formatMoney(serviceToDelete.basePrice)}</span>
              </div>
              <p className="text-[11px] text-on-surface-variant/70 line-clamp-2">
                {serviceToDelete.description}
              </p>
            </div>

            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Esta acción eliminará el servicio y sus tarifas especiales asociadas del catálogo.
            </p>

            <div className="flex gap-2.5 justify-end pt-1">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-surface-container-high rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high/80 active:scale-95 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const sName = serviceToDelete.name;
                  onDeleteService(serviceToDelete.id);
                  setServiceToDelete(null);
                  toast.info(`Servicio "${sName}" eliminado.`);
                }}
                className="flex-1 py-2.5 px-4 bg-terracotta text-white rounded-xl text-xs font-bold shadow-xs hover:bg-terracotta/95 active:scale-95 transition-all cursor-pointer"
              >
                Eliminar Servicio
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
};
