import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Eye, EyeOff, ArrowRight, Loader2, User, Mail } from 'lucide-react';
import { hashPin, generateSalt } from '../utils/crypto';
import { AdminProfile } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import loginBrandBgAsset from '../assets/images/beauty_space_editorial_1789497481351.jpg';

/**
 * PIN por defecto reservado para la funcionalidad de bloqueo rápido de pantalla (Screen Lock).
 * Se conserva exportado para compatibilidad con el plan de migración (supabase/NOTES.md).
 */
export const DEFAULT_FIRST_RUN_PIN = '1234';

/**
 * Utilidades criptográficas conservadas para el bloqueo de pantalla sobre sesión activa.
 */
export { hashPin, generateSalt };

/**
 * Imagen de fondo para el panel de marca en la pantalla de login.
 * Puede ser reemplazada por el asset definitivo en cualquier momento.
 */
export const loginBackgroundImage = loginBrandBgAsset;

/**
 * Isotipo floral de 4 hojas de Beauty Space, idéntico a la identidad visual de la marca.
 */
export const BrandFloralEmblem: React.FC<{ size?: number; className?: string }> = ({
  size = 46,
  className = 'text-[#384628]',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Hoja Superior Izquierda (-38 deg) */}
      <g transform="translate(24, 24) rotate(-38) translate(0, -2)">
        <path
          d="M 0 0 C -5 -6, -6 -13, 0 -19 C 6 -13, 5 -6, 0 0 Z"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* Hoja Superior Derecha (+38 deg) */}
      <g transform="translate(24, 24) rotate(38) translate(0, -2)">
        <path
          d="M 0 0 C -5 -6, -6 -13, 0 -19 C 6 -13, 5 -6, 0 0 Z"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* Hoja Inferior Derecha (+142 deg) */}
      <g transform="translate(24, 24) rotate(142) translate(0, -2)">
        <path
          d="M 0 0 C -5 -6, -6 -13, 0 -19 C 6 -13, 5 -6, 0 0 Z"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
      {/* Hoja Inferior Izquierda (-142 deg) */}
      <g transform="translate(24, 24) rotate(-142) translate(0, -2)">
        <path
          d="M 0 0 C -5 -6, -6 -13, 0 -19 C 6 -13, 5 -6, 0 0 Z"
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};

