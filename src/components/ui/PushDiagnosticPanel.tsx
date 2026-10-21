import React, { useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Key,
  Shield,
  Smartphone,
  Globe,
  Copy,
  Check
} from 'lucide-react';
import { PushDiagnostics } from '../../services/pushService';
import { useToast } from '../Toast';

interface PushDiagnosticPanelProps {
  diagnostics: PushDiagnostics | null;
  running: boolean;
  onRunDiagnostics: () => Promise<PushDiagnostics>;
  onRequestPermission: () => Promise<NotificationPermission>;
}

export const PushDiagnosticPanel: React.FC<PushDiagnosticPanelProps> = ({
  diagnostics,
  running,
  onRunDiagnostics,
  onRequestPermission
}) => {
  const toast = useToast();
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (!diagnostics && !running) {
      onRunDiagnostics().catch(() => {});
    }
  }, [diagnostics, running, onRunDiagnostics]);

  const handleCopyLogs = () => {
    if (!diagnostics?.logs) return;
    navigator.clipboard.writeText(diagnostics.logs.join('\n'));
    setCopied(true);
    toast.success('Registro de diagnóstico copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRequestPerm = async () => {
    try {
      const res = await onRequestPermission();
      if (res === 'granted') {
        toast.success('¡Permiso de notificaciones concedido!');
      } else if (res === 'denied') {
        toast.error('Permiso denegado por el navegador.');
      }
      await onRunDiagnostics();
    } catch (err: any) {
      toast.error(`Error solicitando permiso: ${err?.message}`);
    }
  };

  return (
    <div className="bg-surface-container/40 border border-outline-variant/35 rounded-2xl p-4 sm:p-5 space-y-4 text-xs">
      {/* Header del Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-outline-variant/20">
        <div>
          <h3 className="font-serif text-sm font-bold text-primary flex items-center gap-2">
            <Activity size={16} className="text-primary animate-pulse" />
            Diagnóstico de Entorno y Web Push
          </h3>
          <p className="text-[11px] text-on-surface-variant/70">
            Verificación explícita de permisos del navegador, claves VAPID y compatibilidad de Push API.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onRunDiagnostics()}
          disabled={running}
          className="self-start sm:self-auto px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 rounded-xl font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-[11px]"
        >
          <RefreshCw size={12} className={running ? 'animate-spin' : ''} />
          {running ? 'Analizando...' : 'Volver a diagnosticar'}
        </button>
      </div>

      {running && !diagnostics ? (
        <div className="py-8 text-center text-on-surface-variant/60 flex items-center justify-center gap-2">
          <RefreshCw size={16} className="animate-spin text-primary" />
          <span>Analizando permisos del navegador y claves VAPID...</span>
        </div>
      ) : diagnostics ? (
        <div className="space-y-4">
          {/* Tarjetas de Diagnóstico Rápido */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 1. Permiso de Notificaciones */}
            <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-on-surface flex items-center gap-1.5">
                  <Shield size={14} className="text-primary" /> Permiso del Navegador
                </span>
                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                    diagnostics.notificationPermission === 'granted'
                      ? 'bg-sage/15 text-sage border border-sage/25'
                      : diagnostics.notificationPermission === 'denied'
                      ? 'bg-terracotta/15 text-terracotta border border-terracotta/25'
                      : 'bg-amber-500/15 text-amber-700 border border-amber-500/25'
                  }`}
                >
                  {diagnostics.notificationPermission}
                </span>
              </div>

              <p className="text-[11px] text-on-surface-variant/75 leading-relaxed">
                {diagnostics.notificationPermission === 'granted'
                  ? 'Permiso concedido. El navegador permite mostrar alertas emergentes.'
                  : diagnostics.notificationPermission === 'denied'
                  ? 'Bloqueado en este navegador. Abre el icono 🔒 en la barra de direcciones y selecciona "Permitir notificaciones".'
                  : 'Aún no se ha solicitado el permiso en esta sesión.'}
              </p>

              {diagnostics.notificationPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestPerm}
                  className="w-full mt-1 py-1.5 px-2.5 bg-primary text-white rounded-lg font-bold text-[11px] hover:bg-primary/90 transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Shield size={12} /> Solicitar Permiso Ahora
                </button>
              )}
            </div>

            {/* 2. Soporte Push API */}
            <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-on-surface flex items-center gap-1.5">
                  <Globe size={14} className="text-primary" /> Push API de Navegador
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    diagnostics.isPushSupported
                      ? 'bg-sage/15 text-sage border border-sage/25'
                      : 'bg-terracotta/15 text-terracotta border border-terracotta/25'
                  }`}
                >
                  {diagnostics.isPushSupported ? 'Compatible' : 'Incompatible'}
                </span>
              </div>

              <ul className="space-y-1 text-[11px] text-on-surface-variant/80">
                <li className="flex items-center justify-between">
                  <span>Contexto Seguro (HTTPS):</span>
                  {diagnostics.isSecureContext ? (
                    <span className="text-sage flex items-center gap-1 font-bold"><CheckCircle2 size={12} /> SÍ</span>
                  ) : (
                    <span className="text-terracotta flex items-center gap-1 font-bold"><XCircle size={12} /> NO</span>
                  )}
                </li>
                <li className="flex items-center justify-between">
                  <span>Service Worker API:</span>
                  {diagnostics.hasServiceWorker ? (
                    <span className="text-sage flex items-center gap-1 font-bold"><CheckCircle2 size={12} /> SÍ</span>
                  ) : (
                    <span className="text-terracotta flex items-center gap-1 font-bold"><XCircle size={12} /> NO</span>
                  )}
                </li>
                <li className="flex items-center justify-between">
                  <span>PushManager API:</span>
                  {diagnostics.hasPushManager ? (
                    <span className="text-sage flex items-center gap-1 font-bold"><CheckCircle2 size={12} /> SÍ</span>
                  ) : (
                    <span className="text-terracotta flex items-center gap-1 font-bold"><XCircle size={12} /> NO</span>
                  )}
                </li>
              </ul>
            </div>

            {/* 3. Estado de Llave VAPID */}
            <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[11px] text-on-surface flex items-center gap-1.5">
                  <Key size={14} className="text-primary" /> Clave VAPID Pública
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    diagnostics.vapidKey.isValidFormat
                      ? 'bg-sage/15 text-sage border border-sage/25'
                      : 'bg-terracotta/15 text-terracotta border border-terracotta/25'
                  }`}
                >
                  {diagnostics.vapidKey.isValidFormat ? 'P-256 Válida' : 'Inválida'}
                </span>
              </div>

              <div className="bg-surface-container/60 p-2 rounded-lg font-mono text-[10px] text-on-surface-variant break-all">
                {diagnostics.vapidKey.keyPreview}
              </div>

              <div className="text-[10px] text-on-surface-variant/70 space-y-0.5">
                <p>Longitud: <strong>{diagnostics.vapidKey.rawLength} caracteres</strong> base64url</p>
                <p>Bytes decodificados: <strong>{diagnostics.vapidKey.byteLength ?? 0} bytes</strong> (P-256 estándar)</p>
              </div>
            </div>
          </div>

          {/* Estado de Service Worker y Suscripción */}
          <div className="bg-surface-container-lowest p-3.5 rounded-xl border border-outline-variant/20 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/60 block mb-1">
                Service Worker (/sw.js)
              </span>
              <p className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                {diagnostics.serviceWorker.isRegistered ? (
                  <>
                    <CheckCircle2 size={13} className="text-sage" />
                    Registrado y activo ({diagnostics.serviceWorker.state || 'activo'})
                  </>
                ) : (
                  <>
                    <AlertTriangle size={13} className="text-amber-600" />
                    No registrado en el cliente
                  </>
                )}
              </p>
              {diagnostics.serviceWorker.scope && (
                <p className="text-[10px] text-on-surface-variant/60 font-mono mt-0.5">
                  Scope: {diagnostics.serviceWorker.scope}
                </p>
              )}
            </div>

            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/60 block mb-1">
                Suscripción Activa en este Equipo
              </span>
              <p className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                {diagnostics.subscription.isSubscribed ? (
                  <>
                    <CheckCircle2 size={13} className="text-sage" />
                    Suscrito • {diagnostics.subscription.endpointDomain || 'Servidor Push'}
                  </>
                ) : (
                  <>
                    <Smartphone size={13} className="text-on-surface-variant/50" />
                    Sin suscripción activa
                  </>
                )}
              </p>
              {diagnostics.subscription.endpoint && (
                <p className="text-[10px] text-on-surface-variant/60 font-mono truncate mt-0.5">
                  {diagnostics.subscription.endpoint}
                </p>
              )}
            </div>
          </div>

          {/* Advertencias de Entorno Específico (PC, Incógnito, Brave) */}
          {(diagnostics.environment.isIncognitoEstimate || diagnostics.environment.isBrave) && (
            <div className="bg-amber-500/10 border border-amber-500/25 p-3 rounded-xl space-y-1 text-amber-900">
              <div className="flex items-center gap-1.5 font-bold text-[11px]">
                <AlertTriangle size={14} className="text-amber-700" />
                <span>Advertencia de compatibilidad del entorno</span>
              </div>
              {diagnostics.environment.isIncognitoEstimate && (
                <p className="text-[11px] leading-relaxed">
                  • <strong>Modo Incógnito / Privado detectado:</strong> Los navegadores Chromium (Chrome, Edge) y Firefox bloquean deliberadamente las notificaciones Push en navegación privada arrojando el error <code>Registration failed - push service error</code>. Abre la aplicación en una pestaña normal para habilitarlas.
                </p>
              )}
              {diagnostics.environment.isBrave && (
                <p className="text-[11px] leading-relaxed">
                  • <strong>Navegador Brave detectado:</strong> Brave bloquea los servidores de mensajería push por defecto. Debes abrir <code>brave://settings/privacy</code> y activar la opción <em>"Usar servicios de Google para mensajería push"</em>.
                </p>
              )}
            </div>
          )}

          {/* Consola de Registros de Verificación */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant/60 flex items-center gap-1">
                <Activity size={12} /> Registro de eventos del diagnóstico (Logs)
              </span>
              <button
                type="button"
                onClick={handleCopyLogs}
                className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check size={11} className="text-sage" /> : <Copy size={11} />}
                {copied ? 'Copiado' : 'Copiar registros'}
              </button>
            </div>

            <div className="bg-[#1e1e1e] text-emerald-400 p-3 rounded-xl font-mono text-[10.5px] max-h-40 overflow-y-auto space-y-1 border border-black/40 selection:bg-emerald-800">
              {diagnostics.logs.map((log, index) => (
                <div key={index} className="leading-relaxed">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
