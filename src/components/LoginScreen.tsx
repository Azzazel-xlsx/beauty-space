import React, { useState, useRef } from 'react';
import { Lock, Eye, EyeOff, Sparkles, Loader2 } from 'lucide-react';
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
  const [isShaking, setIsShaking] = useState(false);
  const [lastTypedIndex, setLastTypedIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 8);
    if (val.length > pin.length) {
      setLastTypedIndex(val.length - 1);
    } else {
      setLastTypedIndex(null);
    }
    setPin(val);
    if (error) setError(null);
  };

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

      // Small delay so user sees smooth loading state
      await new Promise(resolve => setTimeout(resolve, 380));

      const inputHash = await hashPin(pin.trim(), salt);

      if (inputHash === storedHash) {
        onLoginSuccess();
      } else {
        setError('PIN incorrecto. Verifica tus credenciales de acceso.');
        setIsShaking(true);
        setPin('');
        setLastTypedIndex(null);
        setTimeout(() => setIsShaking(false), 450);
        if (inputRef.current) inputRef.current.focus();
      }
    } catch {
      setError('Error verificando credenciales en este terminal.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 450);
    } finally {
      setLoading(false);
    }
  };

  // We show 4 standard slots, or more if PIN is longer
  const slotCount = Math.max(4, pin.length);

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

        {/* Profile Card without "FOUNDER & STYLIST (ADMIN)" text */}
        <div className="flex items-center gap-3.5 p-3.5 bg-surface-container-low/60 rounded-2xl border border-outline-variant/20">
          <img
            src={adminProfile.photoUrl}
            alt={adminProfile.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-primary/30 shadow-sm"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-serif text-sm font-bold text-on-surface truncate">{adminProfile.name}</h3>
          </div>
          <div className="p-2 rounded-full bg-primary/10 text-primary" title="Acceso protegido">
            <Lock size={15} />
          </div>
        </div>

        {/* PIN Form with subtle bounce on digits, shake on error, and smooth eye toggle */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant block text-center">
              PIN de Acceso
            </label>

            {/* Interactive Animated PIN Display */}
            <div
              onClick={() => inputRef.current?.focus()}
              className={`relative cursor-text flex items-center justify-center gap-3 py-3.5 px-4 bg-surface-container-low rounded-2xl border transition-all duration-300 ${
                error
                  ? 'border-terracotta/60 bg-terracotta/5'
                  : 'border-outline-variant/40 hover:border-primary/40 focus-within:border-primary'
              } ${isShaking ? 'animate-pin-shake' : ''}`}
            >
              {/* Invisible native input for accessibility & soft keyboards */}
              <input
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                autoFocus
                required
                value={pin}
                onChange={handlePinChange}
                className="opacity-0 absolute inset-0 w-full h-full cursor-text"
                aria-label="PIN de seguridad"
              />

              {/* Visual Bullets/Digits with Scale/Bounce on Typing */}
              <div className="flex items-center justify-center gap-3 pointer-events-none">
                {Array.from({ length: slotCount }).map((_, idx) => {
                  const hasChar = idx < pin.length;
                  const char = pin[idx];
                  const isLatest = idx === lastTypedIndex;

                  return (
                    <div
                      key={`pin-slot-${idx}`}
                      className={`w-10 h-11 sm:w-11 sm:h-12 rounded-xl flex items-center justify-center border transition-all duration-200 ${
                        hasChar
                          ? 'border-primary/50 bg-surface-container-lowest hard-shadow'
                          : 'border-outline-variant/30 bg-surface-container/30'
                      } ${isLatest && hasChar ? 'animate-pin-bounce' : ''}`}
                    >
                      {hasChar ? (
                        <span
                          className={`font-mono text-lg font-bold text-primary transition-all duration-300 transform ${
                            showPin
                              ? 'opacity-100 scale-100'
                              : 'opacity-0 scale-50'
                          }`}
                        >
                          {showPin ? char : ''}
                        </span>
                      ) : null}

                      {hasChar && !showPin && (
                        <span
                          className={`w-3 h-3 rounded-full bg-primary transition-all duration-300 transform ${
                            isLatest ? 'animate-pin-bounce' : ''
                          }`}
                        />
                      )}

                      {!hasChar && (
                        <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/40" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Smooth Toggle Show/Hide PIN Eye Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPin(!showPin);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 hover:text-primary p-2 rounded-full hover:bg-surface-container transition-all duration-200 active:scale-90"
                title={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
              >
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <div
                    className={`transition-all duration-300 absolute inset-0 flex items-center justify-center ${
                      showPin ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 rotate-90 scale-75'
                    }`}
                  >
                    <EyeOff size={16} />
                  </div>
                  <div
                    className={`transition-all duration-300 absolute inset-0 flex items-center justify-center ${
                      !showPin ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-75'
                    }`}
                  >
                    <Eye size={16} />
                  </div>
                </div>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-terracotta/10 border border-terracotta/20 text-terracotta text-xs text-center font-medium animate-in fade-in duration-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !pin.trim()}
            className="w-full py-3.5 bg-primary text-white rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-primary/95 hover:shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer editorial-shadow"
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin text-white" />
                <span>Verificando acceso...</span>
              </>
            ) : (
              <span>Desbloquear y Acceder</span>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-outline-variant/20 text-center">
          <p className="text-[10px] text-on-surface-variant/50 font-serif italic">
            Beauty Space • Seguridad de datos y privacidad en terminal local
          </p>
        </div>
      </div>
    </div>
  );
};
