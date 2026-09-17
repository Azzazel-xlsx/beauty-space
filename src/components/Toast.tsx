import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
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
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    // Clear timer if exists
    const timer = timeoutsRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timeoutsRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    timeoutsRef.current.forEach((timer) => clearTimeout(timer));
    timeoutsRef.current.clear();
    setToasts([]);
  }, []);

  const scheduleDismissal = useCallback(
    (id: string, duration: number) => {
      // Clear any existing timer for this id
      const existing = timeoutsRef.current.get(id);
      if (existing) {
        clearTimeout(existing);
        timeoutsRef.current.delete(id);
      }

      if (duration > 0 && duration !== Infinity) {
        const timer = setTimeout(() => {
          dismiss(id);
        }, duration);
        timeoutsRef.current.set(id, timer);
      }
    },
    [dismiss]
  );

  const addToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions): string => {
      const id = options?.id || `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
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
        createdAt: Date.now(),
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

      scheduleDismissal(id, duration);
      return id;
    },
    [scheduleDismissal]
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

        scheduleDismissal(id, newDuration);

        const next = [...prev];
        next[idx] = updatedItem;
        return next;
      });
    },
    [scheduleDismissal]
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
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
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

// Subcomponente individual para cada Toast
const ToastCard: React.FC<{
  toast: ToastItem;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -28, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -24, scale: 0.95, transition: { duration: 0.18 } }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`pointer-events-auto relative overflow-hidden flex items-center justify-between gap-3 p-3 sm:p-3.5 ${styleConfig.bgColor} border ${styleConfig.borderColor} rounded-2xl shadow-md backdrop-blur-xs min-w-[280px] max-w-[380px] group`}
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

      {/* Botón de cerrar */}
      <button
        onClick={() => onDismiss(id)}
        className="p-1 rounded-lg text-[#7E8474] hover:text-[#1C1D18] hover:bg-black/5 transition-colors shrink-0 cursor-pointer"
        aria-label="Cerrar notificación"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </motion.div>
  );
};

export const ToastContainer: React.FC<{
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-label="Notificaciones"
      className="fixed top-4 left-4 z-[70] flex flex-col gap-2.5 pointer-events-none max-w-[calc(100vw-2rem)] sm:max-w-sm"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastProvider;
