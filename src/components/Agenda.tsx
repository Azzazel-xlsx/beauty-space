import React, { useState, useMemo, useEffect } from 'react';
import { Appointment, Client, Service, SpecialPrice, Extra, AppointmentExtra } from '../types';
import {
  Plus, ChevronLeft, ChevronRight, MapPin, Clock, CheckCircle2,
  Sparkles, AlertCircle, Sparkle, RefreshCw, AlertTriangle, Trash2, X,
  Minus, Layers, Eye
} from 'lucide-react';
import { generateId } from '../utils/id';
import { formatMoney } from '../utils/formatters';
import { Modal } from './Modal';
import { AppointmentDetailModal } from './AppointmentDetailModal';

interface AgendaProps {
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  extras: Extra[];
  specialPrices: SpecialPrice[];
  onAddAppointment: (appointment: Omit<Appointment, 'id'> & { id?: string }) => void;
  onUpdateAppointmentStatus: (id: string, status: Appointment['status'], cancelReason?: string, rescheduledToId?: string) => void;
  onUpdateAppointmentExtras?: (
    appointmentId: string,
    updatedExtras: AppointmentExtra[],
    isHomeVisit: boolean,
    homeVisitFee: number,
    newTotal: number
  ) => void;
  onCompleteAppointmentAndCharge?: (id: string, costOfSupplies: number, staffCommissionPercent: number, paymentMethod: string) => void;
  onDeleteAppointment?: (id: string) => void;
}

