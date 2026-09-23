import React from 'react';
import { Coins, Calendar, Users, Sparkles, Sparkle, Menu, X, Settings, LogOut } from 'lucide-react';
import { DEFAULT_ADMIN_PHOTO } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  adminProfile?: { name: string; photoUrl: string };
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, adminProfile, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const todayDateStr = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const navItems = [
    { id: 'finanzas', label: 'Finanzas', icon: Coins },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'clientas', label: 'Clientas', icon: Users },
    { id: 'servicios', label: 'Servicios', icon: Sparkles },
    { id: 'ajustes', label: 'Ajustes', icon: Settings },
  ];


  return (
    <div className="min-h-dvh bg-background font-sans text-on-surface flex flex-col md:flex-row antialiased">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-surface-container border-r border-outline-variant/40 p-6 shrink-0 relative">
        {/* Decorative floral spark */}
        <div className="absolute top-4 right-4 text-primary/30">
          <Sparkle size={18} className="animate-pulse" />
        </div>

        {/* Brand/Logo */}
        <div className="mb-8 pt-4">
          <div className="flex items-center gap-2.5 justify-center">
            <img
              src="/favicon.png"
              alt="Beauty Space"
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg shadow-xs object-cover"
            />
            <div className="flex items-center gap-1">
              <span className="font-serif text-2xl tracking-widest text-primary font-bold">BEAUTY</span>
              <span className="font-serif text-2xl italic text-primary/70 font-light">Space</span>
            </div>
          </div>
        </div>

        {/* Wavy Divider */}
        <div className="wavy-divider opacity-60 mb-6"></div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-full text-sm font-medium tracking-wide transition-all duration-300 min-h-[44px] cursor-pointer ${
                  isActive
                    ? 'bg-primary text-white editorial-shadow font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-primary'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-primary/70'} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer info card */}
        <div className="mt-auto pt-6 border-t border-outline-variant/30 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={adminProfile?.photoUrl?.trim() || DEFAULT_ADMIN_PHOTO}
              alt="Studio Administrator"
              className="w-10 h-10 rounded-full object-cover border border-primary/20 shrink-0"
            />
            <div className="min-w-0">
              <h4 className="font-serif text-xs font-bold text-on-surface truncate">{adminProfile?.name || "Valentina Moretti"}</h4>
              <p className="text-[9px] text-primary tracking-wider uppercase font-semibold">Founder (Admin)</p>
            </div>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant/70 hover:text-primary hover:bg-surface-container-high rounded-full transition-colors shrink-0 cursor-pointer"
              title="Bloquear sesión (Logout)"
              aria-label="Bloquear sesión"
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Header - Mobile */}
      <header className="md:hidden bg-surface-container border-b border-outline-variant/40 px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 safe-top">
        <div className="flex items-center gap-2">
          <img
            src="/favicon.png"
            alt="Beauty Space"
            referrerPolicy="no-referrer"
            className="w-6 h-6 rounded-md shadow-xs object-cover"
          />
          <div className="flex items-center gap-1">
            <span className="font-serif text-xl tracking-wider text-primary font-bold">BEAUTY</span>
            <span className="font-serif text-xl italic text-primary/70 font-light">Space</span>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-primary rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
          aria-label={mobileMenuOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/20 backdrop-blur-xs pt-[57px] safe-top">
          <div className="bg-surface-container-low p-6 border-b border-outline-variant/40 flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-full text-sm font-medium transition-all min-h-[44px] cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white font-semibold'
                        : 'text-on-surface-variant hover:bg-surface-container-high'
                    }`}
                  >
                    <Icon size={18} className={isActive ? 'text-white' : 'text-primary/70'} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <div className="wavy-divider opacity-40"></div>
            <div className="flex items-center justify-between gap-3 px-2">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={adminProfile?.photoUrl?.trim() || DEFAULT_ADMIN_PHOTO}
                  alt="Studio Administrator"
                  className="w-8 h-8 rounded-full object-cover border border-primary/20 shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="font-serif text-xs font-bold text-on-surface truncate">{adminProfile?.name || "Valentina Moretti"}</h4>
                  <p className="text-[9px] text-primary uppercase font-semibold">Founder (Admin)</p>
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-on-surface-variant/70 hover:text-primary hover:bg-surface-container-high rounded-full transition-colors shrink-0 cursor-pointer"
                  title="Bloquear sesión (Logout)"
                  aria-label="Bloquear sesión"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Pane */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 safe-pb">
        {/* Top bar - Desktop only */}
        <header className="hidden md:flex items-center justify-between px-8 py-5 border-b border-outline-variant/30 bg-surface-container-lowest">
          <div>
            <h1 className="font-serif text-[length:var(--text-fluid-h1)] font-semibold capitalize text-on-surface leading-tight">
              {activeTab === 'finanzas' && 'Finanzas Editoriales'}
              {activeTab === 'agenda' && 'Agenda de Citas'}
              {activeTab === 'clientas' && 'Dossier de Clientas'}
              {activeTab === 'servicios' && 'Catálogo de Servicios'}
              {activeTab === 'ajustes' && 'Configuración & Auditoría'}
            </h1>
            <p className="text-xs text-on-surface-variant/75 font-medium mt-0.5">
              Administración y maestría profesional del estudio
            </p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold tracking-wider text-primary bg-surface-container px-3.5 py-1.5 rounded-full uppercase border border-outline-variant/20">
              {todayDateStr}
            </span>
            <div className="w-px h-6 bg-outline-variant/50"></div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sage animate-ping"></span>
              <span className="text-xs text-secondary font-medium uppercase tracking-widest">ESTADO: OPERATIVO</span>
            </div>
          </div>
        </header>

        {/* Content View Container */}
        <div className="flex-1 p-3.5 sm:p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface-container border-t border-outline-variant/40 flex items-center justify-around py-1.5 px-1 backdrop-blur-md safe-bottom">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center flex-1 py-1 px-1 text-center transition-all min-h-[44px] cursor-pointer"
            >
              <div
                className={`p-1.5 sm:p-2 rounded-full transition-all duration-300 ${
                  isActive ? 'bg-primary text-white scale-105' : 'text-on-surface-variant'
                }`}
              >
                <Icon size={18} />
              </div>
              <span
                className={`text-[9px] mt-0.5 tracking-tight ${
                  isActive ? 'text-primary font-bold' : 'text-on-surface-variant/70'
                }`}
              >
                {item.label.split(' ')[0]}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
