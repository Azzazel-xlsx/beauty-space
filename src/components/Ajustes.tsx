import React, { useState, useEffect } from 'react';
import { PriceChangeEvent } from '../types';
import { Settings, ShieldAlert, CheckCircle2, Trash2, Calendar, ClipboardList, Sparkles, RefreshCw, Plus, CreditCard, User, Camera, Lock, KeyRound, Clock, ShieldCheck, Download, Upload, Database, HardDrive, FileJson, AlertCircle } from 'lucide-react';
import { hashPin, generateSalt } from '../utils/crypto';
import { downloadBackupFile, validateBackupJson, getStorageMetrics, CompleteBackupData } from '../utils/backup';
import { safeSetItem, safeGetItem } from '../utils/storage';
import { compressImage } from '../utils/imageCompressor';
import { formatMoney } from '../utils/formatters';

interface AjustesProps {
  priceChanges: PriceChangeEvent[];
  categories: string[];
  paymentMethods: string[];
  onAddCategory: (category: string) => void;
  onDeleteCategory: (category: string) => void;
  onAddPaymentMethod: (method: string) => void;
  onDeletePaymentMethod: (method: string) => void;
  onResetDatabase: () => void;
  adminProfile?: { name: string; photoUrl: string };
  onUpdateAdminProfile: (profile: { name: string; photoUrl: string }) => void;
  onRestoreBackup?: (backup: CompleteBackupData) => void;
}

