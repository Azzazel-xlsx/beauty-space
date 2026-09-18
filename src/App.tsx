import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Agenda } from './components/Agenda';
import { Clientas } from './components/Clientas';
import { Servicios } from './components/Servicios';
import { Ajustes } from './components/Ajustes';
import { LoginScreen, BrandFloralEmblem } from './components/LoginScreen';
import { useToast } from './components/Toast';
import {
  Client,
  Service,
  Extra,
  SpecialPrice,
  Appointment,
  FinancialMovement,
  PriceChangeEvent,
  AppointmentExtra,
  AdminProfile
} from './types';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { clientsService } from './services/clientsService';
import { servicesService } from './services/servicesService';
import { extrasService } from './services/extrasService';
import { specialPricesService } from './services/specialPricesService';
import { appointmentsService } from './services/appointmentsService';
import { financialsService } from './services/financialsService';
import { auditService } from './services/auditService';
import { settingsService } from './services/settingsService';
import { CompleteBackupData } from './utils/backup';
import { Clock, AlertTriangle, RefreshCw } from 'lucide-react';

export default function App() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('finanzas');

  // Supabase Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Inactivity timeout warning
  const [inactivityWarning, setInactivityWarning] = useState<boolean>(false);
  const lastActiveRef = useRef<number>(Date.now());

  // Business Data State (loaded asynchronously from Supabase)
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [specialPrices, setSpecialPrices] = useState<SpecialPrice[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [movements, setMovements] = useState<FinancialMovement[]>([]);
  const [priceChanges, setPriceChanges] = useState<PriceChangeEvent[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [adminProfile, setAdminProfile] = useState<AdminProfile>({
    name: 'Valentina Moretti',
    photoUrl: ''
  });

  // Check Supabase session on mount & subscribe to auth changes
  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured()) {
      setIsAuthChecking(false);
      setIsAuthenticated(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setIsAuthenticated(Boolean(session?.user));
        setIsAuthChecking(false);
      }
    }).catch((err) => {
      console.error('Error verificando sesión de Supabase:', err);
      if (isMounted) {
        setIsAuthenticated(false);
        setIsAuthChecking(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setIsAuthenticated(Boolean(session?.user));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Fetch all business collections from Supabase
  const loadAllData = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    setIsLoadingData(true);
    setDataError(null);

    try {
      const [
        cList,
        sList,
        eList,
        spList,
        aList,
        mList,
        pcList,
        catList,
        pmList,
        profile
      ] = await Promise.all([
        clientsService.getClients(),
        servicesService.getServices(),
        extrasService.getExtras(),
        specialPricesService.getSpecialPrices(),
        appointmentsService.getAppointments(),
        financialsService.getMovements(),
        auditService.getPriceChanges(),
        settingsService.getCategories(),
        settingsService.getPaymentMethods(),
        settingsService.getAdminProfile()
      ]);

      setClients(cList);
      setServices(sList);
      setExtras(eList);
      setSpecialPrices(spList);
      setAppointments(aList);
      setMovements(mList);
      setPriceChanges(pcList);
      setCategories(catList);
      setPaymentMethods(pmList);
      setAdminProfile(profile);
    } catch (err: any) {
      console.error('Error cargando datos de Supabase:', err);
      setDataError(err?.message || 'Error al conectar con la base de datos de Supabase.');
      toast.error('Error al sincronizar datos con Supabase.');
    } finally {
      setIsLoadingData(false);
    }
  }, [toast]);

  // Load data as soon as authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadAllData();
    }
  }, [isAuthenticated, loadAllData]);

  // Read timeout preference stored per device
  const getTimeoutMinutes = (): number => {
    try {
      const saved = localStorage.getItem('bs_auth_timeout_mins');
      return saved !== null ? Number(saved) : 15;
    } catch {
      return 15;
    }
  };

  // Activity tracker & auto-lock by inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleUserActivity = () => {
      lastActiveRef.current = Date.now();
      if (inactivityWarning) {
        setInactivityWarning(false);
      }
    };

    window.addEventListener('mousedown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);

    const interval = setInterval(() => {
      const timeoutMins = getTimeoutMinutes();
      if (timeoutMins <= 0) return;

      const timeoutMs = timeoutMins * 60 * 1000;
      const warningMs = Math.max(timeoutMs - 60000, 30000);
      const elapsed = Date.now() - lastActiveRef.current;

      if (elapsed >= timeoutMs) {
        handleLogout();
      } else if (elapsed >= warningMs) {
        setInactivityWarning(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousedown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      clearInterval(interval);
    };
  }, [isAuthenticated, inactivityWarning]);

  const handleLoginSuccess = () => {
    lastActiveRef.current = Date.now();
    setInactivityWarning(false);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error(err);
    }
    setInactivityWarning(false);
    setIsAuthenticated(false);
  };

  // ==================== WORKFLOW: CLIENTS ====================
  const handleAddClient = async (newCli: Omit<Client, 'id' | 'createdAt'> & { id?: string }) => {
    try {
      const created = await clientsService.createClient(newCli);
      setClients((prev) => [created, ...prev]);
      toast.success(`Clienta ${created.name} registrada con éxito.`);
    } catch (err: any) {
      console.error('Error registrando clienta:', err);
      toast.error(`Error al registrar clienta: ${err?.message}`);
    }
  };

  const handleUpdateClientNotes = async (clientId: string, notes: string) => {
    try {
      const updated = await clientsService.updateClient(clientId, { notes });
      setClients((prev) => prev.map((c) => (c.id === clientId ? updated : c)));
      toast.success('Notas de la clienta actualizadas.');
    } catch (err: any) {
      console.error('Error actualizando notas:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleUpdateClientPhoto = async (clientId: string, photoUrl: string) => {
    try {
      const updated = await clientsService.updateClient(clientId, { photoUrl });
      setClients((prev) => prev.map((c) => (c.id === clientId ? updated : c)));
      toast.success('Foto de la clienta actualizada.');
    } catch (err: any) {
      console.error('Error actualizando foto:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      await clientsService.deleteClient(clientId);
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      setSpecialPrices((prev) => prev.filter((sp) => sp.clientId !== clientId));
      toast.success('Clienta eliminada correctamente.');
    } catch (err: any) {
      console.error('Error eliminando clienta:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  // ==================== WORKFLOW: SERVICES ====================
  const handleAddService = async (newSrv: Omit<Service, 'id' | 'priceHistory'> & { initialPrice: number }) => {
    try {
      const created = await servicesService.createService({
        name: newSrv.name,
        description: newSrv.description,
        basePrice: newSrv.initialPrice,
        duration: newSrv.duration
      });
      setServices((prev) => [...prev, created]);
      toast.success('Servicio agregado al catálogo.');
    } catch (err: any) {
      console.error('Error agregando servicio:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleUpdateServicePrice = async (serviceId: string, newPrice: number, date: string, reason?: string) => {
    const srv = services.find((s) => s.id === serviceId);
    const oldPriceVal = srv ? srv.basePrice : 0;
    const srvName = srv ? srv.name : 'Servicio';

    try {
      const updatedSrv = await servicesService.updateServicePrice(
        serviceId,
        newPrice,
        date,
        reason || 'Actualización periódica de tarifas.'
      );
      setServices((prev) => prev.map((s) => (s.id === serviceId ? updatedSrv : s)));

      const auditEvent = await auditService.recordPriceChange({
        type: 'catalog',
        targetId: serviceId,
        name: srvName,
        oldPrice: oldPriceVal,
        newPrice,
        date,
        user: adminProfile.name || 'Administradora',
        reason: reason || 'Reajuste por costes e inflación.'
      });
      setPriceChanges((prev) => [auditEvent, ...prev]);

      toast.success('Tarifa del servicio actualizada y registrada en auditoría.');
    } catch (err: any) {
      console.error('Error actualizando precio:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      await servicesService.deleteService(serviceId);
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      setSpecialPrices((prev) => prev.filter((sp) => sp.serviceId !== serviceId));
      toast.success('Servicio eliminado.');
    } catch (err: any) {
      console.error('Error eliminando servicio:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  // ==================== WORKFLOW: EXTRAS ====================
  const handleAddExtra = async (newExtra: Omit<Extra, 'id' | 'priceHistory'> & { initialPrice: number }) => {
    try {
      const created = await extrasService.createExtra({
        name: newExtra.name,
        pricePerNail: newExtra.pricePerNail,
        serviceId: newExtra.serviceId,
        initialPrice: newExtra.initialPrice,
        initialReason: 'Tarifa inicial registrada.'
      });
      setExtras((prev) => [...prev, created]);
      toast.success('Extra agregado al catálogo.');
    } catch (err: any) {
      console.error('Error agregando extra:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleUpdateExtraPrice = async (extraId: string, newPrice: number, date: string, reason?: string) => {
    try {
      const updated = await extrasService.updateExtraPrice(
        extraId,
        newPrice,
        date,
        reason || 'Actualización periódica.'
      );
      setExtras((prev) => prev.map((e) => (e.id === extraId ? updated : e)));
      toast.success('Precio del extra actualizado.');
    } catch (err: any) {
      console.error('Error actualizando extra:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleDeleteExtra = async (extraId: string) => {
    try {
      await extrasService.deleteExtra(extraId);
      setExtras((prev) => prev.filter((e) => e.id !== extraId));
      toast.success('Extra eliminado.');
    } catch (err: any) {
      console.error('Error eliminando extra:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  // ==================== WORKFLOW: SPECIAL PRICES ====================
  const handleAddSpecialPrice = async (newSp: Omit<SpecialPrice, 'id'>) => {
    try {
      const created = await specialPricesService.setSpecialPrice(
        newSp.clientId,
        newSp.serviceId,
        newSp.specialPrice,
        newSp.groupLabel,
        newSp.isActive
      );
      setSpecialPrices((prev) => {
        const filtered = prev.filter(
          (sp) => !(sp.clientId === newSp.clientId && sp.serviceId === newSp.serviceId)
        );
        return [...filtered, created];
      });
      toast.success('Precio preferencial configurado.');
    } catch (err: any) {
      console.error('Error guardando precio preferencial:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleDeleteSpecialPrice = async (id: string) => {
    try {
      await specialPricesService.deleteSpecialPrice(id);
      setSpecialPrices((prev) => prev.filter((sp) => sp.id !== id));
      toast.success('Precio preferencial eliminado.');
    } catch (err: any) {
      console.error('Error eliminando precio preferencial:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  // ==================== WORKFLOW: FINANCES ====================
  const handleAddMovement = async (newMov: Omit<FinancialMovement, 'id'>) => {
    try {
      const created = await financialsService.createMovement(newMov);
      setMovements((prev) => [created, ...prev]);
      toast.success('Movimiento financiero registrado.');
    } catch (err: any) {
      console.error('Error registrando movimiento:', err);
      toast.error(`Error al registrar movimiento: ${err?.message}`);
    }
  };

  const handleDeleteMovement = async (id: string) => {
    try {
      await financialsService.deleteMovement(id);
      setMovements((prev) => prev.filter((m) => m.id !== id));
      toast.success('Movimiento eliminado.');
    } catch (err: any) {
      console.error('Error eliminando movimiento:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  // ==================== WORKFLOW: APPOINTMENTS ====================
  const handleAddAppointment = async (newAppt: Omit<Appointment, 'id'> & { id?: string }) => {
    try {
      const created = await appointmentsService.createAppointment(newAppt);
      setAppointments((prev) => [created, ...prev]);
      toast.success('Cita agendada con éxito.');
    } catch (err: any) {
      console.error('Error agendando cita:', err);
      toast.error(`Error al agendar cita: ${err?.message}`);
    }
  };

  const handleUpdateAppointmentStatus = async (
    id: string,
    status: Appointment['status'],
    cancelReason?: string,
    rescheduledToId?: string
  ) => {
    const targetAppt = appointments.find((a) => a.id === id);
    if (!targetAppt) return;

    try {
      if (targetAppt.status !== 'completed' && status === 'completed') {
        const client = clients.find((c) => c.id === targetAppt.clientId);
        const service = services.find((s) => s.id === targetAppt.serviceId);
        
        const serviceName = service ? service.name : 'Tratamiento';
        const clientName = client ? client.name : 'Clienta Regular';

        const movement = await financialsService.createMovement({
          type: 'income',
          category: serviceName,
          amount: targetAppt.priceCharged,
          date: targetAppt.date,
          description: `Servicio ${serviceName} - ${clientName}`,
          paymentMethod: 'TRANSFERENCIA',
          clientName,
          serviceName,
          appointmentId: targetAppt.id,
          costOfSupplies: 150,
          staffCommission: targetAppt.priceCharged * 0.15
        });
        setMovements((prev) => [movement, ...prev]);
      }

      const updated = await appointmentsService.updateAppointment(id, {
        status,
        cancelReason: cancelReason || '',
        rescheduledToId
      });
      setAppointments((prev) => prev.map((a) => (a.id === id ? updated : a)));

      if (status === 'cancelled') {
        toast.info('Cita cancelada.');
      } else if (status === 'reagendada') {
        toast.info('Cita marcada como reagendada.');
      } else if (status === 'completed') {
        toast.success('Cita completada y registrada en finanzas.');
      }
    } catch (err: any) {
      console.error('Error actualizando cita:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleCompleteAppointmentAndCharge = async (
    id: string,
    costOfSupplies: number,
    staffCommissionPercent: number,
    paymentMethod: string
  ) => {
    const targetAppt = appointments.find((a) => a.id === id);
    if (!targetAppt) return;

    const client = clients.find((c) => c.id === targetAppt.clientId);
    const service = services.find((s) => s.id === targetAppt.serviceId);
    
    const serviceName = service ? service.name : 'Tratamiento';
    const clientName = client ? client.name : 'Clienta Regular';
    const commissionAmount = parseFloat(((targetAppt.priceCharged * staffCommissionPercent) / 100).toFixed(2));

    try {
      const movement = await financialsService.createMovement({
        type: 'income',
        category: serviceName,
        amount: targetAppt.priceCharged,
        date: targetAppt.date,
        description: `Servicio ${serviceName} - ${clientName} (Cobro real-time)`,
        paymentMethod: paymentMethod as FinancialMovement['paymentMethod'],
        clientName,
        serviceName,
        appointmentId: targetAppt.id,
        costOfSupplies,
        staffCommission: commissionAmount
      });
      setMovements((prev) => [movement, ...prev]);

      const updatedAppt = await appointmentsService.updateAppointment(id, { status: 'completed' });
      setAppointments((prev) => prev.map((a) => (a.id === id ? updatedAppt : a)));
      toast.success('Cita cobrada y completada exitosamente.');
    } catch (err: any) {
      console.error('Error al cobrar cita:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    try {
      await appointmentsService.deleteAppointment(id);
      setAppointments((prev) => prev.filter((appt) => appt.id !== id));
      toast.info('Cita eliminada de la agenda.');
    } catch (err: any) {
      console.error('Error eliminando cita:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleUpdateAppointmentExtras = async (
    appointmentId: string,
    updatedExtras: AppointmentExtra[],
    isHomeVisit: boolean,
    homeVisitFee: number,
    newTotal: number
  ) => {
    try {
      const updated = await appointmentsService.updateAppointment(appointmentId, {
        extras: updatedExtras,
        isHomeVisit,
        homeVisitFee,
        priceCharged: newTotal
      });
      setAppointments((prev) => prev.map((appt) => (appt.id === appointmentId ? updated : appt)));
      toast.success('Detalles y extras de la cita actualizados.');
    } catch (err: any) {
      console.error('Error actualizando extras:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  // ==================== WORKFLOW: SETTINGS & DATABASE MAINTENANCE ====================
  const handleAddCategory = async (category: string) => {
    try {
      await settingsService.addCategory(category);
      setCategories((prev) => [...prev, category]);
    } catch (err: any) {
      console.error('Error agregando categoría:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleDeleteCategory = async (category: string) => {
    try {
      await settingsService.deleteCategory(category);
      setCategories((prev) => prev.filter((c) => c !== category));
    } catch (err: any) {
      console.error('Error eliminando categoría:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleAddPaymentMethod = async (method: string) => {
    try {
      await settingsService.addPaymentMethod(method);
      setPaymentMethods((prev) => [...prev, method]);
    } catch (err: any) {
      console.error('Error agregando método de pago:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleDeletePaymentMethod = async (method: string) => {
    try {
      await settingsService.deletePaymentMethod(method);
      setPaymentMethods((prev) => prev.filter((m) => m !== method));
    } catch (err: any) {
      console.error('Error eliminando método de pago:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleUpdateAdminProfile = async (profile: { name: string; photoUrl: string }) => {
    try {
      await settingsService.saveAdminProfile(profile);
      setAdminProfile(profile);
    } catch (err: any) {
      console.error('Error actualizando perfil:', err);
      toast.error(`Error: ${err?.message}`);
    }
  };

  const handleResetDatabase = async () => {
    try {
      await Promise.all([
        supabase.from('appointment_extras').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('appointments').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('financial_movements').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('special_prices').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('extra_price_history').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('extras').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('service_price_history').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('services').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('clients').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('price_change_events').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);
      await loadAllData();
      toast.success('¡Base de datos restablecida a estado limpio correctamente!');
    } catch (err: any) {
      console.error('Error al restablecer:', err);
      toast.error(`Error al restablecer: ${err?.message}`);
    }
  };

  const handleRestoreBackup = async (backup: CompleteBackupData) => {
    setIsLoadingData(true);
    try {
      const { payload } = backup;
      for (const c of payload.clients) {
        await clientsService.createClient(c).catch(() => {});
      }
      for (const s of payload.services) {
        await servicesService.createService(s).catch(() => {});
      }
      for (const a of payload.appointments) {
        await appointmentsService.createAppointment(a).catch(() => {});
      }
      for (const m of payload.movements) {
        await financialsService.createMovement(m).catch(() => {});
      }
      await loadAllData();
      toast.success('¡Copia de seguridad restaurada correctamente en Supabase!');
    } catch (err: any) {
      toast.error(`Error al restaurar copia: ${err?.message}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Full backup data payload snapshot for JSON export
  const fullBackupData: CompleteBackupData = useMemo(() => ({
    schemaVersion: '1.0',
    exportedAt: new Date().toISOString(),
    app: 'Beauty Space',
    summary: {
      clientsCount: clients.length,
      appointmentsCount: appointments.length,
      movementsCount: movements.length,
      servicesCount: services.length,
      specialPricesCount: specialPrices.length
    },
    payload: {
      clients,
      services,
      specialPrices,
      appointments,
      movements,
      priceChanges,
      categories,
      paymentMethods,
      adminProfile
    }
  }), [clients, services, specialPrices, appointments, movements, priceChanges, categories, paymentMethods, adminProfile]);

  // Auth checking indicator
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center gap-3">
        <BrandFloralEmblem size={42} className="text-primary animate-pulse" />
        <p className="text-xs font-serif font-bold text-primary tracking-wide">Cargando Beauty Space...</p>
      </div>
    );
  }

  // If not logged in, render LoginScreen (Email + Password with Supabase Auth)
  if (!isAuthenticated) {
    return (
      <LoginScreen
        adminProfile={adminProfile}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  // Loading indicator when fetching data from Supabase
  if (isLoadingData && clients.length === 0 && services.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary animate-pulse">
          <BrandFloralEmblem size={32} />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-lg font-bold text-primary">Sincronizando Beauty Space</h3>
          <p className="text-xs text-on-surface-variant/70">Conectando con la base de datos en la nube...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      adminProfile={adminProfile}
      onLogout={handleLogout}
    >
      {dataError && (
        <div className="bg-terracotta/10 border-b border-terracotta/20 px-4 py-2.5 flex items-center justify-between text-xs text-terracotta animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle size={14} className="text-terracotta shrink-0" />
            <span>{dataError}</span>
          </div>
          <button
            onClick={loadAllData}
            className="px-2.5 py-1 bg-terracotta text-white rounded-md text-[11px] font-bold hover:bg-terracotta/95 transition-colors ml-4 shrink-0 flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={11} /> Reintentar
          </button>
        </div>
      )}

      {inactivityWarning && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2 font-medium">
            <Clock size={14} className="text-amber-600 animate-pulse" />
            <span>Tu sesión se cerrará en 1 minuto por inactividad. Presiona continuar para mantenerla abierta.</span>
          </div>
          <button
            onClick={() => {
              lastActiveRef.current = Date.now();
              setInactivityWarning(false);
            }}
            className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-[11px] hover:bg-amber-700 transition-colors cursor-pointer"
          >
            Continuar trabajando
          </button>
        </div>
      )}
      
      {activeTab === 'finanzas' && (
        <Dashboard
          movements={movements}
          clients={clients}
          onAddMovement={handleAddMovement}
          onDeleteMovement={handleDeleteMovement}
          expenseCategories={categories}
          paymentMethods={paymentMethods}
        />
      )}

      {activeTab === 'servicios' && (
        <Servicios
          services={services}
          extras={extras}
          onAddService={handleAddService}
          onUpdateServicePrice={handleUpdateServicePrice}
          onDeleteService={handleDeleteService}
          onAddExtra={handleAddExtra}
          onUpdateExtraPrice={handleUpdateExtraPrice}
          onDeleteExtra={handleDeleteExtra}
        />
      )}

      {activeTab === 'agenda' && (
        <Agenda
          appointments={appointments}
          clients={clients}
          services={services}
          extras={extras}
          specialPrices={specialPrices}
          onAddAppointment={handleAddAppointment}
          onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
          onUpdateAppointmentExtras={handleUpdateAppointmentExtras}
          onCompleteAppointmentAndCharge={handleCompleteAppointmentAndCharge}
          onDeleteAppointment={handleDeleteAppointment}
        />
      )}

      {activeTab === 'clientas' && (
        <Clientas
          clients={clients}
          appointments={appointments}
          services={services}
          specialPrices={specialPrices}
          onAddClient={handleAddClient}
          onUpdateClientNotes={handleUpdateClientNotes}
          onUpdateClientPhoto={handleUpdateClientPhoto}
          onDeleteClient={handleDeleteClient}
          onAddSpecialPrice={handleAddSpecialPrice}
          onDeleteSpecialPrice={handleDeleteSpecialPrice}
        />
      )}

      {activeTab === 'ajustes' && (
        <Ajustes
          priceChanges={priceChanges}
          categories={categories}
          paymentMethods={paymentMethods}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onAddPaymentMethod={handleAddPaymentMethod}
          onDeletePaymentMethod={handleDeletePaymentMethod}
          onResetDatabase={handleResetDatabase}
          adminProfile={adminProfile}
          onUpdateAdminProfile={handleUpdateAdminProfile}
          onRestoreBackup={handleRestoreBackup}
          onReloadData={loadAllData}
          fullBackupData={fullBackupData}
        />
      )}

    </Layout>
  );
}
