import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  RefreshCw,
  X,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastOptions {
  duration?: number; // in milliseconds. If Infinity or <= 0, will stay open until dismissed
  title?: string;
  id?: string;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
  createdAt: number;
}

export interface ToastContextType {
  // Direct helpers
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  loading: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
  update: (
    id: string,
    updates: {
      type?: ToastType;
      message?: string;
      title?: string;
      duration?: number;
    }
  ) => void;
  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    }
  ) => Promise<T>;
  // Nested object access for `toast.success(...)` syntax
  toast: {
    success: (message: string, options?: ToastOptions) => string;
    error: (message: string, options?: ToastOptions) => string;
    warning: (message: string, options?: ToastOptions) => string;
    info: (message: string, options?: ToastOptions) => string;
    loading: (message: string, options?: ToastOptions) => string;
    dismiss: (id: string) => void;
    dismissAll: () => void;
    update: (
      id: string,
      updates: {
        type?: ToastType;
        message?: string;
        title?: string;
        duration?: number;
      }
    ) => void;
    promise: <T>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((err: any) => string);
      }
    ) => Promise<T>;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

const DEFAULT_DURATION = 2000;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isHovered, setIsHovered] = useState(false);
  const activeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Defense-in-depth: Deduplicate identical rapid dispatches within 500ms
  const lastAddedRef = useRef<{ message: string; type: ToastType; time: number }>({
    message: '',
    type: 'info',
    time: 0,
  });

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    if (activeTimerRef.current) {
      clearTimeout(activeTimerRef.current);
      activeTimerRef.current = null;
    }
    setToasts([]);
  }, []);

  // Top of stack is the most recent toast (the last item in toasts array)
  const activeToast = toasts.length > 0 ? toasts[toasts.length - 1] : null;

  // Active countdown timer: only the toast in the front of the stack counts down.
  // When the front toast is dismissed, the next one comes forward and its timer starts.
  useEffect(() => {
    if (activeTimerRef.current) {
      clearTimeout(activeTimerRef.current);
      activeTimerRef.current = null;
    }

    if (!activeToast || isHovered) return;

    const duration = activeToast.duration;
    if (duration > 0 && duration !== Infinity) {
      activeTimerRef.current = setTimeout(() => {
        dismiss(activeToast.id);
      }, duration);
    }

    return () => {
      if (activeTimerRef.current) {
        clearTimeout(activeTimerRef.current);
        activeTimerRef.current = null;
      }
    };
  }, [activeToast?.id, activeToast?.duration, isHovered, dismiss]);

  const addToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions): string => {
      const now = Date.now();
      // Deduplicate identical message and type within 500ms
      if (
        lastAddedRef.current.message === message &&
        lastAddedRef.current.type === type &&
        now - lastAddedRef.current.time < 500
      ) {
        return toasts[toasts.length - 1]?.id || 'duplicate';
      }
      lastAddedRef.current = { message, type, time: now };

      const id = options?.id || `toast-${now}-${Math.random().toString(36).substring(2, 7)}`;
      const duration = options?.duration !== undefined
        ? options.duration
        : type === 'loading'
        ? Infinity
        : DEFAULT_DURATION;

      const newToast: ToastItem = {
        id,
        type,
        message,
        title: options?.title,
        duration,
        createdAt: now,
      };

      setToasts((prev) => {
        // If an item with this ID already exists, replace it, otherwise append to stack
        const existingIdx = prev.findIndex((t) => t.id === id);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = newToast;
          return next;
        }
        return [...prev, newToast];
      });

      return id;
    },
    [toasts]
  );

  const update = useCallback(
    (
      id: string,
      updates: {
        type?: ToastType;
        message?: string;
        title?: string;
        duration?: number;
      }
    ) => {
      setToasts((prev) => {
        const idx = prev.findIndex((t) => t.id === id);
        if (idx === -1) return prev;
        const current = prev[idx];
        const newType = updates.type ?? current.type;
        const newDuration =
          updates.duration !== undefined
            ? updates.duration
            : newType === 'loading'
            ? Infinity
            : DEFAULT_DURATION;

        const updatedItem: ToastItem = {
          ...current,
          type: newType,
          message: updates.message ?? current.message,
          title: updates.title !== undefined ? updates.title : current.title,
          duration: newDuration,
        };

        const next = [...prev];
        next[idx] = updatedItem;
        return next;
      });
    },
    []
  );

  const success = useCallback(
    (message: string, options?: ToastOptions) => addToast('success', message, options),
    [addToast]
  );
  const error = useCallback(
    (message: string, options?: ToastOptions) => addToast('error', message, options),
    [addToast]
  );
  const warning = useCallback(
    (message: string, options?: ToastOptions) => addToast('warning', message, options),
    [addToast]
  );
  const info = useCallback(
    (message: string, options?: ToastOptions) => addToast('info', message, options),
    [addToast]
  );
  const loading = useCallback(
    (message: string, options?: ToastOptions) => addToast('loading', message, options),
    [addToast]
  );

  const promise = useCallback(
    async <T,>(
      p: Promise<T>,
      messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((err: any) => string);
      }
    ): Promise<T> => {
      const id = loading(messages.loading);
      try {
        const result = await p;
        const msg = typeof messages.success === 'function' ? messages.success(result) : messages.success;
        update(id, { type: 'success', message: msg, duration: DEFAULT_DURATION });
        return result;
      } catch (err) {
        const msg = typeof messages.error === 'function' ? messages.error(err) : messages.error;
        update(id, { type: 'error', message: msg, duration: 4000 });
        throw err;
      }
    },
    [loading, update]
  );

  const toastMethods = {
    success,
    error,
    warning,
    info,
    loading,
    dismiss,
    dismissAll,
    update,
    promise,
  };

  const contextValue: ToastContextType = {
    ...toastMethods,
    toast: toastMethods,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer
        toasts={toasts}
        onDismiss={dismiss}
        onHoverChange={setIsHovered}
      />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Subcomponente individual para cada Toast apilado
const ToastCard: React.FC<{
  toast: ToastItem;
  reverseIndex: number;
  totalCount: number;
  onDismiss: (id: string) => void;
}> = ({ toast, reverseIndex, onDismiss }) => {
  const { type, message, title, id } = toast;

  const styleConfig = {
    success: {
      borderColor: 'border-sage/35',
      bgColor: 'bg-[#FAF8F5]',
      iconBg: 'bg-sage/12 text-sage',
      icon: <CheckCircle2 size={16} strokeWidth={2.2} />,
      accentBar: 'bg-sage',
    },
    error: {
      borderColor: 'border-terracotta/30',
      bgColor: 'bg-[#FAF8F5]',
      iconBg: 'bg-terracotta/10 text-terracotta',
      icon: <AlertCircle size={16} strokeWidth={2.2} />,
      accentBar: 'bg-terracotta',
    },
    warning: {
      borderColor: 'border-amber-500/30',
      bgColor: 'bg-[#FAF8F5]',
      iconBg: 'bg-amber-500/12 text-amber-700',
      icon: <AlertTriangle size={16} strokeWidth={2.2} />,
      accentBar: 'bg-amber-500',
    },
    info: {
      borderColor: 'border-primary/25',
      bgColor: 'bg-[#FAF8F5]',
      iconBg: 'bg-primary/10 text-primary',
      icon: <Info size={16} strokeWidth={2.2} />,
      accentBar: 'bg-primary',
    },
    loading: {
      borderColor: 'border-primary/25',
      bgColor: 'bg-[#FAF8F5]',
      iconBg: 'bg-primary/10 text-primary',
      icon: <RefreshCw size={15} strokeWidth={2.2} className="animate-spin" />,
      accentBar: 'bg-primary',
    },
  }[type];

  // Configuración posicional en la pila
  // reverseIndex 0 = al frente (más reciente)
  // reverseIndex 1 = directamente detrás (semivisible)
  // reverseIndex 2 = segundo detrás (semivisible)
  // reverseIndex >= 3 = oculto en el fondo
  const isTop = reverseIndex === 0;
  const isBehind1 = reverseIndex === 1;
  const isBehind2 = reverseIndex === 2;

  const yOffset = isTop ? 0 : isBehind1 ? 10 : isBehind2 ? 20 : 28;
  const scale = isTop ? 1 : isBehind1 ? 0.94 : isBehind2 ? 0.88 : 0.82;
  const opacity = isTop ? 1 : isBehind1 ? 0.75 : isBehind2 ? 0.45 : 0;
  const zIndex = 50 - reverseIndex;

  return (
    <motion.div
      layout
      style={{
        zIndex,
        gridColumnStart: 1,
        gridRowStart: 1,
        transformOrigin: 'top center',
      }}
      initial={{ opacity: 0, y: -24, scale: 0.95 }}
      animate={{
        opacity,
        y: yOffset,
        scale,
      }}
      exit={{
        opacity: 0,
        y: -18,
        scale: 0.92,
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
      transition={{
        type: 'spring',
        stiffness: 380,
        damping: 28,
        mass: 0.8,
      }}
      className={`relative overflow-hidden flex items-center justify-between gap-3 p-3 sm:p-3.5 ${
        styleConfig.bgColor
      } border ${styleConfig.borderColor} rounded-2xl ${
        isTop ? 'shadow-lg' : isBehind1 ? 'shadow-md' : 'shadow-xs'
      } backdrop-blur-xs min-w-[280px] max-w-[380px] w-full group ${
        isTop ? 'pointer-events-auto' : 'pointer-events-none select-none'
      }`}
      role="status"
      aria-live="polite"
    >
      {/* Sutil barra de acento a la izquierda */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${styleConfig.accentBar} rounded-l-full`} />

      {/* Contenido principal */}
      <div className="flex items-center gap-3 min-w-0 pl-1">
        <div className={`w-8 h-8 rounded-xl ${styleConfig.iconBg} flex items-center justify-center shrink-0`}>
          {styleConfig.icon}
        </div>
        <div className="min-w-0">
          {title && (
            <h4 className="text-[12px] font-bold text-[#1C1D18] leading-snug truncate">
              {title}
            </h4>
          )}
          <p className="text-[12.5px] font-medium text-[#2E3128] leading-snug">
            {message}
          </p>
        </div>
      </div>

      {/* Botón de cerrar (sólo interactivo en la tarjeta frontal) */}
      {isTop ? (
        <button
          onClick={() => onDismiss(id)}
          className="p-1 rounded-lg text-[#7E8474] hover:text-[#1C1D18] hover:bg-black/5 transition-colors shrink-0 cursor-pointer"
          aria-label="Cerrar notificación"
        >
          <X size={14} strokeWidth={2} />
        </button>
      ) : (
        <div className="w-5 h-5 shrink-0" />
      )}
    </motion.div>
  );
};

export const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onHoverChange?: (isHovered: boolean) => void;
}> = ({ toasts, onDismiss, onHoverChange }) => {
  return (
    <div
      aria-label="Notificaciones"
      onMouseEnter={() => onHoverChange?.(true)}
      onMouseLeave={() => onHoverChange?.(false)}
      className="fixed top-4 left-4 z-[70] pointer-events-none max-w-[calc(100vw-2rem)] sm:max-w-sm"
    >
      <div className="relative grid grid-cols-1 grid-rows-1 items-start">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast, index) => {
            const reverseIndex = toasts.length - 1 - index;
            return (
              <ToastCard
                key={toast.id}
                toast={toast}
                reverseIndex={reverseIndex}
                totalCount={toasts.length}
                onDismiss={onDismiss}
              />
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ToastProvider;