export const Ajustes: React.FC<AjustesProps> = ({
  priceChanges,
  categories,
  paymentMethods,
  onAddCategory,
  onDeleteCategory,
  onAddPaymentMethod,
  onDeletePaymentMethod,
  onResetDatabase,
  adminProfile,
  onUpdateAdminProfile,
  onRestoreBackup
}) => {
  const [newCat, setNewCat] = useState('');
  const [newMethod, setNewMethod] = useState('');
  const [catError, setCatError] = useState('');
  const [methodError, setMethodError] = useState('');

  // Backup & Storage Metrics State
  const [storageMetrics, setStorageMetrics] = useState(() => getStorageMetrics());
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [restoreCandidate, setRestoreCandidate] = useState<CompleteBackupData | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [restoreSuccess, setRestoreSuccess] = useState(false);

  useEffect(() => {
    setStorageMetrics(getStorageMetrics());
  }, [priceChanges, categories, paymentMethods]);

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
      return;
    }
    if (newPin !== confirmPin) {
      setPinMessage({ text: 'La confirmación del PIN no coincide.', type: 'error' });
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
      setTimeout(() => setPinMessage(null), 4000);
    } catch {
      setPinMessage({ text: 'Error procesando el cambio de PIN.', type: 'error' });
    }
  };

  const handleTimeoutChange = (minutes: number) => {
    setTimeoutMinutes(minutes);
    safeSetItem('bs_auth_timeout_mins', minutes.toString());
    setTimeoutSaved(true);
    setTimeout(() => setTimeoutSaved(false), 2500);
  };

  // Backup handlers
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      await downloadBackupFile();
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      alert('Error generando el respaldo de datos.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRestoreError('');
    setRestoreSuccess(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const validation = validateBackupJson(content);
        if (validation.valid && validation.backupData) {
          setRestoreCandidate(validation.backupData);
        } else {
          setRestoreError(validation.error || 'El archivo seleccionado no es un respaldo válido.');
          setRestoreCandidate(null);
        }
      }
    };
    reader.onerror = () => {
      setRestoreError('Error al leer el archivo de respaldo del disco.');
    };
    reader.readAsText(file);
    // Reset file input so user can choose again if needed
    e.target.value = '';
  };

  const handleConfirmRestore = async () => {
    if (!restoreCandidate) return;

    try {
      if (onRestoreBackup) {
        onRestoreBackup(restoreCandidate);
      }
      setRestoreSuccess(true);
      setRestoreCandidate(null);
      setStorageMetrics(getStorageMetrics());
      setTimeout(() => setRestoreSuccess(false), 5000);
    } catch (err: any) {
      setRestoreError(`Error aplicando la restauración: ${err?.message || 'Error desconocido'}`);
    }
  };

  // Admin Profile States
  const [profileName, setProfileName] = useState(adminProfile?.name || 'Valentina Moretti');
  const [profilePhoto, setProfilePhoto] = useState(adminProfile?.photoUrl || '');
  const [profileSuccess, setProfileSuccess] = useState(false);

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;
    onUpdateAdminProfile({
      name: profileName.trim(),
      photoUrl: profilePhoto.trim() || 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY-F9jrf6P_SkfHeHl51GzEIYfoydwPR8G2qCfRsheEg3NJPoq6fpSUdN1z4SZ1z8wjvQd9f6WsL9bsSGKXmKBMPhouu5Rr-NfHjOTXpcmEFA7v7oK4qJ-Roi0nmMUvJFNuTCRlijPw1FGIktp03sNiBF9R2uqBTyF6LygFvW5E8tUmF6ErSN6P0Qo7c_300bb-Gaagy8kYv16HiUPE6wnYUE37ExXB09alovCjyl0VcIDmWemT2Pr'
    });
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 3000);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressed = await compressImage(file, {
          maxWidth: 400,
          maxHeight: 400,
          quality: 0.85
        });
        setProfilePhoto(compressed);
      } catch (err) {
        console.error('Error al comprimir foto de perfil:', err);
      }
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCat.trim()) return;
    if (categories.includes(newCat.trim())) {
      setCatError('La categoría ya existe.');
      return;
    }
    onAddCategory(newCat.trim());
    setNewCat('');
    setCatError('');
  };

  const handleAddMethod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMethod.trim()) return;
    const normalized = newMethod.trim().toUpperCase();
    if (paymentMethods.includes(normalized)) {
      setMethodError('El método de pago ya existe.');
      return;
    }
    onAddPaymentMethod(normalized);
    setNewMethod('');
    setMethodError('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Upper Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Categories & Payment Methods Management */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Perfil de Administradora */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
            <h3 className="font-serif text-sm font-black text-primary flex items-center gap-2">
              <User size={16} /> Perfil de Administradora
            </h3>
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
              <div className="flex flex-col items-center gap-3 bg-surface-container/20 p-4 rounded-2xl border border-outline-variant/10">
                <div className="relative group cursor-pointer">
                  <img
                    src={profilePhoto || "https://lh3.googleusercontent.com/aida-public/AB6AXuBY-F9jrf6P_SkfHeHl51GzEIYfoydwPR8G2qCfRsheEg3NJPoq6fpSUdN1z4SZ1z8wjvQd9f6WsL9bsSGKXmKBMPhouu5Rr-NfHjOTXpcmEFA7v7oK4qJ-Roi0nmMUvJFNuTCRlijPw1FGIktp03sNiBF9R2uqBTyF6LygFvW5E8tUmF6ErSN6P0Qo7c_300bb-Gaagy8kYv16HiUPE6wnYUE37ExXB09alovCjyl0VcIDmWemT2Pr"}
                    alt="Perfil Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/30 group-hover:opacity-85 transition-opacity"
                  />
                  <label htmlFor="photo-file-upload" className="absolute bottom-0 right-0 p-1.5 bg-primary text-white rounded-full hover:bg-primary/95 transition-all shadow-md cursor-pointer flex items-center justify-center">
                    <Camera size={12} />
                  </label>
                  <input
                    id="photo-file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>
                <div className="text-center">
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
                    className="w-full bg-surface-container-low text-xs py-2.5 px-3.5 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">O enlace de foto (URL)</label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={profilePhoto.startsWith('data:') ? '' : profilePhoto}
                    onChange={(e) => setProfilePhoto(e.target.value)}
                    className="w-full bg-surface-container-low text-xs py-2.5 px-3.5 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 hover:shadow-md transition-all flex items-center justify-center gap-2"
              >
                Guardar Cambios de Perfil
              </button>
            </form>
          </div>

          {/* Seguridad y Control de Acceso */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-sm font-black text-primary flex items-center gap-2">
                <Lock size={16} /> Seguridad y Control de Acceso
              </h3>
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
                SHA-256 + Salt
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Configura el PIN de desbloqueo y el tiempo de bloqueo automático por inactividad.
            </p>
            <div className="wavy-divider opacity-30"></div>

            {pinMessage && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 font-medium ${
                  pinMessage.type === 'success'
                    ? 'bg-sage/10 text-sage border border-sage/20'
                    : 'bg-red-500/10 text-red-700 border border-red-500/20'
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
                  className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
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
                    className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-semibold"
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
                    className="w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-mono font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-primary/90 text-white rounded-xl text-xs font-bold hover:bg-primary transition-all flex items-center justify-center gap-1.5"
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
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 15, 30, 0].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => handleTimeoutChange(mins)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all ${
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
                <strong>Mitigación Transitoria (OWASP A01):</strong> Esta barrera protege contra acceso físico no autorizado en terminal. La arquitectura definitiva requerirá backend con autenticación centralizada.
              </p>
            </div>
          </div>

          {/* Expense Categories */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
            <h3 className="font-serif text-sm font-black text-primary flex items-center gap-2">
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
                className="flex-1 bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold"
              />
              <button
                type="submit"
                className="px-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all flex items-center justify-center"
              >
                <Plus size={14} />
              </button>
            </form>

            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div key={cat} className="flex items-center justify-between py-2 px-3 bg-surface-container/30 border border-outline-variant/10 rounded-xl text-xs font-semibold">
                  <span className="text-on-surface-variant">{cat}</span>
                  <button
                    onClick={() => onDeleteCategory(cat)}
                    className="text-on-surface-variant/40 hover:text-terracotta p-1 hover:bg-terracotta/10 rounded-full transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Methods */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
            <h3 className="font-serif text-sm font-black text-primary flex items-center gap-2">
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
                className="flex-1 bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-bold uppercase placeholder:normal-case"
              />
              <button
                type="submit"
                className="px-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all flex items-center justify-center"
              >
                <Plus size={14} />
              </button>
            </form>

            <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
              {paymentMethods.map((method) => (
                <div key={method} className="flex items-center justify-between py-2 px-3 bg-surface-container/30 border border-outline-variant/10 rounded-xl text-xs font-bold uppercase tracking-wider text-on-surface">
                  <span>{method}</span>
                  <button
                    onClick={() => onDeletePaymentMethod(method)}
                    className="text-on-surface-variant/40 hover:text-terracotta p-1 hover:bg-terracotta/10 rounded-full transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Copias de Seguridad y Respaldo Integral */}
          <div className="bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-sm font-black text-primary flex items-center gap-2">
                <Database size={16} /> Respaldo y Protección de Datos
              </h3>
              <span className="text-[9px] font-bold uppercase tracking-wider text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
                JSON Portátil
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Exporta una copia completa de todas las clientas, citas, finanzas y fotos para resguardo externo o migración.
            </p>
            <div className="wavy-divider opacity-30"></div>

            {/* Storage Gauge */}
            <div className="bg-surface-container-low p-3 rounded-2xl border border-outline-variant/20 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-on-surface-variant font-medium flex items-center gap-1.5">
                  <HardDrive size={13} className="text-primary" /> Uso de Almacenamiento Local
                </span>
                <span className="font-mono font-bold text-on-surface">
                  {storageMetrics.usedKb} KB / ~5,000 KB ({storageMetrics.percentageOf5Mb}%)
                </span>
              </div>
              <div className="w-full bg-outline-variant/30 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    storageMetrics.percentageOf5Mb > 75
                      ? 'bg-red-500'
                      : storageMetrics.percentageOf5Mb > 40
                      ? 'bg-amber-500'
                      : 'bg-primary'
                  }`}
                  style={{ width: `${Math.max(storageMetrics.percentageOf5Mb, 4)}%` }}
                ></div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleExportBackup}
                disabled={isExporting}
                className="py-2.5 px-3 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Download size={14} />
                {isExporting ? 'Exportando...' : 'Descargar Backup'}
              </button>

              <label className="py-2.5 px-3 bg-surface-container-high text-primary border border-primary/20 hover:border-primary/40 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 text-center">
                <Upload size={14} />
                <span>Restaurar Backup</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleSelectRestoreFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Export Success Notification */}
            {exportSuccess && (
              <div className="p-2.5 bg-sage/10 text-sage border border-sage/20 rounded-xl text-xs flex items-center gap-2 font-medium animate-fadeIn">
                <CheckCircle2 size={14} /> ¡Respaldo JSON descargado con éxito! Guárdalo en un lugar seguro.
              </div>
            )}

            {/* Restore Success Notification */}
            {restoreSuccess && (
              <div className="p-2.5 bg-sage/10 text-sage border border-sage/20 rounded-xl text-xs flex items-center gap-2 font-medium animate-fadeIn">
                <CheckCircle2 size={14} /> ¡Base de datos restaurada correctamente desde el respaldo!
              </div>
            )}

            {/* Restore Error Notification */}
            {restoreError && (
              <div className="p-2.5 bg-red-500/10 text-red-700 border border-red-500/20 rounded-xl text-xs flex items-center gap-2 font-medium">
                <AlertCircle size={14} className="shrink-0" /> {restoreError}
              </div>
            )}

            {/* Restore Preview & Confirmation Dialog */}
            {restoreCandidate && (
              <div className="bg-surface-container/60 border-2 border-primary/30 p-4 rounded-2xl space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                    <FileJson size={14} /> Confirmar Restauración de Respaldo
                  </h4>
                  <span className="text-[10px] text-on-surface-variant font-medium">
                    {new Date(restoreCandidate.exportedAt).toLocaleDateString('es-ES')}
                  </span>
                </div>

                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Se encontró un archivo válido de <strong>{restoreCandidate.app}</strong> con el siguiente contenido:
                </p>

                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/15">
                    <p className="text-sm font-black text-primary font-mono">{restoreCandidate.summary.clientsCount}</p>
                    <p className="text-[9px] uppercase tracking-wider text-on-surface-variant/70 font-semibold">Clientas</p>
                  </div>
                  <div className="bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/15">
                    <p className="text-sm font-black text-primary font-mono">{restoreCandidate.summary.appointmentsCount}</p>
                    <p className="text-[9px] uppercase tracking-wider text-on-surface-variant/70 font-semibold">Citas</p>
                  </div>
                  <div className="bg-surface-container-lowest p-2 rounded-xl border border-outline-variant/15">
                    <p className="text-sm font-black text-primary font-mono">{restoreCandidate.summary.movementsCount}</p>
                    <p className="text-[9px] uppercase tracking-wider text-on-surface-variant/70 font-semibold">Movimientos</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConfirmRestore}
                    className="flex-1 py-2 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/95 transition-all shadow-xs"
                  >
                    Confirmar y Restaurar
                  </button>
                  <button
                    type="button"
                    onClick={() => setRestoreCandidate(null)}
                    className="py-2 px-3 border border-outline-variant/30 text-on-surface-variant text-xs font-semibold rounded-xl hover:bg-surface-container-high transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Architecture note */}
            <div className="bg-surface-container/30 p-2.5 rounded-xl border border-outline-variant/15 flex items-start gap-2 text-[10px] text-on-surface-variant/75">
              <ShieldCheck size={14} className="text-primary shrink-0 mt-0.5" />
              <p className="leading-normal">
                <strong>Mitigación de Pérdida de Datos:</strong> Los backups portátiles previenen pérdida de datos ante limpieza de navegador o cambio de equipo. En la siguiente etapa se conectará a base de datos relacional Cloud.
              </p>
            </div>
          </div>

          {/* Reset / Backup Card */}
          <div className="bg-terracotta/5 border border-terracotta/20 p-6 rounded-3xl space-y-3.5">
            <h4 className="text-xs font-bold text-terracotta flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldAlert size={15} /> Zona de Mantenimiento
            </h4>
            <p className="text-[11px] text-on-surface-variant/70 leading-relaxed">
              Esta herramienta restablecerá toda la base de datos de <strong>Beauty Space</strong> a sus valores semilla predeterminados. Esta acción es irreversible.
            </p>
            <button
              onClick={() => {
                if (confirm('¿ATENCIÓN: Estás segura de que deseas eliminar todas las citas, clientes y movimientos de finanzas registrados para restablecer las semillas iniciales?')) {
                  onResetDatabase();
                }
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-terracotta/35 text-xs text-terracotta font-bold hover:bg-terracotta/10 transition-all"
            >
              <RefreshCw size={13} /> Restablecer Base de Datos
            </button>
          </div>

        </div>

        {/* RIGHT COLUMN: PRICE CHANGE AUDIT TIMELINE (Takes 7 Cols on Desktop) */}
        <div className="lg:col-span-7 bg-surface-container-lowest border border-outline-variant/35 p-6 rounded-3xl hard-shadow space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif text-base font-black text-primary flex items-center gap-1.5">
                <Settings size={18} /> Auditoría Completa de Precios
              </h3>
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold mt-0.5">Historial completo de modificaciones de tarifas</p>
            </div>
            <span className="text-[9px] font-black bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 rounded-full uppercase">
              {priceChanges.length} Cambios
            </span>
          </div>

          <div className="wavy-divider opacity-40"></div>

          {/* List of price audit modifications */}
          <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
            {priceChanges.length === 0 ? (
              <div className="py-24 text-center text-xs text-on-surface-variant/50 font-semibold border border-dashed border-outline-variant/25 rounded-2xl">
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
  );
};