interface LoginScreenProps {
  adminProfile: AdminProfile;
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ adminProfile, onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) return;

    setError(null);
    setLoading(true);

    try {
      if (!isSupabaseConfigured()) {
        setError('Supabase no está configurado. Por favor define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en tu archivo .env para acceder.');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        return;
      }

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });

      if (authError) {
        const errorMsg =
          authError.message === 'Invalid login credentials'
            ? 'Credenciales inválidas. Verifica tu correo y contraseña.'
            : authError.message || 'Error al iniciar sesión.';
        setError(errorMsg);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
        if (passwordInputRef.current) passwordInputRef.current.focus();
        return;
      }

      if (data?.session || data?.user) {
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err?.message || 'Error verificando credenciales en este terminal.');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setLoading(false);
    }
  };

  const displayName = adminProfile?.name?.trim() || 'Juliana castro';

  return (
    <div className="min-h-dvh h-dvh bg-[#FAF8F5] flex flex-row antialiased selection:bg-[#566544]/20 overflow-x-hidden safe-top safe-bottom">
      {/* ========================================================================= */}
      {/* COLUMNA IZQUIERDA: PANEL BOTÁNICO & BRANDING VERTICAL (SIEMPRE A LA IZQUIERDA) */}
      {/* ========================================================================= */}
      <div className="w-[34%] xs:w-[36%] sm:w-[38%] md:w-[40%] lg:w-[42%] xl:w-[44%] min-h-dvh h-dvh relative shrink-0 overflow-hidden flex items-center justify-center bg-[#F3EFE9] border-r border-[#E8E4DA]/60">
        {/* Fotografía de plantas/hojas sobre soporte de travertino con iluminación natural */}
        <motion.img
          initial={{ scale: 1.05, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          src={loginBackgroundImage}
          alt="Beauty Space Editorial"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-center select-none pointer-events-none"
        />

        {/* Scrim cálido muy sutil que asegura lectura impecable manteniendo la naturalidad de la foto */}
        <div className="absolute inset-0 bg-[#FAF8F5]/10 pointer-events-none" />

        {/* Bloque de Identidad de Marca: BEAUTY Space */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center justify-center text-center px-3 sm:px-6 py-6 sm:py-8 select-none"
        >
          {/* BEAUTY */}
          <h1 className="font-serif text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-[44px] font-normal tracking-[0.24em] text-[#384628] uppercase leading-none pl-1">
            BEAUTY
          </h1>

          {/* Space (en cursiva serif elegante) */}
          <span className="font-serif italic text-[length:var(--text-fluid-display)] font-normal text-[#384628] leading-[0.95] -mt-1 sm:-mt-2">
            Space
          </span>
        </motion.div>
      </div>

      {/* ========================================================================= */}
      {/* COLUMNA DERECHA: FORMULARIO DE INICIO DE SESIÓN */}
      {/* ========================================================================= */}
      <div className="flex-1 min-h-dvh h-dvh flex flex-col justify-center items-center px-4 xs:px-6 sm:px-10 md:px-12 lg:px-16 xl:px-24 py-8 sm:py-12 bg-[#FAF8F5] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px]"
        >
          {/* Eyebrow & Títulos */}
          <div className="space-y-1 mb-5 sm:mb-7">
            <motion.span
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="text-[9.5px] sm:text-[11px] tracking-[0.28em] font-semibold text-[#6C7460] uppercase block"
            >
              BIENVENIDA
            </motion.span>

            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2 }}
              className="font-serif text-[length:var(--text-fluid-h1)] font-normal text-[#1A1C16] tracking-tight leading-tight"
            >
              Inicia sesión
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.25 }}
              className="text-xs xs:text-[13px] sm:text-[14.5px] font-normal text-[#6C7164] leading-relaxed pt-0.5 sm:pt-1"
            >
              Accede a tu cuenta de Supabase para continuar con la gestión de tu negocio.
            </motion.p>
          </div>

          {/* Tarjeta de Usuario */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3.5 bg-[#EFECE5] rounded-2xl border border-[#E4E1D9]/50 mb-3.5 sm:mb-4 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <img
                src={adminProfile.photoUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border border-white/70 shadow-xs shrink-0"
              />
              <div className="min-w-0">
                <h3 className="font-sans text-[13.5px] sm:text-[15px] font-semibold text-[#1C1D18] truncate leading-snug">
                  {displayName}
                </h3>
                <p className="text-[8.5px] sm:text-[10px] tracking-[0.2em] font-semibold text-[#7E8375] uppercase mt-0.5">
                  FUNDADORA & ADMIN
                </p>
              </div>
            </div>

            {/* Badge icono circular a la derecha */}
            <div
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#E3E0D8]/80 text-[#6E7365] flex items-center justify-center shrink-0"
              title="Cuenta protegida"
            >
              <User size={15} strokeWidth={1.8} className="sm:w-[16px] sm:h-[16px]" />
            </div>
          </motion.div>

          {/* Formulario de Entrada: Correo Electrónico + Contraseña */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3.5">
            {/* Input de Correo Electrónico con ícono Mail */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: 1,
                y: 0,
                x: isShaking ? [-8, 8, -6, 6, -3, 3, 0] : 0,
              }}
              transition={{
                x: { duration: 0.45, ease: 'easeInOut' },
                opacity: { duration: 0.5, delay: 0.32 },
                y: { duration: 0.5, delay: 0.32 },
              }}
              className={`relative flex items-center h-12 sm:h-14 bg-[#FAF8F5] rounded-2xl border transition-all duration-200 ${
                error
                  ? 'border-[#BA1A1A]/70 bg-[#BA1A1A]/5 ring-1 ring-[#BA1A1A]/30'
                  : 'border-[#DEDAD0] hover:border-[#566544]/60 focus-within:border-[#566544] focus-within:ring-2 focus-within:ring-[#566544]/15'
              }`}
            >
              {/* Ícono de Correo a la izquierda */}
              <div className="pl-3.5 sm:pl-4.5 pr-2 sm:pr-2.5 text-[#7E8474] pointer-events-none shrink-0 flex items-center">
                <Mail size={16} strokeWidth={1.8} className="sm:w-[18px] sm:h-[18px]" />
              </div>

              {/* Input Nativo: text-base en móvil para prevenir zoom automático */}
              <input
                ref={emailInputRef}
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={handleEmailChange}
                placeholder="Correo electrónico"
                className="w-full h-full pr-4 text-base sm:text-[15px] font-sans text-[#1C1D18] bg-transparent placeholder:text-[#7E8474] placeholder:font-normal focus:outline-none min-h-[44px]"
                aria-label="Correo electrónico de administradora"
              />
            </motion.div>

            {/* Input de Contraseña tipo password con candado y toggle de ojo */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{
                opacity: 1,
                y: 0,
                x: isShaking ? [-8, 8, -6, 6, -3, 3, 0] : 0,
              }}
              transition={{
                x: { duration: 0.45, ease: 'easeInOut' },
                opacity: { duration: 0.5, delay: 0.38 },
                y: { duration: 0.5, delay: 0.38 },
              }}
              className={`relative flex items-center h-12 sm:h-14 bg-[#FAF8F5] rounded-2xl border transition-all duration-200 ${
                error
                  ? 'border-[#BA1A1A]/70 bg-[#BA1A1A]/5 ring-1 ring-[#BA1A1A]/30'
                  : 'border-[#DEDAD0] hover:border-[#566544]/60 focus-within:border-[#566544] focus-within:ring-2 focus-within:ring-[#566544]/15'
              }`}
            >
              {/* Candado a la izquierda */}
              <div className="pl-3.5 sm:pl-4.5 pr-2 sm:pr-2.5 text-[#7E8474] pointer-events-none shrink-0 flex items-center">
                <Lock size={16} strokeWidth={1.8} className="sm:w-[18px] sm:h-[18px]" />
              </div>

              {/* Input Nativo: text-base en móvil para prevenir zoom automático */}
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={handlePasswordChange}
                placeholder="Contraseña"
                className="w-full h-full pr-12 text-base sm:text-[15px] font-sans text-[#1C1D18] bg-transparent placeholder:text-[#7E8474] placeholder:font-normal focus:outline-none min-h-[44px]"
                aria-label="Contraseña de seguridad"
              />

              {/* Botón de alternar ojo para mostrar/ocultar Contraseña: Touch target mínimo de 44px */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-[#7E8474] hover:text-[#384628] w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-black/5 transition-colors cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? (
                  <EyeOff size={18} strokeWidth={1.8} />
                ) : (
                  <Eye size={18} strokeWidth={1.8} />
                )}
              </motion.button>
            </motion.div>

            {/* Banner de error con animación suave */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -4, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="p-2.5 sm:p-3 rounded-xl bg-[#BA1A1A]/8 border border-[#BA1A1A]/20 text-[#BA1A1A] text-xs text-center font-medium overflow-hidden"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Botón Pill: INICIAR SESIÓN con flecha */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.42 }}
              className="pt-1.5"
            >
              <motion.button
                type="submit"
                disabled={loading || !email.trim() || !password}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full h-12 sm:h-[54px] bg-[#566544] hover:bg-[#4B583A] text-white rounded-full text-[11px] sm:text-[12.5px] uppercase tracking-[0.2em] font-semibold transition-colors duration-200 flex items-center justify-center relative px-4 sm:px-6 cursor-pointer shadow-xs hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>VERIFICANDO...</span>
                  </div>
                ) : (
                  <>
                    <span className="text-center">INICIAR SESIÓN</span>
                    <ArrowRight
                      size={16}
                      strokeWidth={2}
                      className="absolute right-4 sm:right-6 text-white group-hover:translate-x-1.5 transition-transform duration-200"
                    />
                  </>
                )}
              </motion.button>
            </motion.div>
          </form>

          {/* Divisor Decorativo: Línea fina con Isotipo floral en el centro */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
            className="relative flex items-center justify-center mt-6 sm:mt-9 mb-4 sm:mb-6"
          >
            <div className="w-full border-t border-[#E3DFD5]" />
            <div className="absolute bg-[#FAF8F5] px-3 sm:px-3.5 flex items-center justify-center">
              <BrandFloralEmblem size={19} className="sm:w-[22px] sm:h-[22px] text-[#566544]" />
            </div>
          </motion.div>

          {/* Tagline Final */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="text-center"
          >
            <p className="text-[9px] sm:text-[11px] tracking-[0.26em] font-medium text-[#7E8474] uppercase">
              TU NEGOCIO, SIEMPRE EN ORDEN
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};
