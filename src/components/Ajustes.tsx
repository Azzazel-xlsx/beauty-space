import React, { useState, useEffect, useRef } from 'react';
import { PriceChangeEvent } from '../types';
import {
  Settings,
  ShieldAlert,
  CheckCircle2,
  Trash2,
  ClipboardList,
  Plus,
  CreditCard,
  User,
  Camera,
  Lock,
  Mail,
  LogOut,
  Eye,
  EyeOff,
  RefreshCw,
  BellRing,
  BellOff,
  Smartphone
} from 'lucide-react';
import { formatMoney } from '../utils/formatters';
import { useToast } from './Toast';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { ImageCropModal } from './ui/ImageCropModal';
import { usePushSubscription } from '../hooks/usePushSubscription';

interface AjustesProps {
  priceChanges: PriceChangeEvent[];
  categories: string[];
  paymentMethods: string[];
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  onAddPaymentMethod: (method: string) => void;
  onDeletePaymentMethod: (method: string) => void;
  adminProfile?: { name: string; photoUrl: string };
  onUpdateAdminProfile: (profile: { name: string; photoUrl: string }) => void;
  onReloadData?: () => void;
}

export const Ajustes: React.FC<AjustesProps> = ({
  priceChanges,
  categories,
  paymentMethods,
  onAddCategory,
  onDeleteCategory,
  onAddPaymentMethod,
  onDeletePaymentMethod,
  adminProfile,
  onUpdateAdminProfile,
  onReloadData,
}) => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newCat, setNewCat] = useState('');
  const [newMethod, setNewMethod] = useState('');
  const [catError, setCatError] = useState('');
  const [methodError, setMethodError] = useState('');

  // Supabase Auth State
  const [authUser, setAuthUser] = useState<{ id: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Admin Profile States
  const [profileName, setProfileName] = useState(adminProfile?.name || 'Valentina Moretti');
  const [profilePhoto, setProfilePhoto] = useState(adminProfile?.photoUrl || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);

  // Web Push Subscription Hook
  const [testingPush, setTestingPush] = useState(false);
  const {
    isSupported: isPushSupported,
    permission: pushPermission,
    isSubscribed: isPushSubscribed,
    loading: pushLoading,
    error: pushError,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    sendTestNotification
  } = usePushSubscription();

  const handleTogglePush = async () => {
    if (isPushSubscribed) {
      const ok = await unsubscribePush();
      if (ok) toast.success('Notificaciones desactivadas en este dispositivo.');
    } else {
      const ok = await subscribePush();
      if (ok) toast.success('¡Notificaciones push activadas correctamente!');
    }
  };

  const handleSendTestPush = async () => {
    setTestingPush(true);
    try {
      const res = await sendTestNotification();
      toast.success(
        res.via === 'edge-function'
          ? '¡Notificación enviada desde la nube de Supabase!'
          : '¡Notificación enviada al dispositivo!'
      );
    } catch (err: any) {
      toast.error(`Error enviando notificación: ${err?.message || 'Fallo desconocido'}`);
    } finally {
      setTestingPush(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pendingImageSrc) {
        URL.revokeObjectURL(pendingImageSrc);
      }
    };
  }, [pendingImageSrc]);

  useEffect(() => {
    let isMounted = true;
    const checkUser = async () => {
      try {
        if (!isSupabaseConfigured()) {
          if (isMounted) {
            setAuthUser(null);
            setAuthLoading(false);
          }
          return;
        }
        const { data, error } = await supabase.auth.getUser();
        if (isMounted) {
          if (error || !data?.user) {
            setAuthUser(null);
          } else {
            setAuthUser(data.user);
          }
          setAuthLoading(false);
        }
      } catch {
        if (isMounted) {
          setAuthUser(null);
          setAuthLoading(false);
        }
      }
    };

    checkUser();

    let subscription: { unsubscribe: () => void } | null = null;
    try {
      if (isSupabaseConfigured()) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (isMounted) {
            setAuthUser(session?.user ?? null);
          }
        });
        subscription = data.subscription;
      }
    } catch {
      // Supabase no inicializado aún
    }

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (adminProfile?.name) setProfileName(adminProfile.name);
    if (adminProfile?.photoUrl) setProfilePhoto(adminProfile.photoUrl);
  }, [adminProfile?.name, adminProfile?.photoUrl]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (!newPassword.trim()) {
      setPasswordMessage({ text: 'Ingresa una nueva contraseña.', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ text: 'La contraseña debe tener al menos 6 caracteres.', type: 'error' });
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ text: 'Las contraseñas no coinciden.', type: 'error' });
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage({ text: '¡Contraseña actualizada con éxito!', type: 'success' });
      toast.success('¡Contraseña actualizada!');
      setTimeout(() => setPasswordMessage(null), 4000);
    } catch (err: any) {
      const msg = err?.message || 'Error al actualizar contraseña.';
      setPasswordMessage({ text: msg, type: 'error' });
      toast.error(msg);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setAuthUser(null);
      toast.success('Sesión cerrada.');
    } catch (err) {
      console.error(err);
      toast.error('Error al cerrar sesión.');
    }
  };

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    onUpdateAdminProfile({
      name: profileName.trim(),
      photoUrl: profilePhoto.trim()
    });

    setProfileSuccess(true);
    toast.success('Perfil de administradora actualizado');
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPendingImageSrc(objectUrl);
    setCropModalOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCroppedUpload = async (blob: Blob) => {
    try {
      setUploadingPhoto(true);

      const { error } = await supabase.storage
        .from('salon-media')
        .upload('admin/avatar.webp', blob, { upsert: true, contentType: 'image/webp' });

      if (error) {
        console.error('Error subiendo foto de administradora a Storage:', error);
        toast.error('Error al subir la foto. Intenta de nuevo.');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('salon-media')
        .getPublicUrl('admin/avatar.webp');

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setProfilePhoto(publicUrl);
      onUpdateAdminProfile({
        name: profileName.trim(),
        photoUrl: publicUrl
      });
      toast.success('¡Foto de perfil actualizada!');
    } catch (err) {
      console.error('Error al actualizar foto de perfil:', err);
      toast.error('Error al actualizar la foto de perfil.');
    } finally {
      setUploadingPhoto(false);
      if (pendingImageSrc) {
        URL.revokeObjectURL(pendingImageSrc);
        setPendingImageSrc(null);
      }
      setCropModalOpen(false);
    }
  };

  const handleCancelCrop = () => {
    if (pendingImageSrc) {
      URL.revokeObjectURL(pendingImageSrc);
      setPendingImageSrc(null);
    }
    setCropModalOpen(false);
  };

  // Categories & Payment Methods Handlers
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setCatError('');
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      setCatError('Esta categoría ya existe en el catálogo.');
      toast.error('Esta categoría ya existe en el catálogo.');
      return;
    }
    onAddCategory(trimmed);
    setNewCat('');
    toast.success('Categoría agregada exitosamente');
  };

  const handleCreatePaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    setMethodError('');
    const trimmed = newMethod.trim();
    if (!trimmed) return;
    if (paymentMethods.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      setMethodError('Este método de pago ya está registrado.');
      toast.error('Este método de pago ya está registrado.');
      return;
    }
    onAddPaymentMethod(trimmed);
    setNewMethod('');
    toast.success('Método de pago registrado exitosamente');
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto pb-14">
      {/* Header */}
      <div className="border-b border-outline-variant/30 pb-4">
        <h1 className="font-serif text-[length:var(--text-fluid-h1)] font-black text-primary flex items-center gap-2">
          <Settings size={24} /> Ajustes & Configuración del Estudio
        </h1>
        <p className="text-xs text-on-surface-variant font-medium mt-1">
          Gestión de identidad, credenciales de acceso a la nube, sincronización en tiempo real y catálogos.
        </p>
      </div>

      {/* Grid Principal: 2 Columnas Balanceadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* COLUMNA 1: Perfil, Autenticación y Sesión */}
        <div className="space-y-6">

          {/* TARJETA 1: Perfil de Administradora */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-[length:var(--text-fluid-h2)] font-black text-primary flex items-center gap-2">
                <User size={18} /> Perfil de Administradora
              </h2>
            </div>
            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Personaliza tu nombre e imagen de cabecera para tu perfil y cuenta.
            </p>
            <div className="wavy-divider opacity-30"></div>

            {profileSuccess && (
              <div className="p-2.5 rounded-xl text-xs flex items-center gap-2 font-medium bg-sage/10 text-sage border border-sage/20 animate-fadeIn">
                <CheckCircle2 size={14} /> Perfil actualizado con éxito
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-primary/20 bg-surface-container flex items-center justify-center shadow-xs">
                    {profilePhoto && profilePhoto.trim() !== '' ? (
                      <img
                        src={profilePhoto}
                        alt={profileName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="font-serif font-black text-xl text-primary/40">
                        {profileName.charAt(0) || 'A'}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer disabled:opacity-50"
                  >
                    <Camera size={18} className="mb-0.5" />
                    {uploadingPhoto ? 'Subiendo...' : 'Cambiar'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex-1 w-full space-y-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                      Nombre Profesional
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="Ej. Valentina Moretti"
                      className="w-full bg-surface-container-low text-base sm:text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-medium min-h-[44px]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Camera size={12} /> {uploadingPhoto ? 'Subiendo imagen...' : 'Subir nueva foto de perfil'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
              >
                Guardar Perfil
              </button>
            </form>
          </div>

          {/* TARJETA 2: Autenticación en la Nube */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-[length:var(--text-fluid-h2)] font-black text-primary flex items-center gap-2">
                <Lock size={18} /> Cuenta de Acceso
              </h2>
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Nube Activa
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Tu cuenta de administradora sincroniza citas, clientas y finanzas en tiempo real en todos tus dispositivos.
            </p>
            <div className="wavy-divider opacity-30"></div>

            {authLoading ? (
              <div className="py-6 text-center text-xs text-on-surface-variant/60 flex items-center justify-center gap-2">
                <RefreshCw size={14} className="animate-spin text-primary" />
                <span>Verificando sesión...</span>
              </div>
            ) : authUser ? (
              <div className="space-y-4">
                <div className="bg-surface-container/35 p-3.5 rounded-2xl border border-outline-variant/15 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                      <Mail size={14} />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant/60">
                        Sesión Activa
                      </p>
                      <p className="text-xs font-bold text-on-surface font-mono">
                        {authUser.email || 'Administradora'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-sage bg-sage/10 border border-sage/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 size={10} /> Conectado
                  </span>
                </div>

                {passwordMessage && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-center gap-2 font-medium ${
                      passwordMessage.type === 'success'
                        ? 'bg-sage/10 text-sage border border-sage/20'
                        : 'bg-terracotta/10 text-terracotta border border-terracotta/20'
                    }`}
                  >
                    {passwordMessage.type === 'success' ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
                    {passwordMessage.text}
                  </div>
                )}

                {/* Change Password Form */}
                <form onSubmit={handleChangePassword} className="space-y-3 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                        Nueva Contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          placeholder="Mínimo 6 carácteres"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-surface-container-low text-base sm:text-xs py-2.5 px-3.5 pr-11 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-sans font-medium min-h-[44px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant/60 hover:text-primary rounded-lg transition-colors cursor-pointer"
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                        Confirmar Contraseña
                      </label>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Repite la contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-surface-container-low text-base sm:text-xs py-2.5 px-3.5 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-sans font-medium min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={updatingPassword}
                      className="flex-1 py-2.5 px-4 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer disabled:opacity-50"
                    >
                      <Lock size={13} />
                      {updatingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </button>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="py-2.5 px-4 bg-surface-container-high text-on-surface-variant hover:text-terracotta hover:bg-terracotta/10 border border-outline-variant/25 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
                    >
                      <LogOut size={13} />
                      Cerrar Sesión
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-surface-container/40 p-4 rounded-2xl border border-outline-variant/20 space-y-2">
                <div className="flex items-center gap-2 text-primary font-serif font-black text-xs">
                  <User size={15} />
                  <span>Sin sesión activa en este momento</span>
                </div>
                <p className="text-[11px] text-on-surface-variant/75 leading-relaxed">
                  Inicia sesión con tu correo y contraseña para mantener tus datos sincronizados en la nube.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* COLUMNA 2: Notificaciones Push y Auditoría de Tarifas */}
        <div className="space-y-6">

          {/* TARJETA: Notificaciones Push en Segundo Plano */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-[length:var(--text-fluid-h2)] font-black text-primary flex items-center gap-2">
                <BellRing size={18} /> Notificaciones Push
              </h2>
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                  isPushSubscribed
                    ? 'text-sage bg-sage/10 border border-sage/20'
                    : 'text-on-surface-variant/70 bg-surface-container'
                }`}
              >
                {isPushSubscribed ? <CheckCircle2 size={10} /> : <BellOff size={10} />}
                {isPushSubscribed ? 'Activas' : 'Inactivas'}
              </span>
            </div>

            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Recibe avisos Web Push en segundo plano para citas próximas (1h antes) y cambios de agenda aunque la aplicación esté cerrada.
            </p>

            <div className="wavy-divider opacity-30"></div>

            {/* Switch Toggle */}
            <div className="bg-surface-container/35 p-4 rounded-2xl border border-outline-variant/15 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                    isPushSubscribed ? 'bg-primary/10 text-primary' : 'bg-surface-container-high text-on-surface-variant/60'
                  }`}
                >
                  <Smartphone size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">
                    Activar notificaciones en este dispositivo
                  </p>
                  <p className="text-[10px] text-on-surface-variant/65">
                    {!isPushSupported
                      ? 'Navegador sin soporte de Web Push API'
                      : pushPermission === 'denied'
                      ? 'Permiso bloqueado en los ajustes del navegador'
                      : isPushSubscribed
                      ? 'Dispositivo vinculado y suscrito con éxito'
                      : 'Presiona el interruptor para recibir recordatorios'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={isPushSubscribed}
                disabled={!isPushSupported || pushLoading || pushPermission === 'denied'}
                onClick={handleTogglePush}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                  isPushSubscribed ? 'bg-primary' : 'bg-surface-container-highest'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                    isPushSubscribed ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {pushError && (
              <div className="bg-terracotta/10 border border-terracotta/20 text-terracotta p-3 rounded-xl text-xs flex items-center gap-2">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{pushError}</span>
              </div>
            )}

            {/* Características */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-surface-container-low/50 p-2.5 rounded-xl border border-outline-variant/15 flex items-start gap-2">
                <span className="text-primary font-bold text-sm shrink-0">⏰</span>
                <div>
                  <strong className="block text-[11px] font-bold text-on-surface">Citas próximas (1 hora antes)</strong>
                  <span className="text-[10px] text-on-surface-variant/70 leading-tight block">
                    Aviso automático para preparar cabina y materiales.
                  </span>
                </div>
              </div>

              <div className="bg-surface-container-low/50 p-2.5 rounded-xl border border-outline-variant/15 flex items-start gap-2">
                <span className="text-primary font-bold text-sm shrink-0">📅</span>
                <div>
                  <strong className="block text-[11px] font-bold text-on-surface">Reprogramadas / Canceladas</strong>
                  <span className="text-[10px] text-on-surface-variant/70 leading-tight block">
                    Alertas inmediatas si la clienta cancela o cambia de hora.
                  </span>
                </div>
              </div>
            </div>

            {/* Botón de Prueba y Pie Técnico */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-outline-variant/15">
              <button
                type="button"
                onClick={handleSendTestPush}
                disabled={!isPushSubscribed || testingPush}
                className="py-2 px-3.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-[40px]"
              >
                <BellRing size={13} className={testingPush ? 'animate-bounce' : ''} />
                {testingPush ? 'Enviando prueba...' : 'Enviar Notificación de Prueba'}
              </button>

              <div className="text-right">
                <span className="text-[10px] text-on-surface-variant/50 block font-mono">
                  Service Worker: /sw.js • VAPID Web Push
                </span>
              </div>
            </div>
          </div>

          {/* TARJETA: Auditoría Completa de Precios */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-[length:var(--text-fluid-h2)] font-black text-primary flex items-center gap-2">
                  <ClipboardList size={18} /> Auditoría de Precios
                </h2>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold mt-0.5">
                  Historial de cambios de tarifas
                </p>
              </div>
              <span className="text-[9px] font-black bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full uppercase">
                {priceChanges.length} Cambios
              </span>
            </div>

            <div className="wavy-divider opacity-30"></div>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {priceChanges.length === 0 ? (
                <div className="py-10 text-center text-xs text-on-surface-variant/50 font-semibold border border-dashed border-outline-variant/25 rounded-2xl px-4">
                  No se registran cambios de tarifas en el historial. Todas se mantienen en sus valores de catálogo.
                </div>
              ) : (
                <div className="relative border-l-2 border-outline-variant/40 ml-2.5 pl-4 space-y-4 py-1">
                  {priceChanges.map((event) => (
                    <div key={event.id} className="relative space-y-1 text-xs">
                      <span className="absolute -left-[24.5px] top-1.5 w-3 h-3 rounded-full border-2 border-primary bg-white"></span>
                      
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-on-surface">{event.name}</h4>
                          <p className="text-[10px] text-on-surface-variant/50 font-semibold">
                            {event.date} • {event.user}
                          </p>
                        </div>
                        <div className="text-right flex items-baseline gap-1.5">
                          <span className="text-[10px] text-on-surface-variant/50 font-medium line-through">
                            {formatMoney(event.oldPrice)}
                          </span>
                          <span className="font-mono text-primary font-black text-xs">
                            {formatMoney(event.newPrice)}
                          </span>
                        </div>
                      </div>

                      {event.reason && (
                        <div className="bg-surface-container/45 px-2.5 py-1.5 rounded-lg border border-outline-variant/10 text-[11px] text-on-surface-variant/85 italic">
                          "{event.reason}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* PANEL INFERIOR: Catálogos del Estudio (Categorías y Métodos de Pago) */}
      <div className="space-y-6 pt-4 border-t border-outline-variant/25">
        <div className="space-y-1">
          <h2 className="font-serif text-[length:var(--text-fluid-h2)] font-bold text-on-surface flex items-center gap-2">
            <ClipboardList size={18} /> Catálogos del Estudio
          </h2>
          <p className="text-xs text-on-surface-variant">
            Configuración global de opciones para el registro de finanzas y citas sincronizados en la nube.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Categorías de Egresos */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-4 sm:p-6 rounded-3xl hard-shadow space-y-4">
            <h3 className="font-serif text-sm font-bold text-primary flex items-center gap-1.5">
              <CreditCard size={15} /> Categorías de Egresos
            </h3>

            <form onSubmit={handleCreateCategory} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newCat}
                onChange={(e) => {
                  setNewCat(e.target.value);
                  if (catError) setCatError('');
                }}
                placeholder="Nueva categoría..."
                className="w-full sm:flex-1 min-w-0 bg-surface-container-low text-base sm:text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-medium min-h-[44px]"
              />
              <button
                type="submit"
                className="w-full sm:w-auto shrink-0 py-2 px-4 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Plus size={14} /> Agregar
              </button>
            </form>

            {catError && <p className="text-[11px] text-terracotta font-medium">{catError}</p>}

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div
                  key={cat}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container/40 border border-outline-variant/15 text-xs font-medium"
                >
                  <span>{cat}</span>
                  <button
                    type="button"
                    onClick={() => onDeleteCategory(cat)}
                    className="text-on-surface-variant/50 hover:text-terracotta p-1 transition-colors cursor-pointer"
                    title="Eliminar categoría"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Métodos de Pago */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-4 sm:p-6 rounded-3xl hard-shadow space-y-4">
            <h3 className="font-serif text-sm font-bold text-primary flex items-center gap-1.5">
              <CreditCard size={15} /> Métodos de Pago Habilitados
            </h3>

            <form onSubmit={handleCreatePaymentMethod} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newMethod}
                onChange={(e) => {
                  setNewMethod(e.target.value);
                  if (methodError) setMethodError('');
                }}
                placeholder="Nuevo método de pago..."
                className="w-full sm:flex-1 min-w-0 bg-surface-container-low text-base sm:text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-medium min-h-[44px]"
              />
              <button
                type="submit"
                className="w-full sm:w-auto shrink-0 py-2 px-4 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer shadow-xs active:scale-[0.98]"
              >
                <Plus size={14} /> Agregar
              </button>
            </form>

            {methodError && <p className="text-[11px] text-terracotta font-medium">{methodError}</p>}

            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
              {paymentMethods.map((method) => (
                <div
                  key={method}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container/40 border border-outline-variant/15 text-xs font-medium"
                >
                  <span>{method}</span>
                  <button
                    type="button"
                    onClick={() => onDeletePaymentMethod(method)}
                    className="text-on-surface-variant/50 hover:text-terracotta p-1 transition-colors cursor-pointer"
                    title="Eliminar método"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Modal de Recorte y Encuadre de Foto */}
      {cropModalOpen && pendingImageSrc && (
        <ImageCropModal
          imageSrc={pendingImageSrc}
          onConfirm={handleCroppedUpload}
          onCancel={handleCancelCrop}
        />
      )}
    </div>
  );
};
