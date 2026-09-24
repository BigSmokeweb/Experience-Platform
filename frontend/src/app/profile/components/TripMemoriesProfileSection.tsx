'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Camera,
  Upload,
  Calendar,
  MapPin,
  Trash2,
  Maximize2,
  X,
  ExternalLink,
  Loader2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { API_BASE, trySilentRefreshToken } from '@/lib/api-client';
import { LiveCameraModal } from '@/components/LiveCameraModal';

export interface SavedPhotoItem {
  id: string;
  tripMemoryId: string;
  tripTitle: string;
  tripSessionId?: string | null;
  experienceId?: string | null;
  url: string;
  caption?: string | null;
  takenAt?: string | null;
  createdAt: string;
  experience?: {
    id: string;
    title: string;
    city?: string;
    address?: string;
  } | null;
}

export function TripMemoriesProfileSection() {
  const [memories, setMemories] = useState<any[]>([]);
  const [photos, setPhotos] = useState<SavedPhotoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState<SavedPhotoItem | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Upload state
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedMemoryId, setSelectedMemoryId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const fetchMemories = async () => {
    try {
      let token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) {
        setLoading(false);
        return;
      }

      let res = await fetch(`${API_BASE}/trip-memories`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        const refreshed = await trySilentRefreshToken();
        if (refreshed) {
          token = refreshed;
          res = await fetch(`${API_BASE}/trip-memories`, {
            headers: { Authorization: `Bearer ${refreshed}` },
          });
        }
      }

      if (!res.ok) {
        throw new Error('Failed to load saved memories');
      }

      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setMemories(list);

      // Flatten photos across all memories
      const allPhotos: SavedPhotoItem[] = [];
      for (const mem of list) {
        if (Array.isArray(mem.photos)) {
          for (const p of mem.photos) {
            allPhotos.push({
              ...p,
              tripTitle: mem.title || 'Curated Journey',
              tripSessionId: mem.tripSessionId,
            });
          }
        }
      }

      // Sort newest first
      allPhotos.sort(
        (a, b) =>
          new Date(b.takenAt || b.createdAt).getTime() -
          new Date(a.takenAt || a.createdAt).getTime()
      );

      setPhotos(allPhotos);
      if (list.length > 0 && !selectedMemoryId) {
        setSelectedMemoryId(list[0].id);
      }
    } catch (err: any) {
      console.warn('Error fetching trip memories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, []);

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsCameraOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file');
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleClearSelected = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

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
        let { width, height } = img;
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
          canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.85);
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
      reader.readAsDataURL(file);
    });
  };

  const handleSavePhoto = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      let token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) throw new Error('Please sign in to save memories');

      // Ensure active memory ID
      let targetMemId = selectedMemoryId;
      if (!targetMemId) {
        // Auto-create a default memory album
        const createRes = await fetch(`${API_BASE}/trip-memories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: 'My Travel Memories',
            visitedAt: new Date().toISOString(),
          }),
        });
        if (createRes.ok) {
          const created = await createRes.json();
          targetMemId = created.id;
        } else {
          throw new Error('Unable to initialize memory album');
        }
      }

      const compressed = await compressImage(selectedFile);
      const formData = new FormData();
      formData.append('file', compressed, selectedFile.name || 'memory-photo.jpg');
      if (caption.trim()) {
        formData.append('caption', caption.trim());
      }
      formData.append('takenAt', new Date().toISOString());

      let res = await fetch(`${API_BASE}/trip-memories/${targetMemId}/photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401) {
        const refreshed = await trySilentRefreshToken();
        if (refreshed) {
          res = await fetch(`${API_BASE}/trip-memories/${targetMemId}/photos`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${refreshed}` },
            body: formData,
          });
        }
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to save photo');
      }

      handleClearSelected();
      await fetchMemories();
    } catch (err: any) {
      setUploadError(err.message || 'Error saving photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photo: SavedPhotoItem) => {
    if (!confirm('Are you sure you want to delete this saved photo?')) return;
    setIsDeletingId(photo.id);

    try {
      let token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token) {
        await fetch(`${API_BASE}/trip-memories/${photo.tripMemoryId}/photos/${photo.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
      if (activePhoto?.id === photo.id) {
        setActivePhoto(null);
      }
    } catch (err) {
      console.warn('Error deleting photo:', err);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <section className="bg-white/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-neutral-200/80 shadow-sm space-y-6">
      {/* Hidden File / Camera Inputs */}
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
        onCapture={handleCameraCapture}
        onFallbackToFilePicker={() => cameraInputRef.current?.click()}
      />

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Camera className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
              My Trip Memories & Photo Archive
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Photos captured with your camera or uploaded from your device, safely stored in your registered traveler account.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsCameraOpen(true)}
            className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Open Camera</span>
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
          </button>
        </div>
      </div>

      {/* Photo Upload / Review Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isUploading && handleClearSelected()}
        >
          <div
            className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Review & Save Photo</h3>
                  <p className="text-[10px] text-neutral-500 font-mono">
                    Will be saved to your registered traveler account
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearSelected}
                disabled={isUploading}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono">
                {uploadError}
              </div>
            )}

            <div className="relative rounded-2xl overflow-hidden bg-black/5 border border-neutral-200 max-h-72 flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Selected Memory"
                className="max-h-72 w-auto object-contain rounded-xl"
              />
            </div>

            {/* Target Album Selection */}
            {memories.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 block">
                  Save to Album
                </label>
                <select
                  value={selectedMemoryId}
                  onChange={(e) => setSelectedMemoryId(e.target.value)}
                  className="w-full text-xs bg-neutral-50 border border-neutral-300 rounded-xl px-3 py-2 text-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {memories.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title || 'Curated Journey'} ({new Date(m.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Caption */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-700 block">
                Caption / Story (Optional)
              </label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What made this moment unforgettable?"
                rows={2}
                className="w-full text-xs bg-neutral-50 border border-neutral-300 rounded-xl p-3 text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleClearSelected}
                disabled={isUploading}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={isUploading}
                className="cursor-pointer inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Photo...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Save to Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {activePhoto && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setActivePhoto(null)}
        >
          <div
            className="relative max-w-4xl w-full max-h-[92vh] flex flex-col rounded-3xl overflow-hidden bg-neutral-900 border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 px-6 border-b border-white/10 bg-black/50 text-white">
              <div>
                <h4 className="text-sm font-bold text-white">
                  {activePhoto.experience?.title || activePhoto.tripTitle}
                </h4>
                <p className="text-[11px] text-white/60">
                  {activePhoto.takenAt
                    ? new Date(activePhoto.takenAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : new Date(activePhoto.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(activePhoto)}
                  disabled={isDeletingId === activePhoto.id}
                  className="w-8 h-8 rounded-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 flex items-center justify-center transition"
                  title="Delete Photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActivePhoto(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Photo View */}
            <div className="flex-1 flex items-center justify-center bg-black/80 p-4 overflow-hidden">
              <img
                src={activePhoto.url}
                alt={activePhoto.caption || activePhoto.tripTitle}
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl"
              />
            </div>

            {/* Caption & Metadata Footer */}
            <div className="p-4 px-6 bg-black/70 border-t border-white/10 text-white flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1 max-w-md">
                {activePhoto.caption ? (
                  <p className="text-xs text-white/90 italic">&ldquo;{activePhoto.caption}&rdquo;</p>
                ) : (
                  <p className="text-xs text-white/50 italic">No caption added</p>
                )}
                {activePhoto.experience?.city && (
                  <p className="text-[11px] text-amber-400/90 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{activePhoto.experience.city}</span>
                  </p>
                )}
              </div>

              {activePhoto.tripSessionId && (
                <Link
                  href={`/journal/itinerary_${activePhoto.tripSessionId}/memories`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition"
                >
                  <span>View Trip Atelier</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Content State */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <p className="text-xs text-neutral-500 font-mono">Loading saved trip memories...</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="p-8 sm:p-10 rounded-2xl bg-neutral-50/70 border border-dashed border-neutral-200 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <Camera className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-neutral-900">No Saved Photos Yet</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Every photo you take with the live camera or upload during your journeys is linked directly to your registered traveler account and stored securely.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Capture Live Photo</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Upload from Device</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-neutral-500 px-1 font-mono">
            <span>
              {photos.length} {photos.length === 1 ? 'photo' : 'photos'} saved in your profile
            </span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Cloud Synced</span>
            </span>
          </div>

          {/* Photo Gallery Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200/80 shadow-xs hover:shadow-md transition-all aspect-square flex flex-col justify-end"
              >
                {/* Image */}
                <img
                  src={photo.url}
                  alt={photo.caption || photo.tripTitle}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />

                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                {/* Stop / City Tag */}
                {photo.experience?.title && (
                  <div className="absolute top-2 left-2 max-w-[85%] z-10">
                    <span className="inline-block px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] font-medium text-amber-300 truncate max-w-full">
                      📍 {photo.experience.title}
                    </span>
                  </div>
                )}

                {/* Action Buttons on Hover */}
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <button
                    type="button"
                    onClick={() => setActivePhoto(photo)}
                    className="w-7 h-7 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition shadow-xs"
                    title="Enlarge"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo)}
                    disabled={isDeletingId === photo.id}
                    className="w-7 h-7 rounded-full bg-rose-600/80 hover:bg-rose-600 text-white flex items-center justify-center transition shadow-xs"
                    title="Delete"
                  >
                    {isDeletingId === photo.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Caption / Date Footer */}
                <div
                  className="relative p-2.5 text-white z-10 cursor-pointer"
                  onClick={() => setActivePhoto(photo)}
                >
                  {photo.caption ? (
                    <p className="text-xs font-semibold text-white/95 line-clamp-1 leading-snug">
                      {photo.caption}
                    </p>
                  ) : (
                    <p className="text-[11px] text-white/70 line-clamp-1 leading-snug font-medium">
                      {photo.tripTitle}
                    </p>
                  )}
                  <p className="text-[10px] text-white/60 font-mono mt-0.5">
                    {photo.takenAt
                      ? new Date(photo.takenAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : new Date(photo.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
