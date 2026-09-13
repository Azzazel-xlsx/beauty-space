import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';
import { hashPin, generateSalt } from '../utils/crypto';
import { AdminProfile } from '../types';

interface LoginScreenProps {
  adminProfile: AdminProfile;
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ adminProfile, onLoginSuccess }) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setError(null);
    setLoading(true);

    try {
      let salt = localStorage.getItem('bs_auth_salt');
      let storedHash = localStorage.getItem('bs_auth_hash');

      // Initialize default PIN ("1234") if not yet initialized
      if (!salt || !storedHash) {
        salt = generateSalt();
        storedHash = await hashPin('1234', salt);
        localStorage.setItem('bs_auth_salt', salt);
        localStorage.setItem('bs_auth_hash', storedHash);
      }

      const inputHash = await hashPin(pin.trim(), salt);

      if (inputHash === storedHash) {
        onLoginSuccess();
      } else {
        setError('PIN incorrecto. Verifica tus credenciales de acceso.');
        setPin('');
      }
    } catch {
      setError('Error verificando credenciales en este navegador.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-4 selection:bg-primary/20">
      {/* Background Decorative Ambient Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center -z-10">
        <div className="w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-12"></div>
        <div className="w-[350px] h-[350px] bg-sage/10 rounded-full blur-2xl translate-x-20 translate-y-20"></div>
      </div>

      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant/35 rounded-3xl p-8 shadow-xl relative space-y-6">
        {/* Studio Branding */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] tracking-widest uppercase font-semibold mb-2">
            <Sparkles size={11} />
            Gestión Profesional
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-serif text-3xl tracking-widest text-primary font-bold">BEAUTY</span>
            <span className="font-serif text-3xl italic text-primary/70 font-light">Space</span>
          </div>
          <p className="text-xs text-on-surface-variant/70 font-serif italic">
            Panel privado de administración y finanzas
          </p>
        </div>

        {/* Profile Card */}
        <div className="flex items-center gap-3.5 p-3.5 bg-surface-container-low/60 rounded-2xl border border-outline-variant/20">
          <img
            src={adminProfile.photoUrl}
            alt={adminProfile.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-primary/30 shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-sm font-bold text-on-surface truncate">{adminProfile.name}</h3>
            <p className="text-[10px] text-primary tracking-wider uppercase font-semibold">
              Founder & Stylist (Admin)
            </p>
          </div>
          <div className="p-2 rounded-full bg-primary/10 text-primary" title="Acceso protegido">
            <Lock size={15} />
          </div>
        </div>

        {/* Notice of transient local barrier (OWASP recommendation) */}
        <div className="flex items-start gap-2 text-[11px] text-on-surface-variant/80 bg-surface-container/40 p-3 rounded-xl border border-outline-variant/15">
          <ShieldCheck size={16} className="text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Ingresa tu PIN de seguridad para acceder al sistema.
            <span className="block text-[10px] text-primary/80 font-medium mt-1">
              (PIN inicial predeterminado: <strong>1234</strong>)
            </span>
          </p>
        </div>

        {/* PIN Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant block">
              PIN de Acceso
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                autoFocus
                required
                placeholder="••••"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-surface-container-low text-center text-xl tracking-[0.3em] font-mono py-3 px-4 rounded-xl border border-outline-variant/40 focus:outline-none focus:border-primary font-bold text-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-primary p-1.5 transition-colors"
                title={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
              >
                {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-700 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !pin.trim()}
            className="w-full py-3 bg-primary text-white rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-primary/95 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading ? 'Verificando...' : 'Desbloquear y Acceder'}
          </button>
        </form>

        <div className="pt-2 border-t border-outline-variant/20 text-center">
          <p className="text-[10px] text-on-surface-variant/50">
            Beauty Space • Seguridad de datos y privacidad en terminal local
          </p>
        </div>
      </div>
    </div>
  );
};
