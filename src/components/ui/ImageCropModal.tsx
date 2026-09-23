import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, Check, RotateCcw } from 'lucide-react';

export interface ImageCropModalProps {
  imageSrc: string; // Object URL or URL of the selected image
  aspect?: number;  // 1 = square/circular (default)
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  imageSrc,
  onConfirm,
  onCancel,
}) => {
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [frameSize, setFrameSize] = useState<number>(260);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const frameRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const offsetStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Measure crop frame diameter
  useEffect(() => {
    const updateFrameSize = () => {
      if (frameRef.current) {
        const rect = frameRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setFrameSize(rect.width);
        }
      }
    };
    updateFrameSize();
    window.addEventListener('resize', updateFrameSize);
    return () => window.removeEventListener('resize', updateFrameSize);
  }, []);

  // Compute base cover dimensions
  const getBaseDimensions = useCallback(() => {
    if (!naturalSize || frameSize <= 0) return { width: frameSize, height: frameSize };
    const { width: nw, height: nh } = naturalSize;
    const coverScale = Math.max(frameSize / nw, frameSize / nh);
    return {
      width: nw * coverScale,
      height: nh * coverScale,
    };
  }, [naturalSize, frameSize]);

  // Compute maximum allowed offset so the image covers the circle completely
  const getMaxOffset = useCallback((currentZoom: number) => {
    const base = getBaseDimensions();
    const effW = base.width * currentZoom;
    const effH = base.height * currentZoom;
    return {
      x: Math.max(0, (effW - frameSize) / 2),
      y: Math.max(0, (effH - frameSize) / 2),
    };
  }, [getBaseDimensions, frameSize]);

  // Clamp offset helper
  const clampOffset = useCallback((candidate: { x: number; y: number }, currentZoom: number) => {
    const max = getMaxOffset(currentZoom);
    return {
      x: Math.max(-max.x, Math.min(max.x, candidate.x)),
      y: Math.max(-max.y, Math.min(max.y, candidate.y)),
    };
  }, [getMaxOffset]);

  // Re-clamp offset when zoom or frameSize changes
  useEffect(() => {
    setOffset((prev) => clampOffset(prev, zoom));
  }, [zoom, clampOffset]);

  // Pointer drag events
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    offsetStartRef.current = { ...offset };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    const candidate = {
      x: offsetStartRef.current.x + dx,
      y: offsetStartRef.current.y + dy,
    };
    setOffset(clampOffset(candidate, zoom));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored if pointer capture was already released
    }
  };

  const handleReset = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleConfirm = () => {
    if (!imgRef.current || !naturalSize || isProcessing) return;
    setIsProcessing(true);

    try {
      const targetSize = 512;
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      const base = getBaseDimensions();
      const effW = base.width * zoom;
      const effH = base.height * zoom;

      // Top-left of the image in the frame's local coordinate system
      const frameX = (frameSize / 2 + offset.x) - effW / 2;
      const frameY = (frameSize / 2 + offset.y) - effH / 2;

      // Scale from frame coordinates to canvas coordinates (512x512)
      const scale = targetSize / frameSize;
      const canvasX = frameX * scale;
      const canvasY = frameY * scale;
      const canvasW = effW * scale;
      const canvasH = effH * scale;

      ctx.drawImage(imgRef.current, canvasX, canvasY, canvasW, canvasH);

      canvas.toBlob(
        (blob) => {
          setIsProcessing(false);
          if (blob) {
            onConfirm(blob);
          }
        },
        'image/webp',
        0.85
      );
    } catch (err) {
      console.error('Error procesando recorte:', err);
      setIsProcessing(false);
    }
  };

  const base = getBaseDimensions();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end sm:justify-center items-center p-0 sm:p-4">
        {/* Backdrop click dismiss */}
        <div
          className="absolute inset-0 -z-10"
          onClick={onCancel}
          aria-hidden="true"
        />

        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="w-full max-w-md bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[92vh]"
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-outline-variant/20">
            <div>
              <h3 className="font-serif font-bold text-on-surface text-base sm:text-lg">
                Encuadre de foto de perfil
              </h3>
              <p className="text-xs text-on-surface-variant/70">
                Arrastra y haz zoom para ajustar el recorte circular
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="p-1.5 rounded-full text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>
          </div>

          {/* Área de Recorte */}
          <div className="p-4 sm:p-6 flex flex-col items-center justify-center bg-surface-container/40">
            <div
              ref={frameRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="relative w-64 h-64 sm:w-72 sm:h-72 max-w-[70vw] max-h-[70vw] rounded-full overflow-hidden border-2 border-primary shadow-lg bg-surface-container cursor-grab active:cursor-grabbing select-none touch-none"
              title="Arrastra para mover la foto"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Para recortar"
                onLoad={(e) => {
                  const target = e.currentTarget;
                  setNaturalSize({
                    width: target.naturalWidth,
                    height: target.naturalHeight,
                  });
                }}
                style={{
                  width: `${base.width}px`,
                  height: `${base.height}px`,
                  maxWidth: 'none',
                  maxHeight: 'none',
                  transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`,
                  transformOrigin: 'center center',
                }}
                className="absolute top-1/2 left-1/2 pointer-events-none select-none transition-none"
                draggable={false}
              />

              {/* Guía sutil de tercio / centrado */}
              <div className="absolute inset-0 pointer-events-none rounded-full border border-white/30" />
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-15">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>
            </div>

            {/* Ayuda de gesto */}
            <p className="text-[11px] font-medium text-on-surface-variant/60 mt-3">
              Arrastra con el dedo o ratón para centrar tu rostro
            </p>
          </div>

          <div className="w-full h-px bg-outline-variant/20" />

          {/* Controles de Zoom */}
          <div className="p-4 sm:px-6 space-y-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                title="Reducir zoom"
              >
                <ZoomOut size={16} />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.02}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-primary h-1.5 bg-outline-variant/30 rounded-lg appearance-none cursor-pointer"
                aria-label="Control de zoom"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
                title="Aumentar zoom"
              >
                <ZoomIn size={16} />
              </button>
              <span className="text-[11px] font-bold text-on-surface-variant min-w-[36px] text-right">
                {zoom.toFixed(1)}x
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 rounded-lg text-on-surface-variant/70 hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer ml-1"
                title="Restablecer posición y zoom"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={onCancel}
                disabled={isProcessing}
                className="flex-1 py-2.5 px-4 rounded-xl border border-outline-variant/40 bg-surface text-on-surface text-xs font-bold hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={isProcessing}
                className="flex-1 py-2.5 px-4 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <span className="animate-spin text-xs">◌</span> Procesando...
                  </>
                ) : (
                  <>
                    <Check size={14} strokeWidth={2.5} /> Confirmar encuadre
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
