'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Image as ImageIcon,
  MapPin,
  Calendar,
  Trash2,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Camera,
  Upload,
  Loader2,
  Check,
  Lock,
  UserCheck,
  Plus,
} from 'lucide-react';
import { API_BASE } from '@/lib/api-client';
import { LiveCameraModal } from '@/components/LiveCameraModal';

export interface TripMemoryPhotoItem {
  id: string;
  tripMemoryId: string;
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

interface StopOption {
  id: string;
  title: string;
}

interface TripMemoryGalleryProps {
  memoryId: string;
  photos: TripMemoryPhotoItem[];
  onPhotoDeleted: (photoId: string) => void;
  onOpenUpload?: () => void;
  stops?: StopOption[];
  onPhotoUploaded?: (photo: TripMemoryPhotoItem) => void;
  ensureMemoryId?: () => Promise<string | null>;
}

export function TripMemoryGallery({
  memoryId,
  photos,
  onPhotoDeleted,
  onOpenUpload,
  stops = [],
  onPhotoUploaded,
  ensureMemoryId,
}: TripMemoryGalleryProps) {
  const [filterExperienceId, setFilterExperienceId] = useState<string>('ALL');
  const [activePhotoIdx, setActivePhotoIdx] = useState<number | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Upload & options modals
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedExperienceId, setSelectedExperienceId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Group experiences for filter tabs
  const experiences = Array.from(
    new Map(
      photos
        .filter((p) => p.experience)
        .map((p) => [p.experience!.id, p.experience!])
    ).values()
  );

  const filteredPhotos =
    filterExperienceId === 'ALL'
      ? photos
      : photos.filter((p) => p.experienceId === filterExperienceId);

  const checkAuth = (): boolean => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      setShowAuthModal(true);
      return false;
    }
    return true;
  };

  const handleOpenOptions = () => {
    if (!checkAuth()) return;
    setShowOptionsModal(true);
  };

  const handleTriggerDeviceUpload = () => {
    setShowOptionsModal(false);
    if (!checkAuth()) return;
    fileInputRef.current?.click();
  };

  const handleTriggerCamera = () => {
    setShowOptionsModal(false);
    if (!checkAuth()) return;
    setIsCameraOpen(true);
  };

  const handleCameraCapture = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsCameraOpen(false);
    setShowOptionsModal(false);
  };

  // Compress image client side
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
      setUploadError('Please select a valid image file');
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowOptionsModal(false);
  };

  const handleClearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setCaption('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleSavePhoto = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) {
        throw new Error('Please sign in to save memories to your account');
      }

      let activeMemoryId = memoryId;
      if (!activeMemoryId && ensureMemoryId) {
        const createdId = await ensureMemoryId();
        if (createdId) activeMemoryId = createdId;
      }

      if (!activeMemoryId) {
        throw new Error('Please sign in or refresh your session to save memories to your account.');
      }

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

      const res = await fetch(`${API_BASE}/trip-memories/${activeMemoryId}/photos`, {
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
      if (onPhotoUploaded) {
        onPhotoUploaded(newPhoto);
      }

      handleClearSelectedFile();
    } catch (err: any) {
      setUploadError(err.message || 'Error saving memory photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    setIsDeletingId(photoId);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (token && memoryId) {
        await fetch(`${API_BASE}/trip-memories/${memoryId}/photos/${photoId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      onPhotoDeleted(photoId);
      if (activePhotoIdx !== null) {
        setActivePhotoIdx(null);
      }
    } catch {
      // error handled
    } finally {
      setIsDeletingId(null);
    }
  };

  const currentLightboxPhoto =
    activePhotoIdx !== null ? filteredPhotos[activePhotoIdx] : null;

  return (
    <div className="space-y-6">
      {/* Hidden Native File & Camera Inputs */}
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
        onFallbackToFilePicker={() => fileInputRef.current?.click()}
      />

      {/* Two Options Modal: Device Upload or Open Camera */}
      {showOptionsModal && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowOptionsModal(false)}
        >
          <div
            className="bg-[#FAF7EE] border-2 border-[#D4CFC0] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D4CFC0]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#8B7355]/15 text-[#8B7355] flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-manifold text-base font-bold text-[#2C2C2C] uppercase tracking-wide">
                    Add Trip Photo
                  </h3>
                  <p className="text-[11px] text-[#2C2C2C]/60">
                    Saved to your registered user database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOptionsModal(false)}
                className="w-8 h-8 rounded-full bg-white border border-[#D4CFC0] text-[#2C2C2C] hover:bg-[#F5F1E6] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-1">
              {/* Option 1: Upload from Device */}
              <button
                type="button"
                onClick={handleTriggerDeviceUpload}
                className="cursor-pointer flex items-center gap-4 p-4 rounded-2xl border border-[#347F8C]/40 bg-white hover:bg-[#F5F1E6] hover:border-[#347F8C] transition text-left group active:scale-[0.98] shadow-xs"
              >
                <div className="w-12 h-12 rounded-xl bg-[#347F8C]/10 text-[#347F8C] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-[#2C2C2C] uppercase tracking-wider block">
                    Upload from Device
                  </span>
                  <span className="text-[11px] text-[#2C2C2C]/70 mt-0.5 block">
                    Choose from your photo library or files
                  </span>
                </div>
              </button>

              {/* Option 2: Open Camera */}
              <button
                type="button"
                onClick={handleTriggerCamera}
                className="cursor-pointer flex items-center gap-4 p-4 rounded-2xl border border-[#8B7355]/50 bg-white hover:bg-[#F5F1E6] hover:border-[#8B7355] transition text-left group active:scale-[0.98] shadow-xs"
              >
                <div className="w-12 h-12 rounded-xl bg-[#8B7355]/15 text-[#8B7355] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-[#2C2C2C] uppercase tracking-wider block">
                    Open Camera
                  </span>
                  <span className="text-[11px] text-[#2C2C2C]/70 mt-0.5 block">
                    Capture a live photo with device camera
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Gate Modal (Registered Users Only) */}
      {showAuthModal && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowAuthModal(false)}
        >
          <div
            className="bg-[#FAF7EE] border-2 border-[#8B7355]/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-[#8B7355]/15 text-[#8B7355] flex items-center justify-center mx-auto mb-2">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-manifold text-lg font-bold text-[#2C2C2C] uppercase tracking-wide">
              Registered Traveler Account Required
            </h3>
            <p className="text-xs text-[#2C2C2C]/70 leading-relaxed">
              Trip memory photos are securely stored in our database linked to your registered traveler profile. Sign in or create a free account to upload.
            </p>
            <div className="pt-2 flex flex-col gap-2.5">
              <Link
                href="/auth/login"
                className="cursor-pointer inline-flex items-center justify-center gap-2 bg-[#347F8C] hover:bg-[#2A6772] text-white text-xs font-mono font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition shadow-sm active:scale-95"
              >
                <UserCheck className="w-4 h-4" />
                <span>Sign In to Your Account</span>
              </Link>
              <Link
                href="/auth/register"
                className="cursor-pointer inline-flex items-center justify-center gap-2 bg-white hover:bg-[#F5F1E6] text-[#2C2C2C] border border-[#D4CFC0] text-xs font-mono uppercase tracking-wider px-5 py-2.5 rounded-xl transition"
              >
                <span>Create Free Account</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="text-[11px] font-mono text-[#2C2C2C]/50 hover:text-[#2C2C2C] pt-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview & Save Modal */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => !isUploading && handleClearSelectedFile()}
        >
          <div
            className="bg-white border border-[#D4CFC0] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#D4CFC0]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#8B7355]/15 text-[#8B7355] flex items-center justify-center">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-manifold text-base font-bold text-[#2C2C2C] uppercase tracking-wide">
                    Review & Save Photo
                  </h3>
                  <p className="text-[10px] font-mono text-[#347F8C]">
                    Saved to registered traveler database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClearSelectedFile}
                disabled={isUploading}
                className="w-8 h-8 rounded-full bg-[#FAF7EE] border border-[#D4CFC0] text-[#2C2C2C] hover:bg-[#F5F1E6] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono space-y-1.5">
                <p>{uploadError}</p>
                {(uploadError.toLowerCase().includes('sign in') || uploadError.toLowerCase().includes('expired') || uploadError.toLowerCase().includes('account')) && (
                  <div>
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center gap-1 font-bold underline hover:text-rose-900"
                    >
                      <span>Sign in to your account &rarr;</span>
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Image Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-black/5 border border-[#D4CFC0] max-h-72 flex items-center justify-center">
              <img
                src={previewUrl}
                alt="Selected Memory"
                className="max-h-72 w-auto object-contain rounded-xl"
              />
            </div>

            {/* Tag Itinerary Stop */}
            {stops.length > 0 && (
              <div>
                <label className="block text-[11px] font-mono text-[#2C2C2C]/70 uppercase tracking-wider mb-1 font-semibold">
                  Tag Itinerary Stop (Optional)
                </label>
                <select
                  value={selectedExperienceId}
                  onChange={(e) => setSelectedExperienceId(e.target.value)}
                  className="w-full text-xs font-mono bg-[#FAF7EE] border border-[#D4CFC0] rounded-xl px-3 py-2 text-[#2C2C2C] focus:outline-none focus:border-[#347F8C] transition"
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
            <div>
              <label className="block text-[11px] font-mono text-[#2C2C2C]/70 uppercase tracking-wider mb-1 font-semibold">
                Memory Caption / Note (Optional)
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g. Artisans weaving pashmina shawls..."
                className="w-full text-xs font-mono bg-[#FAF7EE] border border-[#D4CFC0] rounded-xl px-3 py-2 text-[#2C2C2C] focus:outline-none focus:border-[#347F8C] transition"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClearSelectedFile}
                disabled={isUploading}
                className="cursor-pointer text-xs font-mono uppercase tracking-wider text-[#2C2C2C]/70 hover:text-[#2C2C2C] px-4 py-2 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePhoto}
                disabled={isUploading}
                className="cursor-pointer inline-flex items-center gap-2 bg-[#8B7355] hover:bg-[#725E45] text-white text-xs font-mono font-bold uppercase tracking-wider px-6 py-2.5 rounded-xl transition shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to DB...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Photo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 ? (
        <div className="bg-white/80 rounded-3xl p-8 sm:p-10 border border-[#D4CFC0] text-center max-w-xl mx-auto my-8 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#FAF7EE] border border-[#D4CFC0] flex items-center justify-center mx-auto mb-4 text-[#8B7355]">
            <Camera className="w-8 h-8" />
          </div>
          <h4 className="font-cormorant text-2xl sm:text-3xl font-bold text-[#2C2C2C] mb-2">
            No Memories Added Yet
          </h4>
          <p className="text-xs text-[#2C2C2C]/70 font-light leading-relaxed max-w-sm mx-auto mb-6">
            Capture photos of your route, visits, and cultural discoveries to preserve them in your cloud travel album connected to your registered account.
          </p>

          {/* Two Direct Action Buttons: Upload from Device & Open Camera */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleTriggerDeviceUpload}
              className="cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#347F8C] hover:bg-[#2A6772] text-white text-xs font-mono font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition shadow-sm active:scale-95"
            >
              <Upload className="w-4 h-4" />
              <span>Upload from Device</span>
            </button>
            <button
              type="button"
              onClick={handleTriggerCamera}
              className="cursor-pointer w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#8B7355] hover:bg-[#725E45] text-white text-xs font-mono font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition shadow-sm active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>Open Camera</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Toolbar with Add Photo button & Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => setFilterExperienceId('ALL')}
                className={`cursor-pointer text-xs font-mono px-3.5 py-1.5 rounded-xl border transition whitespace-nowrap ${
                  filterExperienceId === 'ALL'
                    ? 'bg-[#347F8C] text-white font-bold border-[#347F8C]'
                    : 'bg-white text-[#2C2C2C] border-[#D4CFC0] hover:bg-[#F5F1E6]'
                }`}
              >
                All Photos ({photos.length})
              </button>
              {experiences.map((exp) => {
                const count = photos.filter((p) => p.experienceId === exp.id).length;
                return (
                  <button
                    key={exp.id}
                    type="button"
                    onClick={() => setFilterExperienceId(exp.id)}
                    className={`cursor-pointer text-xs font-mono px-3.5 py-1.5 rounded-xl border transition whitespace-nowrap ${
                      filterExperienceId === exp.id
                        ? 'bg-[#347F8C] text-white font-bold border-[#347F8C]'
                        : 'bg-white text-[#2C2C2C] border-[#D4CFC0] hover:bg-[#F5F1E6]'
                    }`}
                  >
                    {exp.title} ({count})
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleOpenOptions}
              className="cursor-pointer inline-flex items-center gap-1.5 bg-[#8B7355] hover:bg-[#725E45] text-white text-xs font-mono font-bold uppercase tracking-wider px-4 py-2 rounded-xl transition shadow-xs active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Photo</span>
            </button>
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPhotos.map((photo, idx) => {
              const dateStr = photo.takenAt || photo.createdAt;
              const formattedDate = dateStr
                ? new Date(dateStr).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : '';

              return (
                <div
                  key={photo.id}
                  className="group relative bg-white rounded-2xl overflow-hidden border border-[#D4CFC0] shadow-sm hover:shadow-md transition-all duration-300"
                >
                  {/* Photo Image */}
                  <div
                    className="relative aspect-4/3 overflow-hidden bg-[#FAF7EE] cursor-pointer"
                    onClick={() => setActivePhotoIdx(idx)}
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || 'Trip memory'}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                      <span className="text-white text-xs font-mono flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>View Full</span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this memory photo?')) {
                            handleDeletePhoto(photo.id);
                          }
                        }}
                        disabled={isDeletingId === photo.id}
                        className="cursor-pointer w-7 h-7 rounded-lg bg-black/50 hover:bg-rose-600 text-white flex items-center justify-center transition"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Photo Details */}
                  <div className="p-4 space-y-1.5">
                    {photo.experience && (
                      <div className="flex items-center gap-1 text-[11px] font-mono text-[#347F8C] uppercase tracking-wider font-semibold">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{photo.experience.title}</span>
                      </div>
                    )}

                    {photo.caption && (
                      <p className="text-xs text-[#2C2C2C] font-light leading-relaxed line-clamp-2">
                        {photo.caption}
                      </p>
                    )}

                    {formattedDate && (
                      <div className="flex items-center gap-1 text-[10px] font-mono text-[#7C8581] pt-1">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>{formattedDate}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Lightbox Modal */}
      {currentLightboxPhoto && activePhotoIdx !== null && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-fade-in"
          onClick={() => setActivePhotoIdx(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActivePhotoIdx(null)}
              className="cursor-pointer absolute top-2 right-2 sm:-top-12 sm:right-0 w-9 h-9 rounded-full bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center transition z-10"
              aria-label="Close lightbox"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Prev / Next controls */}
            {filteredPhotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setActivePhotoIdx((prev) =>
                      prev !== null && prev > 0 ? prev - 1 : filteredPhotos.length - 1
                    )
                  }
                  className="cursor-pointer absolute left-2 sm:-left-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center transition z-10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setActivePhotoIdx((prev) =>
                      prev !== null && prev < filteredPhotos.length - 1 ? prev + 1 : 0
                    )
                  }
                  className="cursor-pointer absolute right-2 sm:-right-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center transition z-10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Large Image */}
            <div className="relative max-h-[75vh] w-full flex items-center justify-center overflow-hidden rounded-2xl bg-black/40">
              <img
                src={currentLightboxPhoto.url}
                alt={currentLightboxPhoto.caption || 'Trip memory'}
                className="max-h-[75vh] max-w-full object-contain rounded-xl"
              />
            </div>

            {/* Lightbox Footer Info */}
            <div className="w-full mt-3 px-4 py-3 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-between text-white">
              <div>
                {currentLightboxPhoto.experience && (
                  <p className="text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold">
                    📍 {currentLightboxPhoto.experience.title}
                  </p>
                )}
                <p className="text-sm font-light mt-0.5">
                  {currentLightboxPhoto.caption || 'Trip memory photo'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={currentLightboxPhoto.url}
                  download="memory.jpg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition"
                  title="Download photo"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Delete this memory photo?')) {
                      handleDeletePhoto(currentLightboxPhoto.id);
                    }
                  }}
                  className="p-2 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white transition cursor-pointer"
                  title="Delete photo"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
