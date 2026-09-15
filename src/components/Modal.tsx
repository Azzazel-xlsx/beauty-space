import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  lockScroll?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  maxWidth = 'md',
  showCloseButton = true,
  lockScroll = true,
}) => {
  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open and lockScroll is true
  useEffect(() => {
    if (isOpen && lockScroll) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, lockScroll]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-surface-container-lowest border border-outline-variant/35 rounded-2xl sm:rounded-3xl p-4 sm:p-6 hard-shadow my-auto max-h-[88vh] overflow-y-auto animate-in zoom-in-95 duration-200 motion-reduce:transform-none motion-reduce:transition-none`}
      >
        {/* Header if title or icon provided */}
        {(title || icon || showCloseButton) && (
          <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {icon && (
                <div className="shrink-0 p-1.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
                  {icon}
                </div>
              )}
              <div className="min-w-0 flex-1">
                {title && (
                  <h3 className="font-serif text-sm sm:text-base font-black text-primary truncate">
                    {title}
                  </h3>
                )}
                {subtitle && (
                  <p className="text-[10px] sm:text-[11px] text-on-surface-variant/70 mt-0.5 leading-snug">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                onClick={onClose}
                className="shrink-0 p-1.5 rounded-full text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container transition-all cursor-pointer active:scale-90"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div>{children}</div>
      </div>
    </div>
  );
};
