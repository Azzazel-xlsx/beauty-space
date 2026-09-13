import React, { useState } from 'react';
import { Service } from '../types';
import { Plus, Sparkles, Tag, Calendar, ChevronDown, ChevronUp, Clock, Trash2, ArrowUpRight, DollarSign, PenTool, HelpCircle, FileText } from 'lucide-react';
import { formatMoney } from '../utils/formatters';

interface ServiciosProps {
  services: Service[];
  onAddService: (service: Omit<Service, 'id' | 'priceHistory'> & { initialPrice: number }) => void;
  onUpdateServicePrice: (serviceId: string, newPrice: number, date: string, reason?: string) => void;
  onDeleteService: (serviceId: string) => void;
}

export const Servicios: React.FC<ServiciosProps> = ({
  services,
  onAddService,
  onUpdateServicePrice,
  onDeleteService
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [expandedServiceId, setExpandedServiceId] = useState<string | null>(null);

  // New Service Form state
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newDuration, setNewDuration] = useState('90');
  const [addError, setAddError] = useState('');

  // Update Price Form state with audit reason
  const [updatePriceVal, setUpdatePriceVal] = useState('');
  const [updatePriceDate, setUpdatePriceDate] = useState(new Date().toISOString().split('T')[0]);
  const [updatePriceReason, setUpdatePriceReason] = useState('');
  const [updatingServiceId, setUpdatingServiceId] = useState<string | null>(null);

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

    onAddService({
      name: newName,
      description: newDesc || 'Sin descripción particular.',
      basePrice: parsedPrice,
      duration: parseInt(newDuration),
      initialPrice: parsedPrice
    });

    // Reset Form
    setNewName('');
    setNewDesc('');
    setNewPrice('');
    setNewDuration('90');
    setAddError('');
    setShowAddForm(false);
  };

  const handleUpdatePriceSubmit = (e: React.FormEvent, serviceId: string) => {
    e.preventDefault();
    const parsedPrice = parseFloat(updatePriceVal);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      alert('Introduce un precio válido');
      return;
    }
    if (!updatePriceDate) {
      alert('Elige una fecha para el registro histórico');
      return;
    }

    const defaultReason = 'Actualización de tarifa por costes e inflación de insumos.';
    onUpdateServicePrice(serviceId, parsedPrice, updatePriceDate, updatePriceReason.trim() || defaultReason);
    
    // Reset state
    setUpdatePriceVal('');
    setUpdatePriceReason('');
    setUpdatingServiceId(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Banner / Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container border border-outline-variant/40 rounded-2xl p-6 hard-shadow">
        <div>
          <h2 className="font-serif text-lg font-bold text-primary">Servicios del Atelier</h2>
          <p className="text-xs text-on-surface-variant/75 mt-0.5">
            Configura tus tratamientos de manicura, extensiones, nail art y pedicura
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full text-xs font-bold transition-all hover:bg-primary/90 editorial-shadow"
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
            <p className="text-[11px] text-on-surface-variant/70 mt-1">Inserta los datos iniciales para la carta de servicios</p>
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
                placeholder="Detalla los materiales, duración o beneficios..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                className="w-full bg-surface-container-low text-xs py-2.5 px-4 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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

              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Duración del Bloqueo (Minutos)</label>
                <select
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2.5 px-4 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
                >
                  <option value="30">30 minutos (Retiro rápido)</option>
                  <option value="45">45 minutos</option>
                  <option value="60">1 hora (Manicura básica)</option>
                  <option value="90">1.5 horas (Manicura profunda)</option>
                  <option value="120">2 horas (Gel X / Diseño avanzado)</option>
                  <option value="180">3 horas (Full Editorial)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-surface-container-high text-on-surface text-xs font-bold py-3 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 bg-primary text-white text-xs font-bold py-3 rounded-xl transition-all editorial-shadow"
              >
                Crear Servicio
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SERVICES LISTING GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {services.map((service) => {
          const isExpanded = expandedServiceId === service.id;
          const isUpdatingPrice = updatingServiceId === service.id;

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
                    onClick={() => {
                      if (confirm(`¿Estás segura de eliminar el servicio "${service.name}" del catálogo?`)) {
                        onDeleteService(service.id);
                      }
                    }}
                    className="text-on-surface-variant/40 hover:text-terracotta p-1 rounded-full hover:bg-terracotta/15 transition-all"
                    title="Eliminar del catálogo"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Description */}
                <p className="text-xs text-on-surface-variant/80 font-medium leading-relaxed min-h-[40px]">
                  {service.description}
                </p>

                {/* Duration info */}
                <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant/70 font-bold">
                  <Clock size={11} className="text-primary/70" />
                  <span>Bloqueo: {service.duration || 90} minutos</span>
                </div>

                {/* Base price */}
                <div className="flex items-baseline justify-between border-t border-outline-variant/20 pt-3">
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-on-surface-variant/60">Precio Actual</span>
                  <span className="font-serif text-lg font-black text-primary">{formatMoney(service.basePrice)}</span>
                </div>
              </div>

              {/* Collapsible expansion zone for price history and update form */}
              <div className="bg-surface-container-low/40 border-t border-outline-variant/20">
                {/* Expand Accordion Button */}
                <button
                  onClick={() => setExpandedServiceId(isExpanded ? null : service.id)}
                  className="w-full flex items-center justify-between px-5 py-3 text-[10px] uppercase tracking-widest font-bold text-primary/80 hover:text-primary transition-colors"
                >
                  <span>Historial de Precios & Auditoría</span>
                  {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>

                {isExpanded && (
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
                            className="flex-1 text-[10px] font-bold bg-surface-container-high py-1.5 rounded-lg transition-colors text-on-surface"
                          >
                            Atrás
                          </button>
                          <button
                            type="submit"
                            className="flex-1 text-[10px] font-bold bg-primary text-white py-1.5 rounded-lg transition-colors"
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
                          className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline bg-primary/5 px-2.5 py-1 rounded-full"
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
          );
        })}
      </div>

    </div>
  );
};
