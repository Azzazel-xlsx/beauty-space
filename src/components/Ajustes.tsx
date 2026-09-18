import React, { useState, useEffect } from 'react';
import { PriceChangeEvent } from '../types';
import { Settings, ShieldAlert, CheckCircle2, Trash2, ClipboardList, Plus, CreditCard, User, Camera, Lock, KeyRound, Clock, ShieldCheck, Mail, LogOut, Eye, EyeOff } from 'lucide-react';
import { hashPin, generateSalt } from '../utils/crypto';
import { safeSetItem, safeGetItem } from '../utils/storage';
import { formatMoney } from '../utils/formatters';
import { useToast } from './Toast';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

interface AjustesProps {
  priceChanges: PriceChangeEvent[];
  categories: string[];
  paymentMethods: string[];
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  onAddPaymentMethod: (method: string) => void;
  onDeletePaymentMethod: (method: string) => void;
  onResetDatabase?: () => void;
  adminProfile?: { name: string; photoUrl: string };
  onUpdateAdminProfile: (profile: { name: string; photoUrl: string }) => void;
  onRestoreBackup?: (backup: any) => void;
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
  onUpdateAdminProfile
}) => {
  const toast = useToast();
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
      subscription?.unsubscribe();
    };
  }, []);

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
      toast.success('¡Contraseña actualizada en Supabase!');
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
      toast.success('Sesión de Supabase cerrada.');
    } catch (err) {
      console.error(err);
      toast.error('Error al cerrar sesión de Supabase.');
    }
  };

  // Security & PIN State
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [timeoutMinutes, setTimeoutMinutes] = useState<number>(() => {
    const saved = safeGetItem('bs_auth_timeout_mins');
    return saved !== null ? Number(saved) : 15;
  });
  const [timeoutSaved, setTimeoutSaved] = useState(false);

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);
    if (!newPin.trim()) return;
    if (newPin.length < 4) {
      setPinMessage({ text: 'El nuevo PIN debe tener al menos 4 dígitos.', type: 'error' });
      toast.error('El nuevo PIN debe tener al menos 4 dígitos.');
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage({ text: 'La confirmación del PIN no coincide.', type: 'error' });
      toast.error('La confirmación del PIN no coincide.');
      return;
    }

    try {
      let salt = safeGetItem('bs_auth_salt');
      let storedHash = safeGetItem('bs_auth_hash');

      if (!salt || !storedHash) {
        salt = generateSalt();
        storedHash = await hashPin('1234', salt);
        safeSetItem('bs_auth_salt', salt);
        safeSetItem('bs_auth_hash', storedHash);
      }

      const currentHash = await hashPin(currentPin.trim(), salt);
      if (currentHash !== storedHash) {
        setPinMessage({ text: 'El PIN actual ingresado es incorrecto.', type: 'error' });
        toast.error('El PIN actual ingresado es incorrecto.');
        return;
      }

      const newSalt = generateSalt();
      const newHash = await hashPin(newPin.trim(), newSalt);
      safeSetItem('bs_auth_salt', newSalt);
      safeSetItem('bs_auth_hash', newHash);

      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
      setPinMessage({ text: '¡PIN de acceso actualizado con éxito!', type: 'success' });
      toast.success('¡PIN de acceso actualizado con éxito!');
      setTimeout(() => setPinMessage(null), 4000);
    } catch {
      setPinMessage({ text: 'Error procesando el cambio de PIN.', type: 'error' });
      toast.error('Error procesando el cambio de PIN.');
    }
  };

  const handleTimeoutChange = (minutes: number) => {
    setTimeoutMinutes(minutes);
    safeSetItem('bs_auth_timeout_mins', minutes.toString());
    setTimeoutSaved(true);
    toast.success(`Tiempo de bloqueo fijado en ${minutes} min.`);
    setTimeout(() => setTimeoutSaved(false), 2500);
  };

  // Admin Profile States
  const [profileName, setProfileName] = useState(adminProfile?.name || 'Valentina Moretti');
  const [profilePhoto, setProfilePhoto] = useState(adminProfile?.photoUrl || '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  useEffect(() => {
    if (adminProfile?.name) setProfileName(adminProfile.name);
    if (adminProfile?.photoUrl) setProfilePhoto(adminProfile.photoUrl);
  }, [adminProfile?.name, adminProfile?.photoUrl]);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    let targetPhotoRef = profilePhoto.trim();
    if (!targetPhotoRef || targetPhotoRef.startsWith('indexeddb:')) {
      targetPhotoRef = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY-F9jrf6P_SkfHeHl51GzEIYfoydwPR8G2qCfRsheEg3NJPoq6fpSUdN1z4SZ1z8wjvQd9f6WsL9bsSGKXmKBMPhouu5Rr-NfHjOTXpcmEFA7v7oK4qJ-Roi0nmMUvJFNuTCRlijPw1FGIktp03sNiBF9R2uqBTyF6LygFvW5E8tUmF6ErSN6P0Qo7c_300bb-Gaagy8kYv16HiUPE6wnYUE37ExXB09alovCjyl0VcIDmWemT2Pr';
    }

    onUpdateAdminProfile({
      name: profileName.trim(),
      photoUrl: targetPhotoRef
    });
    setProfileSuccess(true);
    toast.success('¡Perfil guardado con éxito!');
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const { error } = await supabase.storage
        .from('salon-media')
        .upload('admin/avatar.webp', file, { upsert: true });

      if (error) {
        console.error('Error al subir foto de admin a Supabase Storage:', error);
        toast.error('Error al subir la foto, intenta de nuevo');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('salon-media')
        .getPublicUrl('admin/avatar.webp');

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      setProfilePhoto(publicUrl);
      onUpdateAdminProfile({
        name: profileName.trim() || adminProfile?.name || 'Valentina Moretti',
        photoUrl: publicUrl
      });
      toast.success('¡Foto de perfil actualizada con éxito!');
    } catch (err) {
      console.error('Error al subir la foto de admin:', err);
      toast.error('Error al subir la foto, intenta de nuevo');
    } finally {
      setUploadingPhoto(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      setCatError('La categoría ya existe.');
      toast.warning('La categoría ya existe.');
      return;
    }
    onAddCategory(trimmed);
    setNewCat('');
    setCatError('');
    toast.success(`Categoría "${trimmed}" agregada.`);
  };

  const handleAddMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethod.trim()) return;
    const normalized = newMethod.trim().toUpperCase();
    if (paymentMethods.includes(normalized)) {
      setMethodError('El método de pago ya existe.');
      toast.warning('El método de pago ya existe.');
      return;
    }
    onAddPaymentMethod(normalized);
    setNewMethod('');
    setMethodError('');
    toast.success(`Método "${normalized}" agregado.`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Encabezado Principal de Sección Ajustes con Tipografía Fluida */}
      <div className="space-y-1">
        <h1 className="font-serif text-[length:var(--text-fluid-h1)] font-bold text-on-surface tracking-tight leading-tight">
          Configuración & Auditoría
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant/75 font-medium">
          Gestión de identidad del estudio, credenciales de acceso y parámetros operativos.
        </p>
      </div>

      {/* Grid Principal: Rebalanceo a 2 Columnas de Altura Similar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start @container">
        
        {/* COLUMNA 1: Perfil de Administradora + Cuenta Supabase Auth */}
        <div className="space-y-6 @container/col1">
          
          {/* Perfil de Administradora */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
            <h2 className="font-serif text-[length:var(--text-fluid-h2)] font-black text-primary flex items-center gap-2">
              <User size={18} /> Perfil de Administradora
            </h2>
            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Configura tu foto de perfil y el nombre que se visualiza en la barra lateral del estudio.
            </p>
            <div className="wavy-divider opacity-30"></div>

            {profileSuccess && (
              <p className="text-[11px] font-semibold text-sage bg-sage/5 p-2 rounded-lg flex items-center gap-1.5 animate-pulse">
                <CheckCircle2 size={13} className="text-sage" /> ¡Perfil guardado con éxito!
              </p>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="flex flex-col @sm:flex-row items-center gap-4 bg-surface-container/20 p-4 rounded-2xl border border-outline-variant/10 text-center @sm:text-left">
                <div className="relative group cursor-pointer shrink-0">
                  <img
                    src={(profilePhoto && !profilePhoto.startsWith('indexeddb:')) ? profilePhoto : "https://lh3.googleusercontent.com/aida-public/AB6AXuBY-F9jrf6P_SkfHeHl51GzEIYfoydwPR8G2qCfRsheEg3NJPoq6fpSUdN1z4SZ1z8wjvQd9f6WsL9bsSGKXmKBMPhouu5Rr-NfHjOTXpcmEFA7v7oK4qJ-Roi0nmMUvJFNuTCRlijPw1FGIktp03sNiBF9R2uqBTyF6LygFvW5E8tUmF6ErSN6P0Qo7c_300bb-Gaagy8kYv16HiUPE6wnYUE37ExXB09alovCjyl0VcIDmWemT2Pr"}
                    alt="Perfil Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/30 group-hover:opacity-85 transition-opacity"
                  />
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white text-[10px] font-bold">
                      <span className="animate-spin text-sm mb-0.5">◌</span>
                      Subiendo...
                    </div>
                  )}
                  <label htmlFor="photo-file-upload" className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full hover:bg-primary/95 transition-all shadow-md cursor-pointer flex items-center justify-center min-w-[28px] min-h-[28px]">
                    <Camera size={12} />
                  </label>
                  <input
                    id="photo-file-upload"
                    type="file"
                    accept="image/*"
                    disabled={uploadingPhoto}
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-primary">Sube tu foto</p>
                  <p className="text-[9px] text-on-surface-variant/60">Haz clic en la cámara para subir imagen</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Nombre de Administradora</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Valentina Moretti..."
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-surface-container-low text-base sm:text-xs py-2.5 px-3.5 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold min-h-[44px]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">O enlace de foto (URL)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={profilePhoto.startsWith('indexeddb:') ? '' : profilePhoto}
                    onChange={(e) => {
                      setProfilePhoto(e.target.value);
                    }}
                    className="w-full bg-surface-container-low text-base sm:text-xs py-2.5 px-3.5 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold min-h-[44px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 hover:shadow-md transition-all flex items-center justify-center gap-2 min-h-[44px] cursor-pointer"
              >
                Guardar Cambios de Perfil
              </button>
            </form>
          </div>

          {/* Cuenta de Administradora (Supabase Auth) */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-[length:var(--text-fluid-h2)] font-black text-primary flex items-center gap-2">
                <ShieldCheck size={18} /> Cuenta de Administradora
              </h2>
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary/80 bg-primary/10 px-2.5 py-0.5 rounded-full">
                Supabase Auth
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Gestión de credenciales maestras y autenticación en la nube para acceso centralizado.
            </p>
            <div className="wavy-divider opacity-30"></div>

            {authLoading ? (
              <div className="py-6 text-center text-xs text-on-surface-variant/60 font-medium">
                Verificando estado de cuenta en Supabase...
              </div>
            ) : authUser ? (
              <div className="space-y-4">
                {/* Email de la cuenta autenticada */}
                <div className="bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Mail size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant block">
                        Correo Autenticado
                      </span>
                      <p className="text-xs sm:text-sm font-bold text-on-surface truncate">
                        {authUser.email || 'Email no disponible'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-sage bg-sage/10 border border-sage/20 px-2.5 py-0.5 rounded-full shrink-0">
                    Sesión Activa
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

                {/* Formulario para cambiar contraseña con Container Query */}
                <form onSubmit={handleChangePassword} className="space-y-3">
                  <div className="grid grid-cols-1 @md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant flex items-center gap-1">
                        <KeyRound size={11} /> Nueva Contraseña
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          placeholder="Mínimo 6 caracteres"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-surface-container-low text-base sm:text-xs py-2.5 px-3.5 pr-11 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-sans font-medium min-h-[44px]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant/60 hover:text-primary rounded-lg transition-colors cursor-pointer"
                          title={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                          aria-label={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                        Confirmar Nueva Contraseña
                      </label>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="Repite la nueva contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-surface-container-low text-base sm:text-xs py-2.5 px-3.5 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-sans font-medium min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col @sm:flex-row gap-2 pt-1">
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
              /* Estado cuando aún no hay sesión de Supabase */
              <div className="space-y-3.5">
                <div className="bg-surface-container/40 p-4 rounded-2xl border border-outline-variant/20 space-y-2">
                  <div className="flex items-center gap-2 text-primary font-serif font-black text-xs">
                    <User size={15} />
                    <span>Cuenta no configurada aún</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant/75 leading-relaxed">
                    Actualmente el acceso se gestiona a través del inicio de sesión de Supabase Auth (email y contraseña). Inicia sesión para sincronizar datos en tiempo real.
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-on-surface-variant/70 px-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    Acceso activo mediante Supabase Auth
                  </span>
                  <span className="uppercase tracking-wider font-bold text-primary/70">
                    Fase 4
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* COLUMNA 2: Seguridad y Control de Acceso + Auditoría Completa de Precios */}
        <div className="space-y-6 @container/col2">

          {/* Seguridad y Control de Acceso (PIN local + Inactividad) */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-[length:var(--text-fluid-h2)] font-black text-primary flex items-center gap-2">
                <Lock size={18} /> Seguridad y Control de Acceso
              </h2>
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
                SHA-256 + Salt
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Configura el PIN de desbloqueo rápido y el tiempo de bloqueo automático por inactividad.
            </p>
            <div className="wavy-divider opacity-30"></div>

            {pinMessage && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 font-medium ${
                  pinMessage.type === 'success'
                    ? 'bg-sage/10 text-sage border border-sage/20'
                    : 'bg-terracotta/10 text-terracotta border border-terracotta/20'
                }`}
              >
                {pinMessage.type === 'success' ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}
                {pinMessage.text}
              </div>
            )}

            {/* Change PIN Form */}
            <form onSubmit={handleChangePin} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant flex items-center gap-1">
                  <KeyRound size={11} /> PIN Actual
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  required
                  placeholder="PIN actual (ej. 1234)"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value)}
                  className="w-full bg-surface-container-low text-base sm:text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-semibold min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 @sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Nuevo PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    required
                    placeholder="Nuevo PIN"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    className="w-full bg-surface-container-low text-base sm:text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-semibold min-h-[44px]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">Confirmar PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={8}
                    required
                    placeholder="Repite el PIN"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    className="w-full bg-surface-container-low text-base sm:text-xs py-2.5 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-semibold min-h-[44px]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary/90 text-white rounded-xl text-xs font-bold hover:bg-primary transition-all flex items-center justify-center gap-1.5 min-h-[44px] cursor-pointer"
              >
                Actualizar PIN de Seguridad
              </button>
            </form>

            {/* Inactivity Timeout configuration */}
            <div className="pt-3 border-t border-outline-variant/20 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant flex items-center gap-1.5">
                  <Clock size={12} /> Bloqueo por Inactividad
                </label>
                {timeoutSaved && (
                  <span className="text-[9px] text-sage font-bold flex items-center gap-1">
                    <CheckCircle2 size={11} /> Guardado
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 @sm:grid-cols-4 gap-1.5">
                {[5, 15, 30, 0].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleTimeoutChange(mins)}
                    className={`py-2 px-2 rounded-lg text-xs font-semibold border transition-all min-h-[44px] flex items-center justify-center cursor-pointer ${
                      timeoutMinutes === mins
                        ? 'bg-primary text-white border-primary shadow-xs'
                        : 'bg-surface-container-low text-on-surface-variant border-outline-variant/20 hover:border-primary/40'
                    }`}
                  >
                    {mins === 0 ? 'Desactivado' : `${mins} min`}
                  </button>
                ))}
              </div>
            </div>

            {/* Architecture note */}
            <div className="bg-surface-container/30 p-2.5 rounded-xl border border-outline-variant/15 flex items-start gap-2 text-[10px] text-on-surface-variant/75">
              <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
              <p className="leading-normal">
                <strong>Mitigación Transitoria (OWASP A01):</strong> Esta barrera protege contra acceso físico no autorizado en terminal. La arquitectura definitiva opera en conjunto con Supabase Auth.
              </p>
            </div>
          </div>

          {/* PRICE CHANGE AUDIT TIMELINE */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
            <div className="flex flex-col @sm:flex-row @sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-serif text-[length:var(--text-fluid-h2)] font-black text-primary flex items-center gap-1.5">
                  <Settings size={18} /> Auditoría Completa de Precios
                </h2>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold mt-0.5">Historial completo de modificaciones de tarifas</p>
              </div>
              <span className="text-[9px] font-black bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full uppercase self-start @sm:self-auto">
                {priceChanges.length} Cambios
              </span>
            </div>

            <div className="wavy-divider opacity-40"></div>

            {/* List of price audit modifications */}
            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {priceChanges.length === 0 ? (
                <div className="py-14 text-center text-xs text-on-surface-variant/50 font-semibold border border-dashed border-outline-variant/25 rounded-2xl px-4">
                  No se registran cambios de tarifas o auditoría de precios en esta sesión. Todo se mantiene en valores estándar.
                </div>
              ) : (
                <div className="relative border-l-2 border-outline-variant/40 ml-2.5 pl-4 space-y-5 py-1">
                  {priceChanges.map((event) => (
                    <div key={event.id} className="relative space-y-1.5 text-xs">
                      {/* Node dot */}
                      <span className="absolute -left-[24.5px] top-1.5 w-3 h-3 rounded-full border-2 border-primary bg-white"></span>
                      
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-on-surface">{event.name}</h4>
                          <p className="text-[10px] text-on-surface-variant/50 font-semibold">{event.date} • Resp: {event.user}</p>
                        </div>
                        <div className="text-right flex items-baseline gap-1.5">
                          <span className="text-[10px] text-on-surface-variant/50 font-medium line-through">{formatMoney(event.oldPrice)}</span>
                          <span className="font-mono text-primary font-black text-sm">{formatMoney(event.newPrice)}</span>
                        </div>
                      </div>

                      <div className="bg-surface-container/45 px-3 py-2 rounded-xl border border-outline-variant/10">
                        <p className="text-[11px] text-on-surface-variant/85 italic">
                          "{event.reason || 'Actualización periódica por costos/inflación.'}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* PANEL INFERIOR: Catálogos del Estudio (Categorías de Egresos y Métodos de Pago) */}
      <div className="space-y-4 pt-2">
        <div className="space-y-1">
          <h2 className="font-serif text-[length:var(--text-fluid-h2)] font-bold text-on-surface flex items-center gap-2">
            <ClipboardList size={20} className="text-primary" /> Catálogos y Operación del Estudio
          </h2>
          <p className="text-xs text-on-surface-variant/75 font-medium">
            Administra las clasificaciones de egresos y modalidades de cobro habilitadas en tu flujo diario.
          </p>
        </div>

        <div className="@container/catalogs">
          <div className="grid grid-cols-1 @md:grid-cols-2 gap-6">
            
            {/* Expense Categories */}
            <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
              <h3 className="font-serif text-[length:var(--text-fluid-h3)] font-black text-primary flex items-center gap-2">
                <ClipboardList size={16} /> Categorías de Egresos
              </h3>
              <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
                Administra las clasificaciones para tus reportes de gastos.
              </p>
              <div className="wavy-divider opacity-30"></div>

              {catError && (
                <p className="text-[11px] font-semibold text-terracotta bg-terracotta/5 p-2 rounded-lg">{catError}</p>
              )}

              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nueva categoría..."
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  className="flex-1 bg-surface-container-low text-base sm:text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold min-h-[44px]"
                />
                <button
                  type="submit"
                  className="px-3.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer"
                  title="Agregar categoría"
                  aria-label="Agregar categoría"
                >
                  <Plus size={16} />
                </button>
              </form>

              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <div key={cat} className="flex items-center justify-between py-2 px-3 bg-surface-container/30 border border-outline-variant/10 rounded-xl text-xs font-semibold">
                    <span className="text-on-surface-variant truncate pr-2">{cat}</span>
                    <button
                      onClick={() => {
                        onDeleteCategory(cat);
                        toast.info(`Categoría "${cat}" eliminada.`);
                      }}
                      className="text-on-surface-variant/40 hover:text-terracotta min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-terracotta/10 rounded-full transition-all cursor-pointer shrink-0"
                      title={`Eliminar categoría ${cat}`}
                      aria-label={`Eliminar categoría ${cat}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
              <h3 className="font-serif text-[length:var(--text-fluid-h3)] font-black text-primary flex items-center gap-2">
                <CreditCard size={16} /> Métodos de Pago
              </h3>
              <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
                Define las modalidades de cobro habilitadas en tu flujo diario.
              </p>
              <div className="wavy-divider opacity-30"></div>

              {methodError && (
                <p className="text-[11px] font-semibold text-terracotta bg-terracotta/5 p-2 rounded-lg">{methodError}</p>
              )}

              <form onSubmit={handleAddMethod} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej. MercadoPago..."
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  className="flex-1 bg-surface-container-low text-base sm:text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold uppercase placeholder:normal-case min-h-[44px]"
                />
                <button
                  type="submit"
                  className="px-3.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer"
                  title="Agregar método de pago"
                  aria-label="Agregar método de pago"
                >
                  <Plus size={16} />
                </button>
              </form>

              <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                {paymentMethods.map((method) => (
                  <div key={method} className="flex items-center justify-between py-2 px-3 bg-surface-container/30 border border-outline-variant/10 rounded-xl text-xs font-bold uppercase tracking-wider text-on-surface">
                    <span className="truncate pr-2">{method}</span>
                    <button
                      onClick={() => {
                        onDeletePaymentMethod(method);
                        toast.info(`Método "${method}" eliminado.`);
                      }}
                      className="text-on-surface-variant/40 hover:text-terracotta min-w-[44px] min-h-[44px] flex items-center justify-center hover:bg-terracotta/10 rounded-full transition-all cursor-pointer shrink-0"
                      title={`Eliminar método ${method}`}
                      aria-label={`Eliminar método ${method}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
};
