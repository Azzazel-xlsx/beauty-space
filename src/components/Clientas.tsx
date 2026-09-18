import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Client, Appointment, Service, SpecialPrice } from '../types';
import { Plus, Search, Calendar, Phone, Mail, FileText, Sparkles, Tag, ArrowLeft, Heart, PenTool, Check, AlertTriangle, Trash2, Award, MessageSquare, User, ChevronDown, Camera, Upload, RotateCcw } from 'lucide-react';
import { generateId } from '../utils/id';
import { useDebounce } from '../hooks/useDebounce';
import { formatMoney } from '../utils/formatters';
import { compressImage } from '../utils/imageCompressor';
import { useToast } from './Toast';

interface ClientasProps {
  clients: Client[];
  appointments: Appointment[];
  services: Service[];
  specialPrices: SpecialPrice[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  onUpdateClientNotes: (clientId: string, notes: string) => void;
  onDeleteClient?: (id: string) => void;
  onAddSpecialPrice?: (newSp: Omit<SpecialPrice, 'id'>) => void;
  onDeleteSpecialPrice?: (id: string) => void;
}

// Preset beauty avatar photos
const PHOTO_PRESETS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAfCHcOAPfDy6kGjzyxZw6RiWt1jw0ZjkZLcwLo1TqbBzRl46Qu1xvQTb6Gla396xyP11FUvxTudM8ZLGWuzv3g6SR2L7LHQucAnq2u_1TcK8U8F1-z796XJoDBpuKBOThnFRz_HkuUUCgNltlu7cz9jZ02br0Yz5p1HZDqJA6wAHBo1LVKThCCDBLiGPGkY5VJSl04n1C7_ykP8_z9JDDD-vLA8NB_aX_btxu95yCCJDbzK9mj2gjC',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBofdI6p2JFfm4lwiD03UfIz4kVMQldsbp-fwLam3qeXWycxcZR9bEmCvuU_Se0NsH8ZMy_X0CP_g__0W42tQTnuA78YZTFDgZW0RwZovPrVSetKSiMfPzgyB5V1SyLKVhwBsqLt-jKlSVlbQ8aikYF3KqwRqla6d7YxtwozCFAZ7Dv62be1tMHZkOfUM3d-iEP8jRqR4BxUnC-nQbRW1xom3sOZgIPtFNR9gwbX55Pj13M_tjEG8Kh',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD9HIJrG8f59wWNWDQKR59Mb7molSuHZcoRik_7jmguz63utzQf6-uUZ_hx7KlA1i6Gyb9kDsFzXGf5prdFrm9fGTCD1BWN9HE-VYTC80rT-nwYwd_FMs8pNMXT-w6HZ5aYWWQfx1lX5ReJZNW9X09vHuYXd_csIRhHCuX4M6skrox9dqFgTsft-vln3SyhXAaX1ahv18oo4LIqPZhMJytmR8LYXixRcEglw-YfZfogs24t2D_kZoRH',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBmWgXYqQmqLcdtJJhsjvpqkOIaeYooO2kYEPLBaeMNag2pxKBpQZO0OvxJFsXPxo053gGYQAgxJ0bs8hs55PsaYmzL7vrF2iELzv7F4M2VQVZ3mKSo-rjpAi3hw_9nPW3WCYdNuPt28ZgS480vb3umd18ngJ4vfpUW2XEHJpIlRJ9e301nLMYMx6eCmjDcYx9-14UvxVtU4dIbBgUAGqha44D54XwtGaV0TvJPkOfP99StX4feX3zr',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCrQFZ8zon5OqIdBYLBmY5ppuMsBNkToc86eUVA12msbRwaw1fMj0YzAyS3fpNUx4Ys4GaN3pCr1wXOAML3uF6SF6UhlnPQrW_V7ApAME5VqNP_OKnuTKk7Ko3ILG_Mvo-LAs2ktLdNeHtuqXqQVxEe7hcQgAJqHcNt0FKynnF9V5Ajk3H8pPQCBBwxYcPy39Xipxhy2Ql9XqqBdjFjDav-jLZr-tIYcXTaJHGriAJ7SY678kIWWoN6',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCcEbq6hKwbgCRyY5dtUsMWUPWY3kGfiMTavhdjYrhYDtFRG5CvnCT6HGQIIJ94JlNITsd-7ytXgPrKGLmCOp6ENzXPiQczDEmk6ljtbTc3UHJpAFahOzgtCGeSy5fLzYPkW7KbqanX9p-n3eiQmc2O-9q3IvlhCj2LKYvXe1rmgyJm1obgudu4--p4LBygM5ZSrEeDpfkE-1dJ95RxVst5M2iF6ggwMDdNRJfEr1VAATTDuGpei0Go',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBQRRqRd7HBEQWSDUAXJCIHjRAQXA2n5D1diEHHN7Fe3V40Uz4GVn2ek4I0fmAQNZCl6L0dG5yBDNFvI_PpJws0gzl6f5gM3sq947Ev3p52_ScR80btPJFF2G1tYQwFzxjzjs8oeCLzBCPEhBS5atYoRMDAOw3hf-dHhVCR7SFH5MQcAZlZMjlXNTgzSYMp6Ok9SYKmELgZ_VSicCvUO2CLb0T3emI7f9ZZiaYzTuwRFwA_Xcu5otbg',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDozwP_jdzjNY1s2fxlwyCnaP9vNfSOZTygULiECzsCQqJDCg3VTfIbBrpKRCpaO0jsbMN94wK6H1PCObtY4-h-3IBrdmXsQXvgKaBDdysFH0NL_vTjUXnSEOFb_STweo7ImTdnyod2loQoQegpPEUS5NboHLnXpkE0JZ2iUOPLAetQLbIBJzKi-CNxkceYu_eqafT9eJZsvhRRClwed3OBRuVPNIaFuYdpsw7nxDmUbIMOCS-IJgJh',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDOH_J7RhgqdXYsX3NCi5aBMi3tYJUSLVHyHT_STpc78QW6c3mOZEp2uZCUiuldxz_ogqa_6XSki_GvcGrzYlc1dpccBw-ufK_PsArQyeKsUQ4XIp7JvdcJBoHraHpO251dFaYlNYVZ_JsLTvOcT-SFonicy884E3EIf-8eYADQNIU6xBlt73OkuscwPJZgCWmpYUT0NTAmU6dhMTTRE5XsJIdmeZ7pJeZ7i2GPU3JVnDDakG9Y2xnr'
];

