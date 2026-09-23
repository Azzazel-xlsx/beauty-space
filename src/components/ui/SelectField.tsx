import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check, Search, SearchX, X } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  render?: React.ReactNode;
}

export interface SelectFieldProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  variant?: 'sheet' | 'dropdown' | 'auto';
  required?: boolean;
  disabled?: boolean;
  emptyStateText?: string;
  className?: string;
  triggerClassName?: string;
}

const normalize = (str: string): string =>
  str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = 'Seleccionar...',
  variant = 'auto',
  required = false,
  disabled = false,
  emptyStateText = 'No se encontraron resultados',
  className = '',
  triggerClassName = ''
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Determine actual variant if 'auto'
  const resolvedVariant: 'sheet' | 'dropdown' = useMemo(() => {
    if (variant === 'sheet' || variant === 'dropdown') return variant;
    if (typeof window !== 'undefined' && window.innerWidth < 640) {
      return 'sheet';
    }
    return 'dropdown';
  }, [variant]);

  // Find currently selected option
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Search filtering (active when options.length > 8)
  const showSearch = options.length > 8;

  const filteredOptions = useMemo(() => {
    if (!showSearch || !searchQuery.trim()) return options;
    const normalizedQuery = normalize(searchQuery.trim());
    return options.filter((opt) => normalize(opt.label).includes(normalizedQuery));
  }, [options, searchQuery, showSearch]);

  // Handle option selection
  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearchQuery('');
    triggerRef.current?.focus();
  };

  // Close on Escape or click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setSearchQuery('');
        triggerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (resolvedVariant === 'dropdown') {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          setSearchQuery('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, resolvedVariant]);

  // Focus search input on open if search is enabled
  useEffect(() => {
    if (isOpen && showSearch) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showSearch]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen && resolvedVariant === 'sheet') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, resolvedVariant]);

  // Base trigger classes matching precision orgánica
  const defaultTriggerStyles =
    'w-full bg-surface-container-low text-xs py-2 px-3 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-semibold text-on-surface truncate flex items-center justify-between gap-2 min-h-[38px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const triggerClasses = triggerClassName
    ? triggerClassName
    : defaultTriggerStyles;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Optional Label */}
      {label && (
        <label
          htmlFor={selectId}
          className="block text-[9px] uppercase tracking-widest font-bold text-on-surface-variant mb-1"
        >
          {label}
        </label>
      )}

      {/* Hidden input for HTML form validation */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden="true"
          required={required}
          value={value}
          onChange={() => {}}
          className="sr-only"
        />
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={selectId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
            setSearchQuery('');
          }
        }}
        className={triggerClasses}
      >
        <span className={`truncate text-left flex-1 ${!selectedOption ? 'text-on-surface-variant/50 font-normal' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-on-surface-variant transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>

      {/* DROPDOWN VARIANT */}
      {resolvedVariant === 'dropdown' && (
        <AnimatePresence>
          {isOpen && (
            <motion.div
              role="listbox"
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl hard-shadow overflow-hidden max-h-64 flex flex-col min-w-[200px]"
            >
              {/* Optional Search in Dropdown */}
              {showSearch && (
                <div className="p-2 border-b border-outline-variant/20 bg-surface-container-low/60 shrink-0">
                  <div className="relative flex items-center">
                    <Search size={13} className="absolute left-2.5 text-on-surface-variant/60" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && filteredOptions.length > 0) {
                          e.preventDefault();
                          handleSelect(filteredOptions[0].value);
                        }
                      }}
                      placeholder="Buscar..."
                      className="w-full bg-surface-container-lowest text-xs pl-7 pr-7 py-1.5 rounded-lg border border-outline-variant/30 focus:outline-none focus:border-primary font-medium text-on-surface"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 text-on-surface-variant/60 hover:text-on-surface p-0.5"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Options List */}
              <div className="overflow-y-auto p-1.5 space-y-0.5 flex-1">
                {filteredOptions.length === 0 ? (
                  <div className="py-6 px-3 text-center text-xs text-on-surface-variant/60 flex flex-col items-center justify-center gap-1.5">
                    <SearchX size={18} className="text-on-surface-variant/40" />
                    <span>{emptyStateText}</span>
                  </div>
                ) : (
                  filteredOptions.map((opt) => {
                    const isSelected = opt.value === value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-sage/15 text-primary font-bold'
                            : 'text-on-surface hover:bg-surface-container-low font-medium'
                        }`}
                      >
                        <div className="flex-1 truncate">
                          {opt.render ? opt.render : <span className="truncate">{opt.label}</span>}
                        </div>
                        {isSelected && <Check size={14} className="text-primary shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* SHEET VARIANT (Rendered in Portal) */}
      {resolvedVariant === 'sheet' && typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-[9999] flex flex-col justify-end">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className="fixed inset-0 bg-black/40 backdrop-blur-xs"
              />

              {/* Bottom Sheet */}
              <motion.div
                role="listbox"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                className="relative z-10 w-full max-w-xl mx-auto bg-surface-container-lowest rounded-t-3xl border-t border-outline-variant/30 shadow-2xl flex flex-col max-h-[82vh] safe-bottom"
              >
                {/* Drag / Visual handle */}
                <div className="w-12 h-1.5 bg-outline-variant/50 rounded-full mx-auto my-3 shrink-0" />

                {/* Sheet Header */}
                <div className="px-5 pb-3 flex items-center justify-between border-b border-outline-variant/20 shrink-0">
                  <h3 className="font-serif text-base font-bold text-primary truncate">
                    {label || placeholder || 'Seleccionar opción'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                    aria-label="Cerrar"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Search Bar (if > 8 options) */}
                {showSearch && (
                  <div className="px-5 py-3 border-b border-outline-variant/15 bg-surface-container-low/40 shrink-0">
                    <div className="relative flex items-center">
                      <Search size={14} className="absolute left-3 text-on-surface-variant/60" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && filteredOptions.length > 0) {
                            e.preventDefault();
                            handleSelect(filteredOptions[0].value);
                          }
                        }}
                        placeholder="Buscar opción..."
                        className="w-full bg-surface-container-lowest text-xs pl-8 pr-8 py-2.5 rounded-xl border border-outline-variant/30 focus:outline-none focus:border-primary font-medium text-on-surface shadow-2xs"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-2.5 text-on-surface-variant/60 hover:text-on-surface p-1"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Options List */}
                <div className="overflow-y-auto px-4 py-3 space-y-1 flex-1">
                  {filteredOptions.length === 0 ? (
                    <div className="py-10 px-4 text-center text-xs text-on-surface-variant/60 flex flex-col items-center justify-center gap-2">
                      <SearchX size={24} className="text-on-surface-variant/40" />
                      <span className="font-medium">{emptyStateText}</span>
                    </div>
                  ) : (
                    filteredOptions.map((opt) => {
                      const isSelected = opt.value === value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => handleSelect(opt.value)}
                          className={`w-full text-left px-3.5 py-3 rounded-2xl text-xs flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-sage/15 text-primary font-bold shadow-2xs'
                              : 'text-on-surface hover:bg-surface-container-low font-medium'
                          }`}
                        >
                          <div className="flex-1 truncate">
                            {opt.render ? opt.render : <span className="truncate">{opt.label}</span>}
                          </div>
                          {isSelected && <Check size={16} className="text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};
