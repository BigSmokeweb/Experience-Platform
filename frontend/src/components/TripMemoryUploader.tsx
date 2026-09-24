'use client';

import { useState, useRef } from 'react';
import { Camera, Upload, Image as ImageIcon, X, Check, Loader2, Sparkles } from 'lucide-react';
import { API_BASE } from '@/lib/api-client';
import { LiveCameraModal } from './LiveCameraModal';

interface StopOption {
  id: string;
  title: string;
}

interface TripMemoryUploaderProps {
  memoryId: string;
  stops: StopOption[];
  preselectedExperienceId?: string;
  onPhotoUploaded: (photo: any) => void;
}

export function TripMemoryUploader({
  memoryId,
  stops,
  preselectedExperienceId,
  onPhotoUploaded,
}: TripMemoryUploaderProps) {
  const [selectedExperienceId, setSelectedExperienceId] = useState<string>(
    preselectedExperienceId || (stops[0]?.id || '')
  );
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Compress image on client using canvas to keep upload fast and reliable
  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const maxWidth = 1920;
        const maxHeight = 1080;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              resolve(blob || file);
            },
            'image/jpeg',
            0.85
          );
        } else {
          resolve(file);
        }
      };

      img.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async () => {
    if (!selectedFile || !memoryId) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) {
        throw new Error('Please sign in to save memories to your account');
      }

      // Compress client-side
      const compressedBlob = await compressImage(selectedFile);
      const formData = new FormData();
      formData.append('file', compressedBlob, selectedFile.name || 'memory.jpg');
      if (selectedExperienceId) {
        formData.append('experienceId', selectedExperienceId);
      }
      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }
      formData.append('takenAt', new Date().toISOString());

      const res = await fetch(`${API_BASE}/trip-memories/${memoryId}/photos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to upload photo');
      }

      const newPhoto = await res.json();
      onPhotoUploaded(newPhoto);

      // Reset form
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    } catch (err: any) {
      setErrorMessage(err.message || 'Error uploading memory photo');
    } finally {
      setIsUploading(false);
    }
  };

  const clearSelection = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D4CFC0] shadow-sm">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#D4CFC0]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#8B7355]/15 text-[#8B7355] flex items-center justify-center">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-manifold text-base sm:text-lg font-bold text-[#2C2C2C] uppercase tracking-wide">
              Add Trip Memory
            </h3>
            <p className="text-xs text-[#2C2C2C]/60">
              Capture or upload photos for your finalized route
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-[#347F8C] bg-[#347F8C]/10 px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold">
          Cloud Synced
        </span>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
          {errorMessage}
        </div>
      )}

      {/* Hidden inputs for File and Camera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Live Camera Viewfinder Modal */}
      <LiveCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(file) => {
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
          setIsCameraOpen(false);
        }}
        onFallbackToFilePicker={() => cameraInputRef.current?.click()}
      />

      {!previewUrl ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Camera Capture Button */}
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="cursor-pointer flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-[#8B7355]/50 bg-[#FAF7EE] hover:bg-[#F5F1E6] hover:border-[#8B7355] transition text-center group active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6 text-[#8B7355]" />
              </div>
              <span className="font-mono text-xs font-bold text-[#2C2C2C] uppercase tracking-wider block">
                Take Photo
              </span>
              <span className="text-[11px] text-[#2C2C2C]/60 mt-1">
                Use your device camera
              </span>
            </button>

            {/* Device File Picker Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-[#347F8C]/40 bg-[#F5F1E6]/40 hover:bg-[#F5F1E6] hover:border-[#347F8C] transition text-center group active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xs flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6 text-[#347F8C]" />
              </div>
              <span className="font-mono text-xs font-bold text-[#2C2C2C] uppercase tracking-wider block">
                Upload from Device
              </span>
              <span className="text-[11px] text-[#2C2C2C]/60 mt-1">
                Select from photo gallery
              </span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Image Preview & Details */}
          <div className="relative rounded-2xl overflow-hidden bg-black/5 border border-[#D4CFC0] max-h-80 flex items-center justify-center">
            <img
              src={previewUrl}
              alt="Memory preview"
              className="max-h-80 w-auto object-contain rounded-xl"
            />
            <button
              type="button"
              onClick={clearSelection}
              className="cursor-pointer absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition"
              title="Cancel selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tag Itinerary Stop */}
            {stops.length > 0 && (
              <div>
                <label className="block text-[11px] font-mono text-[#2C2C2C]/70 uppercase tracking-wider mb-1.5 font-semibold">
                  Tag Itinerary Stop
                </label>
                <select
                  value={selectedExperienceId}
                  onChange={(e) => setSelectedExperienceId(e.target.value)}
                  className="w-full text-xs font-mono bg-[#FAF7EE] border border-[#D4CFC0] rounded-xl px-3 py-2.5 text-[#2C2C2C] focus:outline-none focus:border-[#347F8C] transition"
                >
                  <option value="">General Trip Photo</option>
                  {stops.map((stop, idx) => (
                    <option key={stop.id} value={stop.id}>
                      Stop {idx + 1}: {stop.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Caption */}
            <div className={stops.length > 0 ? '' : 'sm:col-span-2'}>
              <label className="block text-[11px] font-mono text-[#2C2C2C]/70 uppercase tracking-wider mb-1.5 font-semibold">
                Memory Caption / Note
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Artisans weaving pashmina shawls..."
                className="w-full text-xs font-mono bg-[#FAF7EE] border border-[#D4CFC0] rounded-xl px-3 py-2.5 text-[#2C2C2C] focus:outline-none focus:border-[#347F8C] transition"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={clearSelection}
              disabled={isUploading}
              className="cursor-pointer text-xs font-mono uppercase tracking-wider text-[#2C2C2C]/70 hover:text-[#2C2C2C] px-4 py-2.5 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="cursor-pointer inline-flex items-center gap-2 bg-[#8B7355] hover:bg-[#725E45] text-white text-xs font-mono font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Memory...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Memory</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