// Presets for before/after nails if none exist
const PRESET_BEFORE_NAILS = 'https://images.unsplash.com/photo-1519014816548-bf5fe059798b?w=400&auto=format&fit=crop&q=60';
const PRESET_AFTER_NAILS = 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=400&auto=format&fit=crop&q=80';

export const Clientas: React.FC<ClientasProps> = ({
  clients,
  appointments,
  services,
  specialPrices,
  onAddClient,
  onUpdateClientNotes,
  onDeleteClient,
  onAddSpecialPrice,
  onDeleteSpecialPrice
}) => {
  const toast = useToast();
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSegment, setActiveSegment] = useState<'all' | 'new' | 'frequent' | 'inactive'>('all');

  // Form states for adding new client
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [customPhoto, setCustomPhoto] = useState<string | null>(null);
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);
  const [isDragOverPhoto, setIsDragOverPhoto] = useState(false);
  const [formError, setFormError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File upload processing with downscaling and compression
  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setFormError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }
    try {
      setIsCompressingPhoto(true);
      setFormError('');
      // Downscale to 360x360 for high quality yet compact storage (~20KB)
      const compressed = await compressImage(file, {
        maxWidth: 360,
        maxHeight: 360,
        quality: 0.85,
        mimeType: 'image/jpeg'
      });
      setCustomPhoto(compressed);
    } catch (err) {
      console.error('Error procesando imagen de clienta:', err);
      setFormError('No se pudo procesar la imagen seleccionada. Intenta con otra foto.');
    } finally {
      setIsCompressingPhoto(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDropPhoto = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileProcess(file);
    }
  };

  // Notes state inside selected client view
  const [tempNotes, setTempNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Special prices assignment state inside selected client view
  const [showAddSpecialPriceForm, setShowAddSpecialPriceForm] = useState(false);
  const [newSpecialServiceId, setNewSpecialServiceId] = useState('');
  const [newSpecialPrice, setNewSpecialPrice] = useState('');
  const [newSpecialGroupLabel, setNewSpecialGroupLabel] = useState('CLIENTA FRECUENTE');
  const [specialPriceError, setSpecialPriceError] = useState('');

  // Search debounce and pagination limit
  const debouncedSearch = useDebounce(searchTerm, 250);
  const [visibleLimit, setVisibleLimit] = useState(18);

  useEffect(() => {
    setVisibleLimit(18);
  }, [debouncedSearch, activeSegment]);

  // Filter clients by debounced search and segment
  const filteredClients = useMemo(() => {
    const searchClean = debouncedSearch.toLowerCase().trim();
    return clients.filter((c) => {
      // Search filter
      const matchesSearch =
        c.name.toLowerCase().includes(searchClean) ||
        c.phone.includes(searchClean) ||
        c.email.toLowerCase().includes(searchClean);

      if (!matchesSearch) return false;

      // Segment filters
      const clientAppts = appointments.filter(a => a.clientId === c.id);
      const completedAppts = clientAppts.filter(a => a.status === 'completed');

      if (activeSegment === 'all') return true;
      if (activeSegment === 'frequent') return completedAppts.length >= 3;

      const creationDate = new Date(c.createdAt || '2026-01-01');
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - creationDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (activeSegment === 'new') return diffDays <= 30;

      if (activeSegment === 'inactive') {
        const hasRecent = completedAppts.some(a => {
          const apptDate = new Date(a.date);
          const diffApptTime = Math.abs(today.getTime() - apptDate.getTime());
          const diffApptDays = Math.ceil(diffApptTime / (1000 * 60 * 60 * 24));
          return diffApptDays <= 30;
        });
        return !hasRecent;
      }

      return true;
    });
  }, [clients, debouncedSearch, activeSegment, appointments]);

  // Selected client details
  const selectedClient = useMemo(() => {
    return clients.find(c => c.id === selectedClientId);
  }, [clients, selectedClientId]);

  // Sync tempNotes when selected client changes
  React.useEffect(() => {
    if (selectedClient) {
      setTempNotes(selectedClient.notes || '');
      setIsEditingNotes(false);
      setShowAddSpecialPriceForm(false);
      setSpecialPriceError('');
      if (services.length > 0) {
        setNewSpecialServiceId(services[0].id);
      }
    }
  }, [selectedClient, services]);

  // Client statistics & loyalty calculator
  const clientStats = useMemo(() => {
    if (!selectedClientId) return null;
    
    const clientAppts = appointments.filter(a => a.clientId === selectedClientId);
    const completedAppts = clientAppts.filter(a => a.status === 'completed');
    const totalSpent = completedAppts.reduce((sum, a) => sum + a.priceCharged, 0);

    // List client custom prices
    const clientSpecials = specialPrices.filter(sp => sp.clientId === selectedClientId);

    // Dynamic loyalty score calculation (max 100)
    // 40% based on visit count (10 visits = max)
    // 40% based on money spent (10,000 ARS/MXN = max)
    // 20% on frequency of special pricing
    const visitsPoints = Math.min((completedAppts.length / 8) * 40, 40);
    const spentPoints = Math.min((totalSpent / 6000) * 40, 40);
    const VIPBonus = clientSpecials.some(s => s.isActive) ? 20 : 10;
    const loyaltyScore = Math.round(visitsPoints + spentPoints + VIPBonus);

    return {
      appointments: clientAppts,
      visitsCount: completedAppts.length,
      totalSpent,
      specials: clientSpecials,
      loyaltyScore: Math.min(loyaltyScore, 100)
    };
  }, [selectedClientId, appointments, specialPrices]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) {
      setFormError('El nombre y teléfono son obligatorios');
      return;
    }

    // DUPLICATE PREVENTER: Normalizing phone characters to check exact matches
    const normalizedNewPhone = newPhone.replace(/\D/g, '');
    const isDuplicate = clients.some(c => c.phone.replace(/\D/g, '') === normalizedNewPhone);

    if (isDuplicate) {
      setFormError('¡Atención! Ya existe una ficha de clienta registrada con este número de teléfono celular.');
      return;
    }

    onAddClient({
      name: newName,
      phone: newPhone,
      email: newEmail || 'Sin email',
      notes: newNotes || 'Sin anotaciones particulares.',
      photoUrl: customPhoto || PHOTO_PRESETS[avatarIndex]
    });

    toast.success(`Clienta "${newName.trim()}" registrada con éxito.`);

    // Reset Form
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewNotes('');
    setAvatarIndex(0);
    setCustomPhoto(null);
    setFormError('');
    setShowAddForm(false);
  };

  const handleNotesUpdate = () => {
    if (selectedClientId) {
      onUpdateClientNotes(selectedClientId, tempNotes);
      setIsEditingNotes(false);
      toast.success('¡Comentario personalizado guardado con éxito!');
    }
  };

  const handleAssignSpecialPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId) return;
    if (!newSpecialServiceId) {
      setSpecialPriceError('Selecciona un servicio');
      toast.warning('Selecciona un servicio para la tarifa.');
      return;
    }
    const parsedPrice = parseFloat(newSpecialPrice);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setSpecialPriceError('Ingresa un precio válido (ej. 1500)');
      toast.error('Ingresa un precio numérico válido.');
      return;
    }

    if (onAddSpecialPrice) {
      onAddSpecialPrice({
        clientId: selectedClientId,
        serviceId: newSpecialServiceId,
        specialPrice: parsedPrice,
        groupLabel: newSpecialGroupLabel || 'CLIENTA FRECUENTE',
        isActive: true
      });
      setNewSpecialPrice('');
      setShowAddSpecialPriceForm(false);
      setSpecialPriceError('');
      toast.success('¡Tarifa especial guardada exitosamente!');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* DOSSIER VIEW (DETAIL OVERLAY / PAGE TRANSITION) */}
      {selectedClient ? (
        <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
          
          {/* Barra superior de navegación y retorno */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSelectedClientId(null)}
              className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:text-primary/80 bg-surface-container px-4 py-2.5 rounded-full border border-outline-variant/20 shadow-xs transition-all cursor-pointer"
            >
              <ArrowLeft size={14} /> Volver al Listado de Clientas
            </button>
            <div className="flex items-center gap-3">
              {onDeleteClient && (
                <button
                  type="button"
                  onClick={() => setClientToDelete(selectedClient)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-terracotta hover:bg-terracotta/10 px-3.5 py-1.5 rounded-full border border-terracotta/30 transition-all cursor-pointer"
                  title={`Eliminar ficha de ${selectedClient.name}`}
                >
                  <Trash2 size={13} /> Eliminar Ficha
                </button>
              )}
              <span className="text-[11px] font-bold text-on-surface-variant/60 uppercase tracking-wider">
                Ficha de Clienta
              </span>
            </div>
          </div>

          {/* Tarjeta de Identificación Básica de la Clienta */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-3xl p-6 hard-shadow flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative shrink-0">
              <img
                src={selectedClient.photoUrl}
                alt={selectedClient.name}
                className="w-24 h-24 rounded-full object-cover border-2 border-primary/20 p-1 bg-white shadow-xs"
              />
              {clientStats && clientStats.loyaltyScore >= 70 && (
                <span className="absolute bottom-0 right-1 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center border-2 border-white shadow-xs" title="Cliente VIP">
                  <Award size={13} className="fill-white" />
                </span>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-serif text-2xl font-black text-on-surface">{selectedClient.name}</h3>
                  <p className="text-[11px] text-on-surface-variant/60 font-semibold">
                    Registrada el: {selectedClient.createdAt || 'Fecha no registrada'}
                  </p>
                </div>
                {clientStats && (
                  <span className={`self-center sm:self-auto text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider border ${
                    clientStats.loyaltyScore >= 75
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : clientStats.loyaltyScore >= 40
                      ? 'bg-sage/10 text-sage border-sage/30'
                      : 'bg-surface-container text-on-surface-variant border-outline-variant/30'
                  }`}>
                    {clientStats.loyaltyScore >= 75 ? '★ Clienta VIP' : clientStats.loyaltyScore >= 40 ? 'Clienta Frecuente' : 'Nueva Clienta'}
                  </span>
                )}
              </div>

              {/* Chips de contacto */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                <div className="flex items-center gap-2 bg-surface-container/60 px-3 py-1.5 rounded-xl border border-outline-variant/15 text-xs font-semibold text-on-surface-variant">
                  <Phone size={13} className="text-primary/70" />
                  <span>{selectedClient.phone}</span>
                </div>
                {selectedClient.email && selectedClient.email !== 'Sin email' && (
                  <div className="flex items-center gap-2 bg-surface-container/60 px-3 py-1.5 rounded-xl border border-outline-variant/15 text-xs font-semibold text-on-surface-variant">
                    <Mail size={13} className="text-primary/70" />
                    <span>{selectedClient.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 1. & 2. SECCIÓN: FIDELIDAD Y FRECUENCIA */}
          {clientStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* FIDELIDAD */}
              <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-3xl p-6 hard-shadow space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Heart size={18} className="fill-primary/20" />
                    </div>
                    <div>
                      <h4 className="font-serif text-base font-black text-on-surface">Fidelidad</h4>
                      <p className="text-[10px] text-on-surface-variant/60 font-semibold">Índice de lealtad y constancia</p>
                    </div>
                  </div>
                  <span className="font-serif text-2xl font-black text-primary">
                    {clientStats.loyaltyScore}%
                  </span>
                </div>

                {/* Barra de progreso visual */}
                <div className="space-y-1.5">
                  <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-primary h-full transition-all duration-700 rounded-full"
                      style={{ width: `${clientStats.loyaltyScore}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] font-bold text-on-surface-variant/50 uppercase">
                    <span>Inicial (0%)</span>
                    <span>Recurrente (50%)</span>
                    <span>VIP (100%)</span>
                  </div>
                </div>

                <div className="bg-primary/5 p-3.5 rounded-2xl border border-primary/10">
                  <p className="text-xs text-primary font-bold">
                    {clientStats.loyaltyScore >= 75
                      ? 'Nivel Diamante: Constancia sobresaliente y máxima prioridad de atención.'
                      : clientStats.loyaltyScore >= 40
                      ? 'Nivel Recurrente: Visitas habituales y fidelización consolidada.'
                      : 'Nivel Inicial: En etapa de bienvenida y fidelización.'}
                  </p>
                </div>
              </div>

              {/* FRECUENCIA */}
              <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-3xl p-6 hard-shadow space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h4 className="font-serif text-base font-black text-on-surface">Frecuencia</h4>
                      <p className="text-[10px] text-on-surface-variant/60 font-semibold">Historial de asistencia al salón</p>
                    </div>
                  </div>
                  <span className="font-serif text-2xl font-black text-on-surface">
                    {clientStats.visitsCount} <span className="text-sm font-normal text-on-surface-variant/70">citas</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-surface-container p-3.5 rounded-2xl border border-outline-variant/15 text-center">
                    <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-bold block">Total Citas</span>
                    <h5 className="font-serif text-lg font-black text-primary mt-1">{clientStats.visitsCount} completadas</h5>
                  </div>
                  <div className="bg-surface-container p-3.5 rounded-2xl border border-outline-variant/15 text-center">
                    <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/60 font-bold block">Invertido Total</span>
                    <h5 className="font-serif text-lg font-black text-on-surface mt-1">{formatMoney(clientStats.totalSpent)}</h5>
                  </div>
                </div>

                <p className="text-xs text-on-surface-variant/70 font-semibold leading-relaxed">
                  {clientStats.visitsCount >= 5
                    ? 'Excelente constancia de turnos periódicos registrados en el estudio.'
                    : clientStats.visitsCount > 0
                    ? 'Clienta con citas previas registradas en el sistema.'
                    : 'Aún no registra turnos completados.'}
                </p>
              </div>

            </div>
          )}

          {/* 3. SECCIÓN: BOX PARA COMENTARIOS PERSONALIZADOS */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-3xl p-6 hard-shadow space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h4 className="font-serif text-base font-black text-on-surface">Comentarios Personalizados</h4>
                  <p className="text-[10px] text-on-surface-variant/60 font-semibold">Notas privadas, preferencias, estilo o consideraciones especiales</p>
                </div>
              </div>

              {!isEditingNotes ? (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary bg-primary/10 hover:bg-primary/15 border border-primary/20 px-3.5 py-1.5 rounded-full transition-all cursor-pointer"
                >
                  <PenTool size={13} />
                  Editar Comentario
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setTempNotes(selectedClient.notes || '');
                      setIsEditingNotes(false);
                    }}
                    className="text-xs font-bold text-on-surface-variant hover:text-on-surface px-3 py-1.5 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleNotesUpdate}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/95 px-4 py-1.5 rounded-full shadow-xs transition-all cursor-pointer"
                  >
                    <Check size={13} />
                    Guardar
                  </button>
                </div>
              )}
            </div>

            <div className="wavy-divider opacity-20"></div>

            {isEditingNotes ? (
              <div className="space-y-3">
                <textarea
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  rows={4}
                  placeholder="Escribe comentarios personalizados sobre esta clienta (ej: prefiere café con leche de almendras, cutículas sensibles, le encanta esmalte rojo cereza, etc.)..."
                  className="w-full bg-surface-container text-xs p-4 rounded-2xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold text-on-surface resize-y leading-relaxed"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleNotesUpdate}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-primary hover:bg-primary/95 px-5 py-2 rounded-full shadow-xs transition-all cursor-pointer"
                  >
                    <Check size={14} /> Guardar Comentario
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-surface-container-low/50 p-4 rounded-2xl border border-outline-variant/15">
                {selectedClient.notes && selectedClient.notes.trim() ? (
                  <p className="text-xs text-on-surface font-semibold leading-relaxed italic">
                    "{selectedClient.notes}"
                  </p>
                ) : (
                  <p className="text-xs text-on-surface-variant/50 font-medium italic">
                    No hay comentarios personalizados guardados para esta clienta. Haz clic en "Editar Comentario" para agregar anotaciones.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 4. SECCIÓN PARA PODER COLOCARLE PRECIOS ESPECIALES */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 rounded-3xl p-6 hard-shadow space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Tag size={18} />
                </div>
                <div>
                  <h4 className="font-serif text-base font-black text-on-surface">Precios Especiales para esta Clienta</h4>
                  <p className="text-[10px] text-on-surface-variant/60 font-semibold">Tarifas preferenciales exclusivas vinculadas a su perfil</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowAddSpecialPriceForm(!showAddSpecialPriceForm);
                  setSpecialPriceError('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold bg-primary text-white hover:bg-primary/90 px-4 py-2 rounded-full shadow-xs transition-all self-start sm:self-auto cursor-pointer"
              >
                <Plus size={14} />
                {showAddSpecialPriceForm ? 'Cerrar Formulario' : 'Colocar Precio Especial'}
              </button>
            </div>

            <div className="wavy-divider opacity-20"></div>

            {/* FORMULARIO PARA COLOCARLE UN PRECIO ESPECIAL */}
            {showAddSpecialPriceForm && (
              <form onSubmit={handleAssignSpecialPrice} className="bg-surface-container p-5 rounded-3xl border border-outline-variant/30 space-y-4 animate-in slide-in-from-top-3 duration-200">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs uppercase tracking-wider font-extrabold text-primary flex items-center gap-1.5">
                    <Sparkles size={14} /> Asignar Nueva Tarifa Especial
                  </h5>
                  <span className="text-[10px] text-on-surface-variant/60 font-semibold">
                    Para: {selectedClient.name}
                  </span>
                </div>

                {specialPriceError && (
                  <div className="p-2.5 rounded-xl bg-terracotta/15 border border-terracotta/30 text-terracotta text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={14} /> {specialPriceError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Selector de servicio */}
                  <div className="space-y-1 sm:col-span-1">
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Servicio</label>
                    <select
                      value={newSpecialServiceId}
                      onChange={(e) => setNewSpecialServiceId(e.target.value)}
                      className="w-full bg-surface-container-lowest text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 font-semibold text-on-surface focus:outline-none focus:border-primary"
                    >
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} (Base: {formatMoney(s.basePrice)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Input de precio especial */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Precio Especial ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="50"
                      placeholder="Ej. 1800"
                      value={newSpecialPrice}
                      onChange={(e) => setNewSpecialPrice(e.target.value)}
                      className="w-full bg-surface-container-lowest text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 font-bold text-primary focus:outline-none focus:border-primary"
                    />
                  </div>

                  {/* Selector de etiqueta de grupo */}
                  <div className="space-y-1">
                    <label className="block text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Etiqueta / Motivo</label>
                    <select
                      value={newSpecialGroupLabel}
                      onChange={(e) => setNewSpecialGroupLabel(e.target.value)}
                      className="w-full bg-surface-container-lowest text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 font-semibold text-on-surface focus:outline-none focus:border-primary"
                    >
                      <option value="CLIENTA FRECUENTE">CLIENTA FRECUENTE</option>
                      <option value="VIP DIAMANTE">VIP DIAMANTE</option>
                      <option value="AMIGA & FAMILIA">AMIGA & FAMILIA</option>
                      <option value="TARIFA ESPECIAL">TARIFA ESPECIAL</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSpecialPriceForm(false)}
                    className="px-4 py-2 rounded-full text-xs font-bold text-on-surface-variant hover:text-on-surface cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-full text-xs font-bold bg-primary text-white hover:bg-primary/95 shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check size={14} /> Guardar Tarifa Especial
                  </button>
                </div>
              </form>
            )}

            {/* LISTA DE PRECIOS ESPECIALES DE LA CLIENTA */}
            {clientStats && clientStats.specials.length === 0 ? (
              <div className="py-8 text-center rounded-2xl border border-dashed border-outline-variant/30 bg-surface-container-low/30 space-y-2">
                <Tag size={24} className="mx-auto text-on-surface-variant/40" />
                <p className="text-xs text-on-surface-variant/60 font-semibold">
                  Esta clienta no tiene precios especiales asignados todavía.
                </p>
                <p className="text-[11px] text-on-surface-variant/45">
                  Haz clic en "Colocar Precio Especial" para fijarle una tarifa preferencial para cualquier servicio.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {clientStats?.specials.map((sp) => {
                  const service = services.find((s) => s.id === sp.serviceId);
                  if (!service) return null;

                  return (
                    <div
                      key={sp.id}
                      className="bg-surface-container-low/60 border border-outline-variant/20 p-4 rounded-2xl flex items-center justify-between hover:border-primary/30 transition-all"
                    >
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-on-surface">{service.name}</p>
                        <p className="text-[10px] text-on-surface-variant/50 font-medium line-through">
                          Regular: {formatMoney(service.basePrice)}
                        </p>
                        <span className="inline-block text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wider mt-1">
                          {sp.groupLabel}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[9px] text-on-surface-variant/60 font-bold block uppercase tracking-wider">Precio Asignado</span>
                          <span className="font-serif text-base font-black text-primary">{formatMoney(sp.specialPrice)}</span>
                        </div>
                        {onDeleteSpecialPrice && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteSpecialPrice(sp.id);
                              toast.info('Tarifa especial eliminada.');
                            }}
                            className="p-2 text-on-surface-variant/40 hover:text-terracotta hover:bg-terracotta/10 rounded-full transition-colors cursor-pointer"
                            title="Eliminar tarifa especial"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      ) : (
        // DOSSIER LISTING GENERAL GRID & CONTROLS
        <div className="space-y-6">
          
          {/* Controls */}
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center bg-surface-container border border-outline-variant/40 p-4 rounded-2xl hard-shadow">
            
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50" size={16} />
              <input
                type="text"
                placeholder="Buscar clienta por nombre, teléfono o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface-container-lowest text-base sm:text-xs min-h-[44px] py-2.5 pl-10 pr-4 rounded-full border border-outline-variant/40 focus:outline-none focus:border-primary placeholder:text-on-surface-variant/40 font-semibold"
              />
            </div>
            
            {/* Segment Selector & New Client Button */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Segment Toggles */}
              <div className="flex bg-surface-container-low p-1 rounded-full border border-outline-variant/20 overflow-x-auto max-w-full">
                <button
                  onClick={() => setActiveSegment('all')}
                  className={`px-3.5 py-2 sm:py-1.5 rounded-full text-[10px] sm:text-[10px] font-black uppercase tracking-wider transition-all min-h-[38px] flex items-center cursor-pointer ${
                    activeSegment === 'all' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant/80 hover:text-primary'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setActiveSegment('new')}
                  className={`px-3.5 py-2 sm:py-1.5 rounded-full text-[10px] sm:text-[10px] font-black uppercase tracking-wider transition-all min-h-[38px] flex items-center cursor-pointer ${
                    activeSegment === 'new' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant/80 hover:text-primary'
                  }`}
                >
                  Nuevas (30d)
                </button>
                <button
                  onClick={() => setActiveSegment('frequent')}
                  className={`px-3.5 py-2 sm:py-1.5 rounded-full text-[10px] sm:text-[10px] font-black uppercase tracking-wider transition-all min-h-[38px] flex items-center cursor-pointer ${
                    activeSegment === 'frequent' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant/80 hover:text-primary'
                  }`}
                >
                  Frecuentes (≥3)
                </button>
                <button
                  onClick={() => setActiveSegment('inactive')}
                  className={`px-3.5 py-2 sm:py-1.5 rounded-full text-[10px] sm:text-[10px] font-black uppercase tracking-wider transition-all min-h-[38px] flex items-center cursor-pointer ${
                    activeSegment === 'inactive' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant/80 hover:text-primary'
                  }`}
                >
                  Pausadas (30d)
                </button>
              </div>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-full text-xs font-bold flex items-center gap-2 editorial-shadow transition-all min-h-[44px] cursor-pointer"
              >
                <Plus size={16} /> {showAddForm ? 'Ocultar Alta' : 'Nueva Clienta'}
              </button>
            </div>
          </div>

          {/* NEW CLIENT FORM */}
          {showAddForm && (
            <div className="bg-surface-container-lowest border border-outline-variant/40 p-6 rounded-3xl max-w-xl mx-auto hard-shadow animate-in slide-in-from-top-4 duration-300">
              <div className="text-center mb-5">
                <h3 className="font-serif text-base font-bold text-primary flex items-center justify-center gap-1.5">
                  <User className="text-primary" size={16} />
                  Ingresar Nueva Ficha de Clienta
                </h3>
                <p className="text-[11px] text-on-surface-variant/70 mt-1">Crea un registro de perfil clínico-comercial para seguimiento avanzado</p>
              </div>

              <div className="wavy-divider opacity-40 mb-6"></div>

              {formError && (
                <div className="mb-4 bg-terracotta/10 border border-terracotta/20 text-terracotta p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertTriangle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleAddSubmit} className="space-y-4">
                
                {/* Photo Upload & Avatar Selection */}
                <div className="bg-surface-container-low/70 border border-outline-variant/30 rounded-2xl p-4 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant flex items-center gap-1.5">
                      <Camera size={13} className="text-primary" /> Retrato de la Clienta
                    </label>
                    {customPhoto ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                        <Sparkles size={11} /> Foto real seleccionada
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-on-surface-variant/60">
                        Retrato ilustrado (placeholder)
                      </span>
                    )}
                  </div>

                  {/* Hidden native file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="client-real-photo-upload"
                  />

                  {/* Preview and Upload Controls */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    {/* Circular Portrait with overlay */}
                    <div className="relative group shrink-0">
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDragOverPhoto(true);
                        }}
                        onDragLeave={() => setIsDragOverPhoto(false)}
                        onDrop={handleDropPhoto}
                        className={`w-24 h-24 sm:w-26 sm:h-26 rounded-full p-1 bg-white border-2 cursor-pointer transition-all shadow-sm overflow-hidden flex items-center justify-center relative ${
                          isDragOverPhoto
                            ? 'border-primary ring-4 ring-primary/20 scale-105'
                            : customPhoto
                            ? 'border-primary'
                            : 'border-outline-variant/50 hover:border-primary'
                        }`}
                        title="Haz clic o arrastra una imagen para subirla"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            fileInputRef.current?.click();
                          }
                        }}
                      >
                        <img
                          src={customPhoto || PHOTO_PRESETS[avatarIndex]}
                          alt="Vista previa de clienta"
                          className="w-full h-full object-cover rounded-full transition-transform duration-300 group-hover:scale-105"
                        />

                        {/* Interactive overlay on hover/tap */}
                        <div className="absolute inset-0 rounded-full bg-black/45 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200">
                          <Camera size={20} />
                          <span className="text-[9px] font-bold mt-0.5">{customPhoto ? 'Cambiar' : 'Subir'}</span>
                        </div>

                        {/* Processing Spinner Overlay */}
                        {isCompressingPhoto && (
                          <div className="absolute inset-0 rounded-full bg-black/70 flex flex-col items-center justify-center text-white text-[10px] font-bold">
                            <span className="animate-spin text-base mb-0.5">◌</span>
                            Procesando...
                          </div>
                        )}
                      </div>

                      {/* Floating camera action button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center shadow-md border-2 border-white hover:scale-110 transition-transform cursor-pointer"
                        title="Subir foto desde tu dispositivo"
                        aria-label="Subir foto desde dispositivo"
                      >
                        <Camera size={13} />
                      </button>
                    </div>

                    {/* Explanatory text & actions */}
                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <div>
                        <p className="text-xs font-bold text-on-surface">
                          {customPhoto ? 'Foto real de la clienta lista' : 'Foto real o retrato ilustrado'}
                        </p>
                        <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
                          {customPhoto
                            ? 'La imagen se ha adaptado al formato circular y se mostrará en su ficha y citas.'
                            : 'Puedes subir una foto real desde tu dispositivo o seleccionar un retrato ilustrado de referencia como placeholder.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isCompressingPhoto}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-xs cursor-pointer disabled:opacity-60"
                        >
                          <Upload size={13} />
                          {customPhoto ? 'Cambiar foto real' : 'Subir foto real'}
                        </button>

                        {customPhoto && (
                          <button
                            type="button"
                            onClick={() => setCustomPhoto(null)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-outline-variant/40 bg-surface-container-lowest text-on-surface text-xs font-semibold hover:bg-terracotta/10 hover:border-terracotta/40 hover:text-terracotta transition-all cursor-pointer"
                            title="Volver a utilizar el retrato ilustrado"
                          >
                            <RotateCcw size={12} />
                            Usar placeholder
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Preset Carousel for Placeholder Selection */}
                  <div className="pt-2 border-t border-outline-variant/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase tracking-widest font-bold text-on-surface-variant/70">
                        {customPhoto ? 'O seleccionar un retrato ilustrado de reemplazo:' : 'Elegir retrato ilustrado placeholder:'}
                      </span>
                      {customPhoto && (
                        <span className="text-[10px] text-on-surface-variant/50 italic">
                          (Sustituirá la foto subida)
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none px-0.5">
                      {PHOTO_PRESETS.map((photo, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setAvatarIndex(index);
                            if (customPhoto) setCustomPhoto(null);
                          }}
                          className={`w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 transition-all p-0.5 cursor-pointer ${
                            !customPhoto && avatarIndex === index
                              ? 'border-primary ring-2 ring-primary/20 scale-105 opacity-100'
                              : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                          }`}
                          title={`Retrato ilustrado ${index + 1}`}
                        >
                          <img src={photo} alt={`preset-${index}`} className="w-full h-full object-cover rounded-full" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    placeholder="Ej. Valeria Castillo"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-surface-container-low text-base sm:text-xs min-h-[44px] py-2.5 px-4 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold text-on-surface"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Teléfono Móvil (Celular)</label>
                    <input
                      type="tel"
                      placeholder="+52 55 ..."
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full bg-surface-container-low text-base sm:text-xs min-h-[44px] py-2.5 px-4 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold text-on-surface"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="valeria@example.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full bg-surface-container-low text-base sm:text-xs min-h-[44px] py-2.5 px-4 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold text-on-surface"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1">Anotaciones de Estilo (Privado)</label>
                  <textarea
                    placeholder="Escribe alergias, preferencias de esmalte, sensibilidad o notas del lecho ungueal..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-surface-container-low text-base sm:text-xs p-3.5 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold text-on-surface"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setCustomPhoto(null);
                      setFormError('');
                    }}
                    className="flex-1 bg-surface-container-high text-on-surface text-xs font-bold py-3 rounded-xl transition-all min-h-[44px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white text-xs font-bold py-3 rounded-xl transition-all min-h-[44px] editorial-shadow cursor-pointer"
                  >
                    Registrar Ficha
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* PORTRAIT CARDS MASTER LIST */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 @container">
            {filteredClients.slice(0, visibleLimit).map((c) => {
              // Calculate visits count
              const clientAppts = appointments.filter(a => a.clientId === c.id);
              const totalVisits = clientAppts.filter(a => a.status === 'completed').length;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id)}
                  className="group relative bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 hard-shadow flex flex-col justify-between items-stretch cursor-pointer hover:border-primary/50 hover:scale-[1.01] transition-all duration-300"
                >
                  {/* Discreet delete button in top right corner */}
                  {onDeleteClient && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClientToDelete(c);
                      }}
                      className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-on-surface-variant/30 hover:text-terracotta hover:bg-terracotta/10 transition-all opacity-60 group-hover:opacity-100 z-10 cursor-pointer"
                      title={`Eliminar a ${c.name}`}
                      aria-label={`Eliminar a ${c.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  <div className="flex gap-4 items-center pr-6">
                    <img
                      src={c.photoUrl}
                      alt={c.name}
                      className="w-14 h-14 rounded-full object-cover border-2 border-primary/10 shrink-0"
                    />
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <h4 className="font-serif text-sm font-black text-on-surface tracking-wide truncate">{c.name}</h4>
                      <p className="text-[10px] text-on-surface-variant/60 font-bold">{c.phone}</p>
                      
                      {/* Visits badge */}
                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] font-black tracking-wider uppercase text-primary">
                        <Sparkles size={10} />
                        {totalVisits} visitas completadas
                      </span>
                    </div>
                  </div>

                  <div className="wavy-divider opacity-20 my-4"></div>

                  <p className="text-xs text-on-surface-variant/75 italic line-clamp-2 min-h-[34px] font-semibold leading-relaxed">
                    "{c.notes}"
                  </p>
                </div>
              );
            })}

            {filteredClients.length === 0 && (
              <div className="col-span-3 text-center py-16 bg-surface-container/20 border border-dashed border-outline-variant/30 rounded-2xl text-xs text-on-surface-variant/50 font-semibold">
                No se encontraron clientas registradas con el término o segmento seleccionado.
              </div>
            )}
          </div>

          {/* Load More Clients Button */}
          {filteredClients.length > visibleLimit && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setVisibleLimit((prev) => prev + 18)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-surface-container border border-outline-variant/30 text-xs font-bold text-primary hover:bg-primary/5 transition-all shadow-xs"
              >
                <ChevronDown size={14} />
                Mostrar más clientas ({filteredClients.length - visibleLimit} restantes)
              </button>
            </div>
          )}

        </div>
      )}

      {/* Floating Delete Confirmation Notification / Modal */}
      {clientToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setClientToDelete(null)}
        >
          <div
            className="bg-surface-container-lowest border border-outline-variant/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-terracotta/10 text-terracotta flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-base font-black text-on-surface">
                  Eliminar Clienta
                </h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  ¿Estás seguro de que deseas eliminar a <strong className="font-bold text-on-surface">{clientToDelete.name}</strong>?
                </p>
              </div>
            </div>

            <div className="bg-surface-container/40 p-3 rounded-xl border border-outline-variant/15 text-[11px] text-on-surface-variant/80">
              Esta acción eliminará la ficha de la clienta y las tarifas personalizadas asociadas.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="py-2.5 px-4 rounded-xl border border-outline-variant/30 text-xs font-bold text-on-surface hover:bg-surface-container transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteClient && clientToDelete) {
                    const idToDelete = clientToDelete.id;
                    const clientName = clientToDelete.name;
                    onDeleteClient(idToDelete);
                    if (selectedClientId === idToDelete) {
                      setSelectedClientId(null);
                    }
                    setClientToDelete(null);
                    toast.info(`Ficha de "${clientName}" eliminada.`);
                  }
                }}
                className="py-2.5 px-4 rounded-xl bg-terracotta text-white text-xs font-bold hover:bg-terracotta/90 transition-all shadow-xs cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
