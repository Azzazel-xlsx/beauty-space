import React, { useState, useMemo } from 'react';
import { Appointment, Client, Service, SpecialPrice } from '../types';
import { Plus, ChevronLeft, ChevronRight, MapPin, Clock, Calendar, CheckCircle2, XCircle, Sparkles, AlertCircle, Sparkle, RefreshCw, AlertTriangle, FileText, Check } from 'lucide-react';
import { generateId } from '../utils/id';
import { formatMoney } from '../utils/formatters';

interface AgendaProps {
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  specialPrices: SpecialPrice[];
  onAddAppointment: (appointment: Omit<Appointment, 'id'> & { id?: string }) => void;
  onUpdateAppointmentStatus: (id: string, status: Appointment['status'], cancelReason?: string, rescheduledToId?: string) => void;
  onCompleteAppointmentAndCharge?: (id: string, costOfSupplies: number, staffCommissionPercent: number, paymentMethod: string) => void;
}

export const Agenda: React.FC<AgendaProps> = ({
  appointments,
  clients,
  services,
  specialPrices,
  onAddAppointment,
  onUpdateAppointmentStatus,
  onCompleteAppointmentAndCharge
}) => {
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
  const [customPrice, setCustomPrice] = useState('');
  const [formError, setFormError] = useState('');

  // Cancel Reason State
  const [selectedApptIdForCancel, setSelectedApptIdForCancel] = useState<string | null>(null);
  const [cancelReasonInput, setCancelReasonInput] = useState('');

  // Rescheduling Flow State
  const [selectedApptForReschedule, setSelectedApptForReschedule] = useState<Appointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('10:00');
  const [rescheduleDuration, setRescheduleDuration] = useState('90');

  // Complete appointment dialog state (for margin cost tracking on flow completion)
  const [activeApptIdForCompletion, setActiveApptIdForCompletion] = useState<string | null>(null);
  const [completionCostOfSupplies, setCompletionCostOfSupplies] = useState('150');
  const [completionCommissionPercent, setCompletionCommissionPercent] = useState('15');
  const [completionPaymentMethod, setCompletionPaymentMethod] = useState('TRANSFERENCIA');

  // Helper: Convert time "HH:MM" to minutes-from-midnight
  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  // Conflict Overlap Calculator
  const scheduleOverlapAlert = useMemo(() => {
    if (!apptTime || !apptDuration || !selectedDateStr) return null;

    const newStart = timeToMinutes(apptTime);
    const newEnd = newStart + parseInt(apptDuration);

    // Get all non-cancelled appointments on that date
    const dayAppts = appointments.filter(
      (a) => a.date === selectedDateStr && a.status !== 'cancelled'
    );

    for (const appt of dayAppts) {
      const apptStart = timeToMinutes(appt.time);
      const apptEnd = apptStart + appt.duration;

      // Overlap formula: (startA < endB) && (startB < endA)
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

  // Rescheduling Conflict Calculator (during rescheduling)
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

  // Sync price input when client/service changes or VIP price is detected
  React.useEffect(() => {
    if (activeSpecialPrice !== null) {
      setCustomPrice(activeSpecialPrice.toString());
    } else if (selectedService) {
      const s = services.find(srv => srv.id === selectedService);
      if (s) {
        setCustomPrice(s.basePrice.toString());
      }
    } else {
      setCustomPrice('');
    }
  }, [selectedClient, selectedService, activeSpecialPrice, services]);

  // Monthly Calendar Math
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Group appointments by date
  const appointmentsMap = useMemo(() => {
    const map: Record<string, Appointment[]> = {};
    appointments.forEach((appt) => {
      if (!map[appt.date]) {
        map[appt.date] = [];
      }
      map[appt.date].push(appt);
    });
    return map;
  }, [appointments]);

  // Selected date's appointments sorted by hour
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

    onAddAppointment({
      clientId: selectedClient,
      serviceId: selectedService,
      date: selectedDateStr,
      time: apptTime,
      duration: parseInt(apptDuration),
      isHomeVisit: isHome,
      status: 'pending',
      priceCharged: priceNum
    });

    // Reset Form
    setSelectedClient('');
    setSelectedService('');
    setApptTime('10:00');
    setApptDuration('90');
    setIsHome(false);
    setFormError('');
    setShowAddForm(false);
  };

  // Rescheduling submit logic
  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApptForReschedule || !rescheduleDate || !rescheduleTime) {
      alert('Información incompleta para reagendar.');
      return;
    }

    // 1. Create a brand-new appointment
    const newApptId = generateId('appt');
    onAddAppointment({
      id: newApptId,
      clientId: selectedApptForReschedule.clientId,
      serviceId: selectedApptForReschedule.serviceId,
      date: rescheduleDate,
      time: rescheduleTime,
      duration: parseInt(rescheduleDuration),
      isHomeVisit: selectedApptForReschedule.isHomeVisit,
      status: 'pending',
      priceCharged: selectedApptForReschedule.priceCharged
    });

    // 2. Mark current one as 'reagendada' linked to the new turn
    onUpdateAppointmentStatus(selectedApptForReschedule.id, 'reagendada', 'Cliente reagendó el turno.', newApptId);

    // Reset
    setSelectedApptForReschedule(null);
  };

  // Cancellation submit logic with auditing
  const handleConfirmCancellation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApptIdForCancel) return;

    onUpdateAppointmentStatus(selectedApptIdForCancel, 'cancelled', cancelReasonInput || 'No especificó motivo de cancelación.');
    
    // Reset
    setSelectedApptIdForCancel(null);
    setCancelReasonInput('');
  };

  // Complete & Charge with variable costs submission
  const handleCompleteAndChargeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeApptIdForCompletion) return;

    const costVal = parseFloat(completionCostOfSupplies) || 0;
    const commPercentVal = parseFloat(completionCommissionPercent) || 0;

    if (onCompleteAppointmentAndCharge) {
      onCompleteAppointmentAndCharge(
        activeApptIdForCompletion,
        costVal,
        commPercentVal,
        completionPaymentMethod
      );
    } else {
      // Fallback
      onUpdateAppointmentStatus(activeApptIdForCompletion, 'completed');
    }

    // Reset completion dialog
    setActiveApptIdForCompletion(null);
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

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Upper Calendar Grid & Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Calendar Panel */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
          
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-primary">{monthNames[month]} {year}</h3>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-semibold">Agenda de turnos</p>
            </div>
            <div className="flex gap-1">
              <button
                onClick={prevMonth}
                className="p-1.5 text-primary hover:bg-surface-container rounded-full transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 text-primary hover:bg-surface-container rounded-full transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="wavy-divider opacity-40"></div>

          {/* Week Labels */}
          <div className="grid grid-cols-7 text-center text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/70 pb-2">
            <span>Dom</span>
            <span>Lun</span>
            <span>Mar</span>
            <span>Mie</span>
            <span>Jue</span>
            <span>Vie</span>
            <span>Sab</span>
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`offset-${idx}`} className="h-12 bg-transparent"></div>
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const monthStr = String(month + 1).padStart(2, '0');
              const dayStr = String(day).padStart(2, '0');
              const cellDateStr = `${year}-${monthStr}-${dayStr}`;

              const isSelected = selectedDateStr === cellDateStr;
              const dayAppts = appointmentsMap[cellDateStr] || [];
              const pendingCount = dayAppts.filter(a => a.status === 'pending').length;
              const completedCount = dayAppts.filter(a => a.status === 'completed').length;

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => setSelectedDateStr(cellDateStr)}
                  className={`h-11 md:h-12 rounded-xl flex flex-col items-center justify-center relative transition-all duration-300 ${
                    isSelected
                      ? 'bg-primary text-white font-bold editorial-shadow'
                      : 'hover:bg-surface-container text-on-surface'
                  }`}
                >
                  <span className="text-xs font-semibold">{day}</span>
                  {/* Indicators */}
                  {dayAppts.length > 0 && (
                    <div className="flex gap-0.5 absolute bottom-1.5">
                      {pendingCount > 0 && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-primary'}`}></span>
                      )}
                      {completedCount > 0 && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-sage'}`}></span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Day appointments list */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-surface-container-low border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-serif text-sm font-black text-primary capitalize">{formatSelectedDateHuman()}</h4>
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-bold mt-0.5">
                  {selectedDayAppointments.length} turnos registrados
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setSelectedApptForReschedule(null);
                  setSelectedApptIdForCancel(null);
                }}
                className="flex items-center justify-center gap-1 px-3.5 py-2 bg-primary text-white rounded-full text-xs font-bold transition-all hover:bg-primary/95 shadow-xs shrink-0"
              >
                <Plus size={14} /> Reservar
              </button>
            </div>

            <div className="wavy-divider opacity-30"></div>

            {/* Turn list */}
            <div className="space-y-4 max-h-[460px] overflow-y-auto pr-1">
              {selectedDayAppointments.length === 0 ? (
                <div className="py-16 text-center text-xs text-on-surface-variant/50 font-semibold border border-dashed border-outline-variant/25 rounded-2xl">
                  No hay turnos agendados para esta fecha.
                </div>
              ) : (
                selectedDayAppointments.map((appt) => {
                  const client = clients.find(c => c.id === appt.clientId);
                  const service = services.find(s => s.id === appt.serviceId);

                  if (!client || !service) return null;

                  return (
                    <div
                      key={appt.id}
                      className="bg-surface-container-lowest border border-outline-variant/20 p-4 rounded-2xl space-y-3"
                    >
                      {/* Turn details */}
                      <div className="flex items-start gap-3">
                        <img
                          src={client.photoUrl}
                          alt={client.name}
                          className="w-10 h-10 rounded-full object-cover border border-primary/20 p-0.5 bg-white"
                        />
                        <div className="flex-1 space-y-0.5">
                          <h5 className="text-xs font-bold text-on-surface">{client.name}</h5>
                          <div className="flex items-center gap-1.5 text-[10px] text-on-surface-variant/70 font-semibold">
                            <Clock size={11} className="text-primary/70" />
                            <span>{appt.time} ({appt.duration} min)</span>
                          </div>
                        </div>
                        {/* Status Tag */}
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                          appt.status === 'completed' ? 'bg-sage/10 text-sage' :
                          appt.status === 'cancelled' ? 'bg-terracotta/10 text-terracotta' :
                          appt.status === 'reagendada' ? 'bg-gold/10 text-gold-dark' :
                          'bg-primary/10 text-primary animate-pulse'
                        }`}>
                          {appt.status === 'completed' && 'Completada'}
                          {appt.status === 'cancelled' && 'Cancelada'}
                          {appt.status === 'reagendada' && 'Reagendada'}
                          {appt.status === 'pending' && 'Programada'}
                        </span>
                      </div>

                      {/* Service strip */}
                      <div className="flex items-center justify-between text-[11px] bg-surface-container/35 px-3 py-2 rounded-xl">
                        <div>
                          <p className="font-bold text-on-surface-variant">{service.name}</p>
                          {appt.isHomeVisit && (
                            <span className="text-[9px] text-primary font-bold flex items-center gap-0.5 mt-0.5">
                              <MapPin size={9} /> Domicilio
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-black text-primary">{formatMoney(appt.priceCharged)}</span>
                      </div>

                      {appt.cancelReason && (
                        <div className="bg-terracotta/5 p-2 rounded-lg border border-terracotta/15 text-[10px] font-medium text-on-surface-variant/80 italic">
                          Motivo cancelación: "{appt.cancelReason}"
                        </div>
                      )}

                      {/* Interactive Buttons for pending states */}
                      {appt.status === 'pending' && (
                        <div className="flex flex-wrap gap-2 border-t border-outline-variant/15 pt-2.5">
                          {/* Cancel Button */}
                          <button
                            onClick={() => {
                              setSelectedApptIdForCancel(appt.id);
                              setSelectedApptForReschedule(null);
                            }}
                            className="flex-1 min-w-[70px] flex items-center justify-center gap-1 py-1.5 rounded-xl border border-terracotta/35 text-[9px] text-terracotta font-black uppercase tracking-wider hover:bg-terracotta/10 transition-all"
                          >
                            <XCircle size={11} /> Cancelar
                          </button>

                          {/* Reschedule Button */}
                          <button
                            onClick={() => {
                              setSelectedApptForReschedule(appt);
                              setRescheduleDate(appt.date);
                              setRescheduleTime(appt.time);
                              setRescheduleDuration(appt.duration.toString());
                              setSelectedApptIdForCancel(null);
                            }}
                            className="flex-1 min-w-[70px] flex items-center justify-center gap-1 py-1.5 rounded-xl border border-gold/45 text-[9px] text-gold-dark font-black uppercase tracking-wider hover:bg-gold/10 transition-all"
                          >
                            <RefreshCw size={11} /> Reagendar
                          </button>

                          {/* Complete & Charge Button */}
                          <button
                            onClick={() => {
                              setActiveApptIdForCompletion(appt.id);
                              setCompletionCostOfSupplies('150');
                              setCompletionPaymentMethod('TRANSFERENCIA');
                            }}
                            className="flex-1 min-w-[80px] flex items-center justify-center gap-1 py-1.5 rounded-xl bg-sage text-white text-[9px] font-black uppercase tracking-wider hover:bg-sage/95 transition-all shadow-xs"
                          >
                            <CheckCircle2 size={11} /> Cobrar
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* MODAL / SUB-FORM: CANCELLATION DIALOG WITH AUDITING */}
      {selectedApptIdForCancel && (
        <div className="bg-surface-container border border-outline-variant/40 p-5 rounded-3xl max-w-md mx-auto hard-shadow animate-in zoom-in-95 duration-200">
          <h4 className="font-serif text-sm font-black text-terracotta flex items-center gap-1.5">
            <XCircle size={16} /> Cancelar Turno con Auditoría
          </h4>
          <p className="text-[11px] text-on-surface-variant/70 leading-normal mt-1.5">
            Declara el motivo por el cual la clienta o el estudio cancela esta cita. Esto se guardará en la ficha histórica de auditoría.
          </p>
          <form onSubmit={handleConfirmCancellation} className="space-y-4 pt-3">
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Motivo de Cancelación</label>
              <input
                type="text"
                placeholder="Ej. Avisó tarde por temas de salud / viaje imprevisto..."
                value={cancelReasonInput}
                onChange={(e) => setCancelReasonInput(e.target.value)}
                className="w-full bg-white text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-terracotta font-semibold"
                required
              />
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setSelectedApptIdForCancel(null)}
                className="px-4 py-2 bg-surface-container-high rounded-xl text-xs font-bold text-on-surface"
              >
                Volver
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-terracotta text-white rounded-xl text-xs font-bold shadow-xs hover:bg-terracotta/95 transition-all"
              >
                Confirmar Cancelación
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL / SUB-FORM: RESCHEDULE FLOW (LINKED CANCELLATION) */}
      {selectedApptForReschedule && (
        <div className="bg-surface-container border border-outline-variant/40 p-6 rounded-3xl max-w-md mx-auto hard-shadow space-y-4 animate-in zoom-in-95 duration-200">
          <div>
            <h4 className="font-serif text-sm font-black text-gold-dark flex items-center gap-1.5">
              <RefreshCw size={15} /> Reagendar Turno Vinculado
            </h4>
            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed mt-1">
              Esta operación marcará la cita actual como <strong>reagendada</strong> para auditoría y reservará un nuevo turno en la fecha elegida.
            </p>
          </div>

          <div className="wavy-divider opacity-20"></div>

          {rescheduleOverlapAlert && (
            <div className="bg-terracotta/5 border border-terracotta/15 p-3 rounded-xl text-xs text-terracotta font-semibold flex items-center gap-2">
              <AlertTriangle size={15} />
              <span>Colisión detectada: {rescheduleOverlapAlert} tiene cita en ese horario.</span>
            </div>
          )}

          <form onSubmit={handleRescheduleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Nueva Fecha</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full bg-white text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Nueva Hora</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full bg-white text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Nueva Duración</label>
              <select
                value={rescheduleDuration}
                onChange={(e) => setRescheduleDuration(e.target.value)}
                className="w-full bg-white text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
              >
                <option value="60">1 hora (Manicura básica)</option>
                <option value="90">1.5 horas (Manicura profunda)</option>
                <option value="120">2 horas (Gel X / Diseño avanzado)</option>
                <option value="180">3 horas (Full Editorial)</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setSelectedApptForReschedule(null)}
                className="px-4 py-2 bg-surface-container-high rounded-xl text-xs font-bold text-on-surface"
              >
                Volver
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold shadow-xs hover:bg-primary/95 transition-all"
              >
                Confirmar y Reagendar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL / SUB-FORM: COMPLETE & CHARGE DIALOG */}
      {activeApptIdForCompletion && (
        <div className="bg-surface-container border border-outline-variant/40 p-6 rounded-3xl max-w-md mx-auto hard-shadow space-y-4 animate-in zoom-in-95 duration-200">
          <div className="text-center">
            <h4 className="font-serif text-sm font-black text-sage flex items-center justify-center gap-1.5">
              <CheckCircle2 size={16} /> Finalizar & Facturar Turno
            </h4>
            <p className="text-[11px] text-on-surface-variant/70 mt-1">Completa los costos reales de esta sesión antes de enviar a finanzas</p>
          </div>

          <div className="wavy-divider opacity-30"></div>

          <form onSubmit={handleCompleteAndChargeSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Costo de Insumos ($)</label>
                <input
                  type="number"
                  value={completionCostOfSupplies}
                  onChange={(e) => setCompletionCostOfSupplies(e.target.value)}
                  className="w-full bg-white text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Comisión Staff (%)</label>
                <input
                  type="number"
                  value={completionCommissionPercent}
                  onChange={(e) => setCompletionCommissionPercent(e.target.value)}
                  className="w-full bg-white text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Método de Pago Elegido</label>
              <select
                value={completionPaymentMethod}
                onChange={(e) => setCompletionPaymentMethod(e.target.value)}
                className="w-full bg-white text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold uppercase tracking-wider text-on-surface"
              >
                <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                <option value="EFECTIVO">Efectivo</option>
                <option value="TARJETA">Tarjeta Débito/Crédito</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setActiveApptIdForCompletion(null)}
                className="px-4 py-2 bg-surface-container-high rounded-xl text-xs font-bold text-on-surface"
              >
                Volver
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-sage text-white rounded-xl text-xs font-bold shadow-xs hover:bg-sage/95 transition-all"
              >
                Registrar Cobro Real
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EXPANDABLE NEW TURN BOOKING FORM */}
      {showAddForm && (
        <div className="bg-surface-container-lowest border border-outline-variant/40 p-6 rounded-3xl max-w-xl mx-auto hard-shadow animate-in slide-in-from-top-4 duration-300">
          <div className="text-center mb-5">
            <h3 className="font-serif text-base font-bold text-primary flex items-center justify-center gap-1.5">
              <Sparkle className="text-primary-container fill-primary-container animate-spin" size={14} />
              Reservar Nueva Cita
            </h3>
            <p className="text-[11px] text-on-surface-variant/70 mt-1">
              Agendando para la fecha elegida: <span className="font-bold text-primary uppercase">{formatSelectedDateHuman()}</span>
            </p>
          </div>

          <div className="wavy-divider opacity-45 mb-6"></div>

          {formError && (
            <div className="mb-4 bg-terracotta/10 border border-terracotta/20 text-terracotta p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{formError}</span>
            </div>
          )}

          {/* Colliding/Conflict Overlap Alert Banner */}
          {scheduleOverlapAlert && (
            <div className="mb-4 bg-gold/15 border border-gold/30 text-on-surface p-3.5 rounded-xl text-xs flex gap-3 items-start animate-pulse">
              <AlertTriangle className="text-gold-dark shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold text-gold-dark">¡Alerta preventiva de solapamiento!</p>
                <p className="text-[11px] text-on-surface-variant/90 leading-relaxed mt-0.5">
                  Hay una cita con <strong>{scheduleOverlapAlert.clientName}</strong> programada a las <strong>{scheduleOverlapAlert.time}</strong> que colisiona con el rango de horario seleccionado. Puedes continuar con la reserva, pero ten en cuenta la colisión.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleBookingSubmit} className="space-y-4">
            
            {/* Client Select */}
            <div>
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Elegir Clienta</label>
              <select
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="w-full bg-surface-container-low text-xs py-2.5 px-4 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold text-on-surface"
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
              <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Elegir Tratamiento</label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full bg-surface-container-low text-xs py-2.5 px-4 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold text-on-surface"
                required
              >
                <option value="">Selecciona el servicio...</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} (Base: {formatMoney(s.basePrice)})</option>
                ))}
              </select>
            </div>

            {/* Smart detection of Preferential Price alert banner */}
            {activeSpecialPrice !== null && (
              <div className="bg-sage/10 border border-sage/25 text-sage p-3 rounded-xl flex items-center justify-between text-[11px] font-bold animate-pulse">
                <span className="flex items-center gap-2">
                  <Sparkles size={14} className="fill-sage/20" />
                  ¡Tarifa preferencial VIP detectada para esta clienta!
                </span>
                <span className="font-mono bg-white px-2 py-0.5 rounded-full border border-sage/30">{formatMoney(activeSpecialPrice)}</span>
              </div>
            )}

            {/* Time and Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Hora de Cita</label>
                <input
                  type="time"
                  value={apptTime}
                  onChange={(e) => setApptTime(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2.5 px-4 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold text-on-surface"
                  required
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Duración (Minutos)</label>
                <select
                  value={apptDuration}
                  onChange={(e) => setApptDuration(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2.5 px-4 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold text-on-surface"
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

            {/* Pricing Input & Home Visit check */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Precio Cobrado ($)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                  className="w-full bg-surface-container-low text-xs py-2.5 px-4 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-bold"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <input
                  type="checkbox"
                  id="homeVisitCheck"
                  checked={isHome}
                  onChange={(e) => setIsHome(e.target.checked)}
                  className="w-4.5 h-4.5 accent-primary border-outline-variant rounded-md cursor-pointer"
                />
                <label htmlFor="homeVisitCheck" className="text-xs font-bold text-on-surface-variant cursor-pointer select-none">
                  ¿Es a domicilio?
                </label>
              </div>
            </div>

            {/* Actions */}
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
                Confirmar Reserva
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
