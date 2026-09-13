import { useState, useEffect, useRef } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Servicios } from './components/Servicios';
import { Agenda } from './components/Agenda';
import { Clientas } from './components/Clientas';
import { Ajustes } from './components/Ajustes';
import { LoginScreen } from './components/LoginScreen';
import { Clock, AlertTriangle } from 'lucide-react';

import { Client, Service, Appointment, FinancialMovement, SpecialPrice, PriceChangeEvent, AdminProfile } from './types';
import { applyRestoreBackup, CompleteBackupData } from './utils/backup';
import { generateId } from './utils/id';
import { safeGetJson, safeSetJson, safeRemoveItem } from './utils/storage';
import {
  SEED_CLIENTS,
  SEED_SERVICES,
  SEED_SPECIAL_PRICES,
  SEED_APPOINTMENTS,
  SEED_FINANCIALS
} from './data';

export default function App() {
  const [activeTab, setActiveTab] = useState('finanzas');

  // Authentication & Session Guard (OWASP Broken Access Control transient protection)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const session = sessionStorage.getItem('bs_auth_session') || localStorage.getItem('bs_auth_session');
      if (!session) return false;
      const parsed = JSON.parse(session);
      return Boolean(parsed?.isAuthenticated);
    } catch {
      return false;
    }
  });

  const [inactivityWarning, setInactivityWarning] = useState<boolean>(false);
  const [storageErrorBanner, setStorageErrorBanner] = useState<string | null>(null);
  const lastActiveRef = useRef<number>(Date.now());

  // Core Persistent States backed by Safe Storage
  const [clients, setClients] = useState<Client[]>(() => safeGetJson('bs_clients', SEED_CLIENTS));

  const [services, setServices] = useState<Service[]>(() => safeGetJson('bs_services', SEED_SERVICES));

  const [specialPrices, setSpecialPrices] = useState<SpecialPrice[]>(() => safeGetJson('bs_special_prices', SEED_SPECIAL_PRICES));

  const [appointments, setAppointments] = useState<Appointment[]>(() => safeGetJson('bs_appointments', SEED_APPOINTMENTS));

  const [movements, setMovements] = useState<FinancialMovement[]>(() => {
    const raw = safeGetJson('bs_movements', SEED_FINANCIALS);
    const seen = new Set<string>();
    return raw.filter((m: FinancialMovement) => {
      if (!m.id || seen.has(m.id)) {
        return false;
      }
      seen.add(m.id);
      return true;
    });
  });

  // Price change audit log state
  const [priceChanges, setPriceChanges] = useState<PriceChangeEvent[]>(() => safeGetJson('bs_price_changes', []));

  // Configurable Categories state
  const [categories, setCategories] = useState<string[]>(() => safeGetJson('bs_categories', ['Suministros & Esmaltes', 'Mantenimiento Equipo', 'Publicidad & RRSS', 'Alquiler & Expensas', 'Insumos Descartables']));

  // Configurable Payment Methods state
  const [paymentMethods, setPaymentMethods] = useState<string[]>(() => safeGetJson('bs_payment_methods', ['TRANSFERENCIA', 'EFECTIVO', 'TARJETA']));

  const [adminProfile, setAdminProfile] = useState<{ name: string; photoUrl: string }>(() => safeGetJson('bs_admin_profile', {
    name: 'Valentina Moretti',
    photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY-F9jrf6P_SkfHeHl51GzEIYfoydwPR8G2qCfRsheEg3NJPoq6fpSUdN1z4SZ1z8wjvQd9f6WsL9bsSGKXmKBMPhouu5Rr-NfHjOTXpcmEFA7v7oK4qJ-Roi0nmMUvJFNuTCRlijPw1FGIktp03sNiBF9R2uqBTyF6LygFvW5E8tUmF6ErSN6P0Qo7c_300bb-Gaagy8kYv16HiUPE6wnYUE37ExXB09alovCjyl0VcIDmWemT2Pr'
  }));

  // Sync states safely back to storage with error handling
  useEffect(() => {
    const res = safeSetJson('bs_clients', clients);
    if (!res.success && res.isQuotaExceeded) {
      setStorageErrorBanner('Límite de almacenamiento alcanzado. Descarga un Respaldo JSON desde Ajustes para no perder datos.');
    }
  }, [clients]);

  useEffect(() => {
    const res = safeSetJson('bs_services', services);
    if (!res.success && res.isQuotaExceeded) {
      setStorageErrorBanner('Límite de almacenamiento alcanzado. Descarga un Respaldo JSON desde Ajustes.');
    }
  }, [services]);

  useEffect(() => {
    const res = safeSetJson('bs_special_prices', specialPrices);
    if (!res.success && res.isQuotaExceeded) {
      setStorageErrorBanner('Límite de almacenamiento alcanzado.');
    }
  }, [specialPrices]);

  useEffect(() => {
    const res = safeSetJson('bs_appointments', appointments);
    if (!res.success && res.isQuotaExceeded) {
      setStorageErrorBanner('Límite de almacenamiento alcanzado.');
    }
  }, [appointments]);

  useEffect(() => {
    const res = safeSetJson('bs_movements', movements);
    if (!res.success && res.isQuotaExceeded) {
      setStorageErrorBanner('Límite de almacenamiento alcanzado.');
    }
  }, [movements]);

  useEffect(() => {
    const res = safeSetJson('bs_price_changes', priceChanges);
    if (!res.success && res.isQuotaExceeded) {
      setStorageErrorBanner('Límite de almacenamiento alcanzado.');
    }
  }, [priceChanges]);

  useEffect(() => {
    safeSetJson('bs_categories', categories);
  }, [categories]);

  useEffect(() => {
    safeSetJson('bs_payment_methods', paymentMethods);
  }, [paymentMethods]);

  useEffect(() => {
    safeSetJson('bs_admin_profile', adminProfile);
  }, [adminProfile]);

  // Inactivity detection & automatic session timeout
  useEffect(() => {
    if (!isAuthenticated) return;

    const getTimeoutMinutes = () => {
      const saved = localStorage.getItem('bs_auth_timeout_mins');
      return saved !== null ? Number(saved) : 15;
    };

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
    const sessionData = {
      isAuthenticated: true,
      authenticatedAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    sessionStorage.setItem('bs_auth_session', JSON.stringify(sessionData));
    localStorage.setItem('bs_auth_session', JSON.stringify(sessionData));
    lastActiveRef.current = Date.now();
    setInactivityWarning(false);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('bs_auth_session');
    localStorage.removeItem('bs_auth_session');
    setInactivityWarning(false);
    setIsAuthenticated(false);
  };


  // ==================== WORKFLOW: CLIENTS ====================
  const handleAddClient = (newCli: Omit<Client, 'id' | 'createdAt'>) => {
    const client: Client = {
      ...newCli,
      id: generateId('client'),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setClients((prev) => [...prev, client]);
  };

  const handleUpdateClientNotes = (clientId: string, notes: string) => {
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, notes } : c))
    );
  };

  const handleUpdateClientPhotos = (clientId: string, photos: Client['photos']) => {
    setClients((prev) =>
      prev.map((c) => (c.id === clientId ? { ...c, photos } : c))
    );
  };


  // ==================== WORKFLOW: SERVICES ====================
  const handleAddService = (newSrv: Omit<Service, 'id' | 'priceHistory'> & { initialPrice: number }) => {
    const service: Service = {
      id: generateId('service'),
      name: newSrv.name,
      description: newSrv.description,
      basePrice: newSrv.initialPrice,
      duration: newSrv.duration,
      priceHistory: [
        { date: new Date().toISOString().split('T')[0], price: newSrv.initialPrice, reason: 'Tarifa de apertura de catálogo.' }
      ]
    };
    setServices((prev) => [...prev, service]);
  };

  const handleUpdateServicePrice = (serviceId: string, newPrice: number, date: string, reason?: string) => {
    let oldPriceVal = 0;
    let srvName = '';

    setServices((prev) =>
      prev.map((s) => {
        if (s.id === serviceId) {
          oldPriceVal = s.basePrice;
          srvName = s.name;
          return {
            ...s,
            basePrice: newPrice,
            priceHistory: [{ date, price: newPrice, reason: reason || 'Actualización periódica.' }, ...(s.priceHistory || [])]
          };
        }
        return s;
      })
    );

    // Append to price changes audit ledger
    const newAudit: PriceChangeEvent = {
      id: generateId('audit'),
      type: 'catalog',
      targetId: serviceId,
      name: srvName || 'Servicio',
      oldPrice: oldPriceVal,
      newPrice: newPrice,
      date,
      user: 'Valentina Moretti (Admin)',
      reason: reason || 'Reajuste por costes e inflación.'
    };
    setPriceChanges((prev) => [newAudit, ...prev]);
  };

  const handleDeleteService = (serviceId: string) => {
    setServices((prev) => prev.filter((s) => s.id !== serviceId));
    setSpecialPrices((prev) => prev.filter((sp) => sp.serviceId !== serviceId));
  };


  // ==================== WORKFLOW: SPECIAL PRICES ====================
  const handleAddSpecialPrice = (newSp: Omit<SpecialPrice, 'id'>) => {
    const special: SpecialPrice = {
      ...newSp,
      id: generateId('special')
    };
    setSpecialPrices((prev) => [...prev, special]);
  };

  const handleToggleSpecialPriceStatus = (id: string) => {
    setSpecialPrices((prev) =>
      prev.map((sp) => (sp.id === id ? { ...sp, isActive: !sp.isActive } : sp))
    );
  };

  const handleDeleteSpecialPrice = (id: string) => {
    setSpecialPrices((prev) => prev.filter((sp) => sp.id !== id));
  };


  // ==================== WORKFLOW: FINANCES ====================
  const handleAddMovement = (newMov: Omit<FinancialMovement, 'id'>) => {
    const movement: FinancialMovement = {
      ...newMov,
      id: generateId('move')
    };
    setMovements((prev) => [movement, ...prev]);
  };

  const handleDeleteMovement = (id: string) => {
    setMovements((prev) => prev.filter((m) => m.id !== id));
  };


  // ==================== WORKFLOW: APPOINTMENTS ====================
  const handleAddAppointment = (newAppt: Omit<Appointment, 'id'> & { id?: string }) => {
    const appt: Appointment = {
      ...newAppt,
      id: newAppt.id || generateId('appt')
    };
    setAppointments((prev) => [...prev, appt]);
  };

  const handleUpdateAppointmentStatus = (
    id: string,
    status: Appointment['status'],
    cancelReason?: string,
    rescheduledToId?: string
  ) => {
    const targetAppt = appointments.find((a) => a.id === id);
    if (!targetAppt) return;

    // Side-effects should run outside of pure state setters
    if (targetAppt.status !== 'completed' && status === 'completed') {
      const client = clients.find((c) => c.id === targetAppt.clientId);
      const service = services.find((s) => s.id === targetAppt.serviceId);
      
      const serviceName = service ? service.name : 'Tratamiento';
      const clientName = client ? client.name : 'Clienta Regular';

      handleAddMovement({
        type: 'income',
        category: serviceName,
        amount: targetAppt.priceCharged,
        date: targetAppt.date,
        description: `Servicio ${serviceName} - ${clientName}`,
        paymentMethod: 'TRANSFERENCIA',
        clientName,
        serviceName,
        appointmentId: targetAppt.id,
        costOfSupplies: 150, // Standard template default cost
        staffCommission: targetAppt.priceCharged * 0.15 // Standard default 15%
      });
    }

    setAppointments((prev) =>
      prev.map((appt) => {
        if (appt.id === id) {
          return {
            ...appt,
            status,
            ...(cancelReason ? { cancelReason } : {}),
            ...(rescheduledToId ? { rescheduledToId } : {})
          };
        }
        return appt;
      })
    );
  };

  // Complete appointment with customized supplies and staff commission (Version 2.0 Real-time economics tracker)
  const handleCompleteAppointmentAndCharge = (
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

    // Post transaction to financial accounting cleanly outside state setter
    handleAddMovement({
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

    setAppointments((prev) =>
      prev.map((appt) => {
        if (appt.id === id) {
          return { ...appt, status: 'completed' };
        }
        return appt;
      })
    );
  };


  // ==================== WORKFLOW: SETTINGS & DATABASE MAINTENANCE ====================
  const handleAddCategory = (category: string) => {
    setCategories((prev) => [...prev, category]);
  };

  const handleDeleteCategory = (category: string) => {
    setCategories((prev) => prev.filter((c) => c !== category));
  };

  const handleAddPaymentMethod = (method: string) => {
    setPaymentMethods((prev) => [...prev, method]);
  };

  const handleDeletePaymentMethod = (method: string) => {
    setPaymentMethods((prev) => prev.filter((m) => m !== method));
  };

  const handleResetDatabase = () => {
    // Clear state
    setClients(SEED_CLIENTS);
    setServices(SEED_SERVICES);
    setSpecialPrices(SEED_SPECIAL_PRICES);
    setAppointments(SEED_APPOINTMENTS);
    setMovements(SEED_FINANCIALS);
    setPriceChanges([]);
    setCategories(['Suministros & Esmaltes', 'Mantenimiento Equipo', 'Publicidad & RRSS', 'Alquiler & Expensas', 'Insumos Descartables']);
    setPaymentMethods(['TRANSFERENCIA', 'EFECTIVO', 'TARJETA']);
    setAdminProfile({
      name: 'Valentina Moretti',
      photoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY-F9jrf6P_SkfHeHl51GzEIYfoydwPR8G2qCfRsheEg3NJPoq6fpSUdN1z4SZ1z8wjvQd9f6WsL9bsSGKXmKBMPhouu5Rr-NfHjOTXpcmEFA7v7oK4qJ-Roi0nmMUvJFNuTCRlijPw1FGIktp03sNiBF9R2uqBTyF6LygFvW5E8tUmF6ErSN6P0Qo7c_300bb-Gaagy8kYv16HiUPE6wnYUE37ExXB09alovCjyl0VcIDmWemT2Pr'
    });

    // Wipe storage safely
    safeRemoveItem('bs_clients');
    safeRemoveItem('bs_services');
    safeRemoveItem('bs_special_prices');
    safeRemoveItem('bs_appointments');
    safeRemoveItem('bs_movements');
    safeRemoveItem('bs_price_changes');
    safeRemoveItem('bs_categories');
    safeRemoveItem('bs_payment_methods');
    safeRemoveItem('bs_admin_profile');

    alert('¡Base de datos restablecida correctamente a sus valores predeterminados de semilla!');
  };

  const handleRestoreBackup = async (backup: CompleteBackupData) => {
    await applyRestoreBackup(backup);
    const { payload } = backup;
    setClients(payload.clients);
    setServices(payload.services);
    setSpecialPrices(payload.specialPrices);
    setAppointments(payload.appointments);
    setMovements(payload.movements);
    setPriceChanges(payload.priceChanges);
    setCategories(payload.categories);
    setPaymentMethods(payload.paymentMethods);
    if (payload.adminProfile) {
      setAdminProfile(payload.adminProfile);
    }
  };


  if (!isAuthenticated) {
    return (
      <LoginScreen
        adminProfile={adminProfile}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      adminProfile={adminProfile}
      onLogout={handleLogout}
    >
      {storageErrorBanner && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-red-800 animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle size={14} className="text-red-600 shrink-0" />
            <span>{storageErrorBanner}</span>
          </div>
          <button
            onClick={() => setStorageErrorBanner(null)}
            className="px-2.5 py-0.5 bg-red-600 text-white rounded-md text-[11px] font-bold hover:bg-red-700 transition-colors ml-4 shrink-0"
          >
            Entendido
          </button>
        </div>
      )}

      {inactivityWarning && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs text-amber-800">
          <div className="flex items-center gap-2 font-medium">
            <Clock size={14} className="text-amber-600 animate-pulse" />
            <span>Tu sesión se bloqueará en 1 minuto por inactividad. Presiona continuar para mantenerla abierta.</span>
          </div>
          <button
            onClick={() => {
              lastActiveRef.current = Date.now();
              setInactivityWarning(false);
            }}
            className="px-3 py-1 bg-amber-600 text-white rounded-lg font-bold text-[11px] hover:bg-amber-700 transition-colors"
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
          onAddService={handleAddService}
          onUpdateServicePrice={handleUpdateServicePrice}
          onDeleteService={handleDeleteService}
        />
      )}

      {activeTab === 'agenda' && (
        <Agenda
          appointments={appointments}
          clients={clients}
          services={services}
          specialPrices={specialPrices}
          onAddAppointment={handleAddAppointment}
          onUpdateAppointmentStatus={handleUpdateAppointmentStatus}
          onCompleteAppointmentAndCharge={handleCompleteAppointmentAndCharge}
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
          onUpdateClientPhotos={handleUpdateClientPhotos}
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
          onUpdateAdminProfile={setAdminProfile}
          onRestoreBackup={handleRestoreBackup}
        />
      )}

    </Layout>
  );
}