export const Agenda: React.FC<AgendaProps> = ({
  appointments,
  clients,
  services,
  extras,
  specialPrices,
  onAddAppointment,
  onUpdateAppointmentStatus,
  onUpdateAppointmentExtras,
  onCompleteAppointmentAndCharge,
  onDeleteAppointment
}) => {
  // Screen size detection to guarantee desktop scroll is never hijacked
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calendar states
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 15)); // Default to July 2026 for alignment with seed dates
  const [selectedDateStr, setSelectedDateStr] = useState('2026-07-15');
  const [showAddForm, setShowAddForm] = useState(false);

  // New Appointment Form State
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [apptTime, setApptTime] = useState('10:00');
  const [apptDuration, setApptDuration] = useState('90');
  const [isHome, setIsHome] = useState(false);
  const [homeVisitFee, setHomeVisitFee] = useState('300');
  const [customPrice, setCustomPrice] = useState('');
  const [bookingExtras, setBookingExtras] = useState<{ [extraId: string]: number }>({});
  const [showExtrasSelector, setShowExtrasSelector] = useState(false);
  const [formError, setFormError] = useState('');

  // Floating Modals States
  const [detailAppt, setDetailAppt] = useState<Appointment | null>(null);
  const [apptToDelete, setApptToDelete] = useState<Appointment | null>(null);
  const [selectedApptForReschedule, setSelectedApptForReschedule] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00');
  const [rescheduleDuration, setRescheduleDuration] = useState('90');

  // Complete appointment dialog state
  const [activeApptForCompletion, setActiveApptForCompletion] = useState<Appointment | null>(null);
  const [completionCostOfSupplies, setCompletionCostOfSupplies] = useState('150');
  const [completionCommissionPercent, setCompletionCommissionPercent] = useState('15');
  const [completionPaymentMethod, setCompletionPaymentMethod] = useState('TRANSFERENCIA');

  // Helper: Convert time "HH:MM" to minutes-from-midnight
  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Conflict Overlap Calculator for new booking
  const scheduleOverlapAlert = useMemo(() => {
    if (!apptTime || !apptDuration || !selectedDateStr) return null;

    const newStart = timeToMinutes(apptTime);
    const newEnd = newStart + parseInt(apptDuration);

    const dayAppts = appointments.filter(
      (a) => a.date === selectedDateStr && a.status !== 'cancelled'
    );

    for (const appt of dayAppts) {
      const apptStart = timeToMinutes(appt.time);
      const apptEnd = apptStart + appt.duration;

      if (newStart < apptEnd && apptStart < newEnd) {
        const collidingClient = clients.find((c) => c.id === appt.clientId);
        const collidingService = services.find((s) => s.id === appt.serviceId);
        return {
          clientName: collidingClient ? collidingClient.name : 'Otra clienta',
          serviceName: collidingService ? collidingService.name : 'Tratamiento',
          timeRange: `${appt.time} - ${collidingService?.name || ''}`,
          time: appt.time
        };
      }
    }
    return null;
  }, [apptTime, apptDuration, selectedDateStr, appointments, clients, services]);

  // Rescheduling Conflict Calculator
  const rescheduleOverlapAlert = useMemo(() => {
    if (!rescheduleTime || !rescheduleDuration || !rescheduleDate) return null;

    const newStart = timeToMinutes(rescheduleTime);
    const newEnd = newStart + parseInt(rescheduleDuration);

    const dayAppts = appointments.filter(
      (a) => a.date === rescheduleDate && a.status !== 'cancelled' && a.id !== selectedApptForReschedule?.id
    );

    for (const appt of dayAppts) {
      const apptStart = timeToMinutes(appt.time);
      const apptEnd = apptStart + appt.duration;

      if (newStart < apptEnd && apptStart < newEnd) {
        const collidingClient = clients.find((c) => c.id === appt.clientId);
        return collidingClient ? collidingClient.name : 'Otra clienta';
      }
    }
    return null;
  }, [rescheduleTime, rescheduleDuration, rescheduleDate, appointments, clients, selectedApptForReschedule]);

  // Auto-detect special VIP price
  const activeSpecialPrice = useMemo(() => {
    if (!selectedClient || !selectedService) return null;
    const match = specialPrices.find(
      sp => sp.clientId === selectedClient && sp.serviceId === selectedService && sp.isActive
    );
    return match ? match.specialPrice : null;
  }, [selectedClient, selectedService, specialPrices]);

  // Sync price and duration when service or client changes
  const handleServiceChange = (serviceId: string) => {
    setSelectedService(serviceId);
    setBookingExtras({}); // Reset extras for clean selection

    const s = services.find(srv => srv.id === serviceId);
    if (s) {
      // Auto-populate duration from the service's configured duration
      if (s.duration) {
        setApptDuration(s.duration.toString());
      }
      // If VIP price exists for this client, apply it; otherwise apply basePrice
      const vipMatch = specialPrices.find(
        sp => sp.clientId === selectedClient && sp.serviceId === serviceId && sp.isActive
      );
      if (vipMatch) {
        setCustomPrice(vipMatch.specialPrice.toString());
      } else {
        setCustomPrice(s.basePrice.toString());
      }
    } else {
      setCustomPrice('');
    }
  };

  // Sync price if client changes while service is already selected
  useEffect(() => {
    if (activeSpecialPrice !== null) {
      setCustomPrice(activeSpecialPrice.toString());
    } else if (selectedService) {
      const s = services.find(srv => srv.id === selectedService);
      if (s) {
        setCustomPrice(s.basePrice.toString());
      }
    }
  }, [selectedClient, activeSpecialPrice]);

  // Available extras for the currently selected service
  const availableBookingExtras = useMemo(() => {
    return extras.filter(e => !e.serviceId || e.serviceId === selectedService);
  }, [extras, selectedService]);

  // Real-time calculation of pre-selected extras
  const extrasSubtotal = useMemo(() => {
    return availableBookingExtras.reduce((sum, extra) => {
      const qty = bookingExtras[extra.id] || 0;
      return sum + (qty * extra.pricePerNail);
    }, 0);
  }, [availableBookingExtras, bookingExtras]);

  const totalNailsSelected = useMemo(() => {
    return Object.values(bookingExtras).reduce((sum, qty) => sum + qty, 0);
  }, [bookingExtras]);

  const calculatedHomeFee = useMemo(() => {
    return isHome ? (parseFloat(homeVisitFee) || 0) : 0;
  }, [isHome, homeVisitFee]);

  const totalCalculated = useMemo(() => {
    const base = parseFloat(customPrice) || 0;
    return base + extrasSubtotal + calculatedHomeFee;
  }, [customPrice, extrasSubtotal, calculatedHomeFee]);

  // Monthly Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();
  // Adjust Monday as start (0=Monday, 6=Sunday)
  const startingDay = (firstDayIndex + 6) % 7;

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Group appointments by date
  const appointmentsMap = useMemo(() => {
    const map: { [key: string]: Appointment[] } = {};
    for (const appt of appointments) {
      if (!map[appt.date]) {
        map[appt.date] = [];
      }
      map[appt.date].push(appt);
    }
    return map;
  }, [appointments]);

  // Selected Day appointments
  const selectedDayAppointments = useMemo(() => {
    const raw = appointmentsMap[selectedDateStr] || [];
    return [...raw].sort((a, b) => a.time.localeCompare(b.time));
  }, [appointmentsMap, selectedDateStr]);

  // Handle Booking Submit
  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !selectedService || !customPrice || !apptTime) {
      setFormError('Por favor completa todos los campos requeridos');
      return;
    }

    const priceNum = parseFloat(customPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      setFormError('Introduce un monto de tarifa válido');
      return;
    }

    // Prepare extras
    const apptExtras: AppointmentExtra[] = [];
    for (const extra of availableBookingExtras) {
      const qty = bookingExtras[extra.id] || 0;
      if (qty > 0) {
        apptExtras.push({
          extraId: extra.id,
          name: extra.name,
          pricePerNail: extra.pricePerNail,
          quantity: qty,
          subtotal: qty * extra.pricePerNail
        });
      }
    }

    onAddAppointment({
      clientId: selectedClient,
      serviceId: selectedService,
      date: selectedDateStr,
      time: apptTime,
      duration: parseInt(apptDuration),
      isHomeVisit: isHome,
      homeVisitFee: calculatedHomeFee,
      basePrice: priceNum,
      extras: apptExtras,
      status: 'pending',
      priceCharged: totalCalculated
    });

    // Reset Form
    setSelectedClient('');
    setSelectedService('');
    setApptTime('10:00');
    setApptDuration('90');
    setIsHome(false);
    setHomeVisitFee('300');
    setBookingExtras({});
    setShowExtrasSelector(false);
    setFormError('');
    setShowAddForm(false);
  };

  // Rescheduling submit logic
  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApptForReschedule || !rescheduleDate || !rescheduleTime) {
      return;
    }

    const newApptId = generateId('appt');
    onAddAppointment({
      id: newApptId,
      clientId: selectedApptForReschedule.clientId,
      serviceId: selectedApptForReschedule.serviceId,
      date: rescheduleDate,
      time: rescheduleTime,
      duration: parseInt(rescheduleDuration),
      isHomeVisit: selectedApptForReschedule.isHomeVisit,
      homeVisitFee: selectedApptForReschedule.homeVisitFee,
      basePrice: selectedApptForReschedule.basePrice,
      extras: selectedApptForReschedule.extras,
      status: 'pending',
      priceCharged: selectedApptForReschedule.priceCharged
    });

    onUpdateAppointmentStatus(selectedApptForReschedule.id, 'reagendada', 'Cliente reagendó el turno.', newApptId);
    setSelectedApptForReschedule(null);
  };

  // Complete & Charge submission
  const handleCompleteAndChargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeApptForCompletion) return;

    const costVal = parseFloat(completionCostOfSupplies) || 0;
    const commPercentVal = parseFloat(completionCommissionPercent) || 0;

    if (onCompleteAppointmentAndCharge) {
      onCompleteAppointmentAndCharge(
        activeApptForCompletion.id,
        costVal,
        commPercentVal,
        completionPaymentMethod
      );
    } else {
      onUpdateAppointmentStatus(activeApptForCompletion.id, 'completed');
    }

    setActiveApptForCompletion(null);
  };

  const formatSelectedDateHuman = () => {
    const parts = selectedDateStr.split('-');
    if (parts.length !== 3) return selectedDateStr;
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  };

  const formatDurationText = (minutes?: number) => {
    const total = minutes || 90;
    const hours = Math.floor(total / 60);
    const mins = total % 60;
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m (${total} min)`;
    if (hours > 0) return `${hours}h (${total} min)`;
    return `${mins} min`;
  };

  // Reusable booking form content
  const renderBookingForm = () => (
    <form onSubmit={handleBookingSubmit} className="space-y-3.5">
      {formError && (
        <div className="bg-terracotta/10 border border-terracotta/20 text-terracotta p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle size={14} className="shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Colliding Overlap Alert */}
      {scheduleOverlapAlert && (
        <div className="bg-gold/15 border border-gold/30 text-on-surface p-2.5 sm:p-3 rounded-xl text-xs flex gap-2.5 items-start animate-pulse">
          <AlertTriangle className="text-gold-dark shrink-0 mt-0.5" size={15} />
          <div>
            <p className="font-bold text-gold-dark text-[11px]">¡Alerta preventiva de solapamiento!</p>
            <p className="text-[10px] sm:text-[11px] text-on-surface-variant/90 leading-relaxed mt-0.5">
              Cita con <strong>{scheduleOverlapAlert.clientName}</strong> a las <strong>{scheduleOverlapAlert.time}</strong> en horario coincidente.
            </p>
          </div>
        </div>
      )}

      {/* Client Select */}
      <div>
        <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Clienta</label>
        <select
          value={selectedClient}
          onChange={(e) => setSelectedClient(e.target.value)}
          className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold text-on-surface truncate"
          required
        >
          <option value="">Selecciona una clienta...</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Service Select */}
      <div>
        <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Tratamiento</label>
        <select
          value={selectedService}
          onChange={(e) => handleServiceChange(e.target.value)}
          className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold text-on-surface truncate"
          required
        >
          <option value="">Selecciona el servicio...</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({formatMoney(s.basePrice)}) — {formatDurationText(s.duration)}
            </option>
          ))}
        </select>
      </div>

      {/* VIP alert banner */}
      {activeSpecialPrice !== null && (
        <div className="bg-sage/10 border border-sage/25 text-sage p-2.5 rounded-xl flex items-center justify-between text-[10px] sm:text-[11px] font-bold">
          <span className="flex items-center gap-1.5 truncate">
            <Sparkles size={13} className="shrink-0 fill-sage/20" />
            <span className="truncate">Tarifa VIP aplicada</span>
          </span>
          <span className="font-mono bg-white px-2 py-0.5 rounded-full border border-sage/30 shrink-0 font-black">
            {formatMoney(activeSpecialPrice)}
          </span>
        </div>
      )}

      {/* Time and Duration */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        <div>
          <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Hora</label>
          <input
            type="time"
            value={apptTime}
            onChange={(e) => setApptTime(e.target.value)}
            className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold text-on-surface"
            required
          />
        </div>

        <div>
          <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">
            Duración (Auto)
          </label>
          <select
            value={apptDuration}
            onChange={(e) => setApptDuration(e.target.value)}
            className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold text-on-surface truncate"
          >
            <option value="30">30 min (Retiro)</option>
            <option value="45">45 min</option>
            <option value="60">1 h (Básica)</option>
            <option value="90">1.5 h (Profunda)</option>
            <option value="120">2 h (Gel X / Arte)</option>
            <option value="150">2.5 h</option>
            <option value="180">3 h (Full Editorial)</option>
          </select>
        </div>
      </div>

      {/* Base Price */}
      <div>
        <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">
          Precio Base Cobrado ($)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary font-bold text-xs">$</span>
          <input
            type="number"
            placeholder="0.00"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            className="w-full bg-surface-container-low text-xs py-2 pl-7 pr-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-bold"
            required
          />
        </div>
      </div>

      {/* EXTRAS PRESELECTION (Phase 2 requirement) */}
      <div className="bg-surface-container-low/60 p-3 rounded-xl border border-outline-variant/25 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] uppercase tracking-wider font-bold text-primary flex items-center gap-1.5">
            <Sparkles size={12} className="text-primary-container" />
            Extras de Uñas (Opcional)
          </label>
          <button
            type="button"
            onClick={() => setShowExtrasSelector(!showExtrasSelector)}
            className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
          >
            {showExtrasSelector ? 'Ocultar catálogo' : totalNailsSelected > 0 ? `${totalNailsSelected} uñas seleccionadas` : '+ Seleccionar extras'}
          </button>
        </div>

        {/* Expandable list of available extras with steppers 0-10 */}
        <div className={`space-y-1.5 overflow-hidden transition-all duration-200 ${showExtrasSelector ? 'max-h-64 overflow-y-auto mt-2 pr-0.5' : 'max-h-0'}`}>
          {availableBookingExtras.length === 0 ? (
            <p className="text-[10px] text-on-surface-variant/60 italic py-1">
              No hay extras registrados para este tratamiento.
            </p>
          ) : (
            availableBookingExtras.map((extra) => {
              const currentQty = bookingExtras[extra.id] || 0;
              return (
                <div
                  key={extra.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/20 text-xs"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <span className="font-semibold text-on-surface truncate block text-[11px]">{extra.name}</span>
                    <span className="font-mono text-[9px] text-on-surface-variant/70 font-bold">
                      {formatMoney(extra.pricePerNail)}/uña
                    </span>
                  </div>

                  {/* Stepper 0 to 10 */}
                  <div className="flex items-center gap-1.5 bg-surface-container-low px-2 py-0.5 rounded-lg border border-outline-variant/25">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0, currentQty - 1);
                        setBookingExtras(prev => ({ ...prev, [extra.id]: next }));
                      }}
                      className="w-4 h-4 flex items-center justify-center text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      <Minus size={10} />
                    </button>
                    <span className={`font-mono font-bold text-xs w-3 text-center ${currentQty > 0 ? 'text-primary' : 'text-on-surface-variant/50'}`}>
                      {currentQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(10, currentQty + 1);
                        setBookingExtras(prev => ({ ...prev, [extra.id]: next }));
                      }}
                      className="w-4 h-4 flex items-center justify-center text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
                    >
                      <Plus size={10} />
                    </button>
                  </div>

                  {currentQty > 0 && (
                    <span className="font-mono text-[10px] font-black text-primary w-14 text-right shrink-0">
                      +{formatMoney(currentQty * extra.pricePerNail)}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* CHECKBOX ¿A DOMICILIO? WITH SMOOTH COLLAPSE / EXPAND (Phase 1 requirement) */}
      <div className="bg-surface-container-low/50 p-3 rounded-xl border border-outline-variant/25 space-y-2">
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isHome}
            onChange={(e) => setIsHome(e.target.checked)}
            className="w-4 h-4 accent-primary rounded cursor-pointer shrink-0"
          />
          <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
            <MapPin size={13} className="text-primary" />
            ¿Servicio a domicilio?
          </span>
        </label>

        {/* Smooth collapse / expand box */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isHome ? 'max-h-28 opacity-100 mt-2' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="p-2.5 bg-surface-container-lowest rounded-xl border border-outline-variant/30 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[9px] uppercase tracking-wider font-bold text-primary">
                Cobro Adicional por Traslado
              </label>
              <div className="relative w-28">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-primary font-bold text-xs">$</span>
                <input
                  type="number"
                  placeholder="300"
                  value={homeVisitFee}
                  onChange={(e) => setHomeVisitFee(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-1 pl-6 pr-2 rounded-lg border border-outline-variant/25 font-mono font-bold text-primary focus:outline-none focus:border-primary text-right"
                />
              </div>
            </div>
            <p className="text-[9px] text-on-surface-variant/60 font-medium">
              Se sumará automáticamente al importe total a cobrar
            </p>
          </div>
        </div>
      </div>

      {/* REAL-TIME TOTAL RECALCULATION SUMMARY */}
      <div className="bg-surface-container p-3 rounded-xl border border-outline-variant/30 space-y-1 text-xs">
        <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-semibold">
          <span>Servicio base:</span>
          <span className="font-mono font-bold text-on-surface">{formatMoney(parseFloat(customPrice) || 0)}</span>
        </div>
        {extrasSubtotal > 0 && (
          <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-semibold">
            <span>Extras ({totalNailsSelected} uñas):</span>
            <span className="font-mono font-bold text-primary">+{formatMoney(extrasSubtotal)}</span>
          </div>
        )}
        {isHome && calculatedHomeFee > 0 && (
          <div className="flex justify-between items-center text-[10px] text-on-surface-variant font-semibold">
            <span>Recargo domicilio:</span>
            <span className="font-mono font-bold text-primary">+{formatMoney(calculatedHomeFee)}</span>
          </div>
        )}
        <div className="border-t border-outline-variant/25 pt-1.5 flex justify-between items-baseline">
          <span className="font-serif text-xs font-bold text-primary">Total Cita:</span>
          <span className="font-serif text-base font-black text-primary">
            {formatMoney(totalCalculated)}
          </span>
        </div>
      </div>

      {/* Form Action buttons */}
      <div className="flex gap-2.5 pt-1">
        <button
          type="button"
          onClick={() => setShowAddForm(false)}
          className="flex-1 py-2.5 bg-surface-container-high rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high/80 active:scale-95 transition-all cursor-pointer"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="flex-1 py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-xs hover:bg-primary/95 active:scale-95 transition-all cursor-pointer"
        >
          Confirmar Reserva
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">

      {/* Main Grid: Calendar on Left (7 cols), Selected Day & Booking on Right (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        
        {/* LEFT COLUMN: Calendar Month Matrix */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/35 p-4 sm:p-6 rounded-2xl sm:rounded-3xl hard-shadow space-y-4">
          
          {/* Month Header controls */}
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-base sm:text-lg font-bold text-primary capitalize flex items-center gap-2">
              <Clock className="text-primary-container" size={18} />
              {monthNames[month]} {year}
            </h3>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-full hover:bg-surface-container text-on-surface transition-colors cursor-pointer active:scale-90"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-full hover:bg-surface-container text-on-surface transition-colors cursor-pointer active:scale-90"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Weekday Labels (Mon-Sun) */}
          <div className="grid grid-cols-7 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-on-surface-variant/60 pb-1 border-b border-outline-variant/20">
            <span>Lun</span>
            <span>Mar</span>
            <span>Mié</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sáb</span>
            <span>Dom</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {/* Empty offset padding cells */}
            {Array.from({ length: startingDay }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-10 sm:h-12 rounded-xl bg-transparent"></div>
            ))}

            {/* Real Month Days */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
              const isSelected = dayStr === selectedDateStr;
              const dayAppts = appointmentsMap[dayStr] || [];
              const pendingCount = dayAppts.filter(a => a.status === 'pending').length;
              const completedCount = dayAppts.filter(a => a.status === 'completed').length;

              return (
                <button
                  key={dayStr}
                  type="button"
                  onClick={() => {
                    setSelectedDateStr(dayStr);
                  }}
                  className={`relative h-11 sm:h-13 rounded-xl sm:rounded-2xl p-1 flex flex-col justify-between items-center transition-all cursor-pointer select-none active:scale-95 ${
                    isSelected
                      ? 'bg-primary text-white shadow-sm ring-2 ring-primary ring-offset-2 ring-offset-surface'
                      : 'hover:bg-surface-container-low text-on-surface'
                  }`}
                >
                  <span className={`text-xs sm:text-sm font-bold ${isSelected ? 'text-white' : 'text-on-surface'}`}>
                    {dayNum}
                  </span>

                  {/* Day activity dots / indicators */}
                  {dayAppts.length > 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      {pendingCount > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`}
                          title={`${pendingCount} turnos programados`}
                        />
                      )}
                      {completedCount > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : 'bg-sage'}`}
                          title={`${completedCount} turnos completados`}
                        />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Day appointments list + Desktop Booking Form */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-5">
          
          {/* Selected Day Info Card */}
          <div className="bg-surface-container-low border border-outline-variant/35 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl hard-shadow space-y-3 sm:space-y-4">
            
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h4 className="font-serif text-xs sm:text-sm font-black text-primary capitalize truncate">{formatSelectedDateHuman()}</h4>
                <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-bold mt-0.5">
                  {selectedDayAppointments.length} turnos registrados
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setSelectedApptForReschedule(null);
                  setApptToDelete(null);
                  setActiveApptForCompletion(null);
                }}
                className={`flex items-center justify-center gap-1 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer active:scale-95 ${
                  showAddForm
                    ? 'bg-surface-container-high text-on-surface hover:bg-surface-container-high/80'
                    : 'bg-primary text-white hover:bg-primary/95'
                }`}
              >
                {showAddForm ? (
                  <>
                    <X size={13} /> Cerrar
                  </>
                ) : (
                  <>
                    <Plus size={13} /> Reservar
                  </>
                )}
              </button>
            </div>

            <div className="wavy-divider opacity-30"></div>

            {/* Turn list */}
            <div className="space-y-2.5 sm:space-y-3 max-h-[380px] sm:max-h-[460px] overflow-y-auto pr-0.5">
              {selectedDayAppointments.length === 0 ? (
                <div className="py-10 sm:py-14 text-center text-xs text-on-surface-variant/50 font-semibold border border-dashed border-outline-variant/25 rounded-2xl">
                  No hay turnos agendados para esta fecha.
                </div>
              ) : (
                selectedDayAppointments.map((appt) => {
                  const client = clients.find(c => c.id === appt.clientId);
                  const service = services.find(s => s.id === appt.serviceId);

                  if (!client || !service) return null;

                  const totalNailsOnAppt = appt.extras ? appt.extras.reduce((a, c) => a + c.quantity, 0) : 0;

                  return (
                    <div
                      key={appt.id}
                      className="bg-surface-container-lowest border border-outline-variant/20 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl space-y-2.5 hard-shadow active:scale-[0.99] transition-transform motion-reduce:transform-none"
                    >
                      {/* Turn details */}
                      <div className="flex items-start gap-2.5">
                        <img
                          src={client.photoUrl}
                          alt={client.name}
                          className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border border-primary/20 p-0.5 bg-white shrink-0"
                        />
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center justify-between gap-1.5">
                            <h5 className="text-xs font-bold text-on-surface truncate">{client.name}</h5>
                            {/* Status Tag */}
                            <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider shrink-0 ${
                              appt.status === 'completed' ? 'bg-sage/10 text-sage' :
                              appt.status === 'cancelled' ? 'bg-terracotta/10 text-terracotta' :
                              appt.status === 'reagendada' ? 'bg-gold/10 text-gold-dark' :
                              'bg-primary/10 text-primary'
                            }`}>
                              {appt.status === 'completed' && 'Completada'}
                              {appt.status === 'cancelled' && 'Cancelada'}
                              {appt.status === 'reagendada' && 'Reagendada'}
                              {appt.status === 'pending' && 'Programada'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-[10px] text-on-surface-variant/70 font-semibold">
                            <Clock size={10} className="text-primary/70 shrink-0" />
                            <span>{appt.time} ({formatDurationText(appt.duration)})</span>
                          </div>
                        </div>
                      </div>

                      {/* Service strip */}
                      <div className="flex items-center justify-between text-[10px] sm:text-[11px] bg-surface-container/40 px-2.5 py-1.5 rounded-lg sm:rounded-xl">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-on-surface-variant truncate">{service.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {appt.isHomeVisit && (
                              <span className="text-[9px] text-primary font-bold flex items-center gap-0.5">
                                <MapPin size={8} /> Domicilio
                              </span>
                            )}
                            {totalNailsOnAppt > 0 && (
                              <span className="text-[9px] text-sage font-bold flex items-center gap-0.5">
                                <Sparkles size={8} /> {totalNailsOnAppt} uñas con diseño
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono font-black text-primary shrink-0">{formatMoney(appt.priceCharged)}</span>
                      </div>

                      {appt.cancelReason && (
                        <div className="bg-terracotta/5 p-2 rounded-lg border border-terracotta/15 text-[10px] font-medium text-on-surface-variant/80 italic">
                          Motivo cancelación: "{appt.cancelReason}"
                        </div>
                      )}

                      {/* Button Row: Detalle & Extras + Action buttons */}
                      <div className="flex items-center gap-1.5 border-t border-outline-variant/15 pt-2">
                        
                        {/* Detalle & Extras Button (Phase 2 core feature) */}
                        <button
                          type="button"
                          onClick={() => setDetailAppt(appt)}
                          className="flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-xl bg-surface-container-high hover:bg-surface-container-high/80 text-on-surface text-[10px] font-bold tracking-wide transition-all cursor-pointer"
                          title="Ver y editar detalles, extras y desglose"
                        >
                          <Eye size={11} className="text-primary" />
                          <span>Detalle & Extras</span>
                        </button>

                        {appt.status === 'pending' ? (
                          <>
                            {/* Cobrar Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveApptForCompletion(appt);
                                setCompletionCostOfSupplies('150');
                                setCompletionPaymentMethod('TRANSFERENCIA');
                                setCompletionCommissionPercent('15');
                              }}
                              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl bg-sage text-white text-[10px] font-bold tracking-wide hover:bg-sage/95 active:scale-95 transition-all shadow-xs cursor-pointer"
                            >
                              <CheckCircle2 size={12} />
                              <span>Cobrar</span>
                            </button>

                            {/* Reagendar Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedApptForReschedule(appt);
                                setRescheduleDate(appt.date);
                                setRescheduleTime(appt.time);
                                setRescheduleDuration(appt.duration.toString());
                              }}
                              className="p-1.5 rounded-xl border border-gold/45 text-[10px] text-gold-dark font-bold hover:bg-gold/10 active:scale-95 transition-all cursor-pointer"
                              title="Reagendar turno"
                            >
                              <RefreshCw size={11} />
                            </button>

                            {/* Eliminar Button */}
                            <button
                              type="button"
                              onClick={() => setApptToDelete(appt)}
                              className="p-1.5 rounded-xl border border-terracotta/35 text-[10px] text-terracotta font-bold hover:bg-terracotta/10 active:scale-95 transition-all cursor-pointer"
                              title="Eliminar cita"
                              aria-label="Eliminar cita"
                            >
                              <Trash2 size={11} />
                            </button>
                          </>
                        ) : (
                          <div className="flex-1 flex justify-end">
                            <button
                              type="button"
                              onClick={() => setApptToDelete(appt)}
                              className="text-on-surface-variant/40 hover:text-terracotta p-1 hover:bg-terracotta/10 rounded-full transition-all cursor-pointer active:scale-90 flex items-center gap-1 text-[9px] font-semibold"
                              title="Eliminar cita"
                              aria-label="Eliminar cita"
                            >
                              <Trash2 size={11} />
                              <span>Eliminar</span>
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* DESKTOP ONLY (FASE 1): Reacomodo fluido debajo de la card del día seleccionado */}
          <div
            className={`hidden md:block transition-all duration-300 ease-out ${
              showAddForm
                ? 'opacity-100 max-h-[1200px] pointer-events-auto transform translate-y-0'
                : 'opacity-0 max-h-0 pointer-events-none overflow-hidden transform -translate-y-2'
            }`}
          >
            {showAddForm && (
              <div className="bg-surface-container-lowest border border-outline-variant/40 p-4 sm:p-5 rounded-2xl sm:rounded-3xl hard-shadow">
                <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20 mb-3.5">
                  <div>
                    <h4 className="font-serif text-xs sm:text-sm font-black text-primary flex items-center gap-1.5">
                      <Sparkle className="text-primary-container fill-primary-container" size={13} />
                      Reservar Nueva Cita
                    </h4>
                    <p className="text-[10px] text-on-surface-variant/70 mt-0.5 capitalize">
                      {formatSelectedDateHuman()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="p-1 text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container rounded-full transition-all cursor-pointer active:scale-90"
                    aria-label="Cerrar formulario"
                  >
                    <X size={15} />
                  </button>
                </div>
                {renderBookingForm()}
              </div>
            )}
          </div>

        </div>

      </div>

      {/* MOBILE ONLY (FASE 1): Ventana Flotante Modal - solo se renderiza si isMobile es true para nunca bloquear scroll en PC */}
      {isMobile && (
        <Modal
          isOpen={showAddForm}
          onClose={() => setShowAddForm(false)}
          icon={<Sparkle className="text-primary-container fill-primary-container" size={16} />}
          title="Reservar Nueva Cita"
          subtitle={`Agendando para: ${formatSelectedDateHuman()}`}
          maxWidth="md"
        >
          {renderBookingForm()}
        </Modal>
      )}

      {/* MODAL DETALLE DE CITA & EXTRAS (FASE 2) */}
      <AppointmentDetailModal
        isOpen={!!detailAppt}
        onClose={() => setDetailAppt(null)}
        appointment={detailAppt}
        client={clients.find(c => c.id === detailAppt?.clientId)}
        service={services.find(s => s.id === detailAppt?.serviceId)}
        catalogExtras={extras}
        onSave={(appointmentId, updatedExtras, isHomeVisit, fee, newTotal) => {
          if (onUpdateAppointmentExtras) {
            onUpdateAppointmentExtras(appointmentId, updatedExtras, isHomeVisit, fee, newTotal);
          }
          if (detailAppt && detailAppt.id === appointmentId) {
            setDetailAppt({
              ...detailAppt,
              extras: updatedExtras,
              isHomeVisit,
              homeVisitFee: fee,
              priceCharged: newTotal
            });
          }
        }}
        onCharge={(updatedAppt) => {
          setDetailAppt(null);
          setActiveApptForCompletion(updatedAppt);
          setCompletionCostOfSupplies('150');
          setCompletionPaymentMethod('TRANSFERENCIA');
          setCompletionCommissionPercent('15');
        }}
      />

      {/* VENTANA FLOTANTE: ELIMINAR CITA */}
      <Modal
        isOpen={!!apptToDelete}
        onClose={() => setApptToDelete(null)}
        icon={<AlertTriangle size={17} className="text-terracotta" />}
        title="¿Eliminar esta cita?"
        subtitle="Confirma si deseas remover este turno de la agenda."
        maxWidth="sm"
      >
        {apptToDelete && (
          <div className="space-y-4">
            <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/20 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-on-surface text-xs sm:text-sm">
                  {clients.find(c => c.id === apptToDelete.clientId)?.name || 'Clienta'}
                </span>
                <span className="font-mono font-black text-primary">
                  {formatMoney(apptToDelete.priceCharged)}
                </span>
              </div>
              <p className="text-[11px] text-on-surface-variant/75">
                {services.find(s => s.id === apptToDelete.serviceId)?.name || 'Tratamiento'}
              </p>
              <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant/60 font-semibold">
                <Clock size={11} className="text-primary/70" />
                <span>{apptToDelete.date} a las {apptToDelete.time} hs ({formatDurationText(apptToDelete.duration)})</span>
              </div>
            </div>

            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Esta acción eliminará el turno de forma inmediata de la agenda.
            </p>

            <div className="flex gap-2.5 justify-end pt-1">
              <button
                type="button"
                onClick={() => setApptToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-surface-container-high rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high/80 active:scale-95 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteAppointment) {
                    onDeleteAppointment(apptToDelete.id);
                  } else {
                    onUpdateAppointmentStatus(apptToDelete.id, 'cancelled', 'Eliminada por usuario');
                  }
                  setApptToDelete(null);
                }}
                className="flex-1 py-2.5 px-4 bg-terracotta text-white rounded-xl text-xs font-bold shadow-xs hover:bg-terracotta/95 active:scale-95 transition-all cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* VENTANA FLOTANTE: REAGENDAR CITA */}
      <Modal
        isOpen={!!selectedApptForReschedule}
        onClose={() => setSelectedApptForReschedule(null)}
        icon={<RefreshCw size={16} className="text-gold-dark" />}
        title="Reagendar Turno"
        subtitle={
          selectedApptForReschedule
            ? `${clients.find(c => c.id === selectedApptForReschedule.clientId)?.name || 'Clienta'} • ${services.find(s => s.id === selectedApptForReschedule.serviceId)?.name || 'Servicio'}`
            : undefined
        }
        maxWidth="md"
      >
        {selectedApptForReschedule && (
          <div className="space-y-4">
            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Esta operación marcará la cita actual como <strong>reagendada</strong> para auditoría y reservará un nuevo turno en la fecha elegida.
            </p>

            {rescheduleOverlapAlert && (
              <div className="bg-terracotta/5 border border-terracotta/15 p-2.5 rounded-xl text-xs text-terracotta font-semibold flex items-center gap-2">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Colisión detectada: {rescheduleOverlapAlert} tiene cita en ese horario.</span>
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Nueva Fecha</label>
                  <input
                    type="date"
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Nueva Hora</label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Nueva Duración</label>
                <select
                  value={rescheduleDuration}
                  onChange={(e) => setRescheduleDuration(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
                >
                  <option value="60">1 hora (Manicura básica)</option>
                  <option value="90">1.5 horas (Manicura profunda)</option>
                  <option value="120">2 horas (Gel X / Diseño avanzado)</option>
                  <option value="180">3 horas (Full Editorial)</option>
                </select>
              </div>

              <div className="flex gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedApptForReschedule(null)}
                  className="flex-1 py-2.5 px-4 bg-surface-container-high rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high/80 active:scale-95 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-primary text-white rounded-xl text-xs font-bold shadow-xs hover:bg-primary/95 active:scale-95 transition-all cursor-pointer"
                >
                  Confirmar y Reagendar
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* VENTANA FLOTANTE: COBRAR CITA */}
      <Modal
        isOpen={!!activeApptForCompletion}
        onClose={() => setActiveApptForCompletion(null)}
        icon={<CheckCircle2 size={18} className="text-sage" />}
        title="Finalizar & Facturar Turno"
        subtitle={
          activeApptForCompletion
            ? `${clients.find(c => c.id === activeApptForCompletion.clientId)?.name || 'Clienta'} • ${services.find(s => s.id === activeApptForCompletion.serviceId)?.name || 'Servicio'} • ${formatMoney(activeApptForCompletion.priceCharged)}`
            : undefined
        }
        maxWidth="md"
      >
        {activeApptForCompletion && (
          <form onSubmit={handleCompleteAndChargeSubmit} className="space-y-3.5">
            <p className="text-[11px] text-on-surface-variant/70">
              Completa los costos variables reales de esta sesión para registrar el ingreso y auditar el margen neto en finanzas.
            </p>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Costo Insumos ($)</label>
                <input
                  type="number"
                  value={completionCostOfSupplies}
                  onChange={(e) => setCompletionCostOfSupplies(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Comisión Staff (%)</label>
                <input
                  type="number"
                  value={completionCommissionPercent}
                  onChange={(e) => setCompletionCommissionPercent(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Método de Pago</label>
              <select
                value={completionPaymentMethod}
                onChange={(e) => setCompletionPaymentMethod(e.target.value)}
                className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold uppercase tracking-wider text-on-surface"
              >
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta Débito/Crédito</option>
              </select>
            </div>

            {/* Real-time Profit preview */}
            {(() => {
              const charged = activeApptForCompletion.priceCharged;
              const supplies = parseFloat(completionCostOfSupplies) || 0;
              const commPercent = parseFloat(completionCommissionPercent) || 0;
              const commAmount = (charged * commPercent) / 100;
              const netProfit = Math.max(0, charged - supplies - commAmount);
              const marginPct = charged > 0 ? Math.round((netProfit / charged) * 100) : 0;
              return (
                <div className="bg-primary/5 p-3 rounded-xl border border-primary/10 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-primary text-[11px] block">Margen Neto Estimado</span>
                    <span className="text-[10px] text-on-surface-variant/60 font-semibold">Deduciendo insumos y staff</span>
                  </div>
                  <div className="text-right">
                    <span className="font-serif font-black text-primary text-sm block">{formatMoney(netProfit)}</span>
                    <span className="text-[10px] font-mono text-primary font-bold">({marginPct}%)</span>
                  </div>
                </div>
              );
            })()}

            <div className="flex gap-2.5 justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveApptForCompletion(null)}
                className="flex-1 py-2.5 px-4 bg-surface-container-high rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high/80 active:scale-95 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-sage text-white rounded-xl text-xs font-bold shadow-xs hover:bg-sage/95 active:scale-95 transition-all cursor-pointer"
              >
                Registrar Cobro Real
              </button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};
