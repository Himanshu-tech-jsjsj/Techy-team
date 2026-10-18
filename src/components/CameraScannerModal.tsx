import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Camera, X, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDetected: (payload: string) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onDetected,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingCamera, setLoadingCamera] = useState(true);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameId = useRef<number | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (animFrameId.current) {
      cancelAnimationFrame(animFrameId.current);
      animFrameId.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScannedResult(null);
    setError(null);
  };

  const startCamera = async () => {
    setError(null);
    setLoadingCamera(true);
    setScannedResult(null);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setLoadingCamera(false);
        requestAnimationFrame(tick);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setLoadingCamera(false);
      setError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings to scan QR codes live.'
          : `Unable to access camera: ${err.message || 'Device not found'}`
      );
    }
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animFrameId.current = requestAnimationFrame(tick);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'attemptBoth',
      });

      if (code && code.data) {
        const payload = code.data.trim();
        setScannedResult(payload);
        // Play subtle success chime
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
          osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5
          gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
          osc.start();
          osc.stop(audioCtx.currentTime + 0.2);
        } catch {
          // ignore
        }

        setTimeout(() => {
          stopCamera();
          onDetected(payload);
        }, 600);
        return;
      }
    }

    animFrameId.current = requestAnimationFrame(tick);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Live QR Scanner</h3>
              <p className="text-xs text-slate-500">Hold QR code within the frame</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder area */}
        <div className="relative aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />

          {loadingCamera && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-sm font-medium text-slate-300">Initializing camera feed...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center bg-slate-900 text-white text-center gap-3">
              <AlertCircle className="w-10 h-10 text-rose-400" />
              <p className="text-sm font-semibold text-rose-200">{error}</p>
              <button
                type="button"
                onClick={startCamera}
                className="mt-2 px-4 py-2 text-xs font-semibold bg-white text-slate-900 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Retry Camera
              </button>
            </div>
          )}

          {/* Scanner Overlay Box */}
          {!loadingCamera && !error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative w-64 h-64 border-2 border-emerald-400/80 rounded-2xl shadow-[0_0_0_9999px_rgba(15,23,42,0.55)]">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                {/* Laser scan line animation */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-[scanner_2.2s_ease-in-out_infinite]" />
              </div>
            </div>
          )}

          {/* Scanned Badge */}
          {scannedResult && (
            <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center animate-fade-in">
              <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-2 animate-bounce" />
              <p className="text-lg font-bold">QR Code Captured!</p>
              <p className="text-xs text-emerald-200 mt-1 truncate max-w-xs">{scannedResult}</p>
              <p className="text-xs text-slate-300 mt-3">Running deep security analysis...</p>
            </div>
          )}
        </div>

        {/* Footer instructions */}
        <div className="p-4 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Make sure code is well-lit and steady</span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-700 font-semibold hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
