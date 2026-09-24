'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, X, RotateCw, AlertCircle, RefreshCw } from 'lucide-react';

interface LiveCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  onFallbackToFilePicker?: () => void;
}

export function LiveCameraModal({
  isOpen,
  onClose,
  onCapture,
  onFallbackToFilePicker,
}: LiveCameraModalProps) {
  const [hasStream, setHasStream] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHasStream(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopTracks();
    setError(null);
    setIsInitializing(true);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Live camera access is not supported on this browser or connection.');
      setIsInitializing(false);
      return;
    }

    try {
      let mediaStream: MediaStream;
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch {
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      streamRef.current = mediaStream;
      setHasStream(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission blocked by Chrome or Windows Privacy settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera device detected on your system.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera is currently in use by another app (e.g. Google Meet, Zoom, or Windows Camera).');
      } else {
        setError(err.message || 'Could not connect to camera.');
      }
    } finally {
      setIsInitializing(false);
    }
  }, [facingMode, stopTracks]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopTracks();
    }
    return () => {
      stopTracks();
    };
  }, [isOpen, facingMode, startCamera, stopTracks]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const width = video.videoWidth || 1280;
      const height = video.videoHeight || 720;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context unavailable');
      }

      if (facingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setError('Failed to capture photo frame.');
            setIsCapturing(false);
            return;
          }

          const capturedFile = new File(
            [blob],
            `journey-capture-${Date.now()}.jpg`,
            { type: 'image/jpeg' }
          );

          stopTracks();
          onCapture(capturedFile);
          onClose();
        },
        'image/jpeg',
        0.92
      );
    } catch (err: any) {
      setError(err.message || 'Error capturing photo');
      setIsCapturing(false);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
      onClick={() => {
        stopTracks();
        onClose();
      }}
    >
      <div
        className="relative max-w-xl w-full bg-[#1A1A1A] rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-white/10 bg-black/40 text-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-manifold text-sm font-bold uppercase tracking-wider text-white">
                Live Camera Capture
              </h3>
              <p className="text-[10px] font-mono text-white/50">
                Snap a photo directly to your journey album
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleFacingMode}
              title="Switch camera"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                stopTracks();
                onClose();
              }}
              title="Close camera"
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Video Viewfinder */}
        <div className="relative aspect-4/3 w-full bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-8 text-center max-w-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <p className="text-xs text-rose-300 font-mono leading-relaxed">
                {error}
              </p>
              <button
                type="button"
                onClick={startCamera}
                className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white text-xs font-mono font-bold rounded-xl transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  facingMode === 'user' ? 'scale-x-[-1]' : ''
                }`}
              />

              {isInitializing && (
                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                  <div className="text-center text-white space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
                    <p className="text-xs font-mono tracking-wider">Activating Camera...</p>
                  </div>
                </div>
              )}

              {/* Viewfinder frame guide */}
              {hasStream && (
                <div className="pointer-events-none absolute inset-6 border border-white/20 rounded-2xl flex items-center justify-center">
                  <div className="w-12 h-12 border-t border-l border-white/50 absolute top-2 left-2 rounded-tl-lg" />
                  <div className="w-12 h-12 border-t border-r border-white/50 absolute top-2 right-2 rounded-tr-lg" />
                  <div className="w-12 h-12 border-b border-l border-white/50 absolute bottom-2 left-2 rounded-bl-lg" />
                  <div className="w-12 h-12 border-b border-r border-white/50 absolute bottom-2 right-2 rounded-br-lg" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Shutter Controls */}
        <div className="p-5 bg-black/60 border-t border-white/10 flex items-center justify-between px-8 text-white">
          <button
            type="button"
            onClick={() => {
              stopTracks();
              onClose();
            }}
            className="text-xs font-mono text-white/60 hover:text-white transition cursor-pointer"
          >
            Cancel
          </button>

          {/* Shutter Button */}
          <button
            type="button"
            onClick={handleCapture}
            disabled={!hasStream || isInitializing || isCapturing}
            className="cursor-pointer relative w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition disabled:opacity-30 disabled:pointer-events-none shadow-lg"
            title="Take Photo"
          >
            <div className="w-12 h-12 rounded-full bg-white active:bg-amber-400 transition" />
          </button>

          <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">
            {facingMode === 'environment' ? 'Rear' : 'Front'}
          </span>
        </div>
      </div>
    </div>
  );
}
