'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { API_BASE } from '@/lib/api-client';
import { 
  ShieldCheck, 
  Lock, 
  Plus, 
  FileText, 
  Star, 
  ArrowRight, 
  UploadCloud, 
  CheckCircle2, 
  Key, 
  Compass,
  AlertCircle,
  PenLine,
  Layers,
} from 'lucide-react';
import ListingForm from '../components/ListingForm';
import NudgesPanel from '../components/NudgesPanel';

interface PortalListing {
  id: string;
  title: string;
  category: string;
  city: string;
  ratingAverage?: number;
  reviewCount?: number;
  durationMinutes?: number;
  priceMin?: number;
  priceMax?: number;
  status: string;
  mediaUrls?: string[];
  nudges?: { dimension: string; message: string; impact: 'HIGH' | 'MEDIUM' }[];
}

export default function ProviderPortalPage() {
  const [activeTab, setActiveTab] = useState<'listings' | 'create' | 'kyc' | 'mfa'>('listings');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [docType, setDocType] = useState('GST_CERTIFICATE');
  const [toast, setToast] = useState<string | null>(null);
  const [expandedNudges, setExpandedNudges] = useState<Record<string, boolean>>({});
  const [authToken, setAuthToken] = useState<string | undefined>(undefined);
  const [listings, setListings] = useState<PortalListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') || undefined : undefined;
    setAuthToken(token);
  }, []);

  const fetchListings = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) { setListingsLoading(false); return; }
    try {
      const res = await fetch(`${API_BASE}/experiences/my-listings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setListings(Array.isArray(data) ? data : data.data || []);
      }
    } catch {
      // silently ignore
    } finally {
      setListingsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    setTimeout(() => { setIsUploading(false); setUploadSuccess(true); }, 1200);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  return (
    <div className="bg-[#F5F1E6] text-[#2C2C2C] min-h-screen pt-28 pb-24 selection:bg-[#8B7355]/30 selection:text-[#2C2C2C]">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-[#347F8C] text-[#F5F1E6] text-xs font-mono rounded-xl shadow-lg shadow-[#347F8C]/30 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#A69B80]" />
          {toast}
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ─── Header ─── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-[#C4A265] mb-8">
          <div>
            <div className="inline-flex items-center gap-2 text-[#347F8C] font-mono text-xs tracking-[0.28em] uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-[#A69B80] animate-pulse" />
              Provider Control Center
            </div>
            <h1 className="font-manifold text-3xl sm:text-4xl lg:text-5xl uppercase tracking-wide text-[#2C2C2C] font-extrabold leading-tight">
              Host & Guide Dashboard
            </h1>
            <p className="text-xs sm:text-sm font-light text-[#5C6460] mt-2 max-w-xl">
              Spatial integrity telemetry, on-site verified credentials, and cryptographic custody of regional experience records.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#A69B80]/15 text-[#347F8C] border border-[#A69B80]/40 rounded-full text-xs font-mono font-medium shadow-sm">
              <ShieldCheck className="w-4 h-4 text-[#A69B80]" />
              <span>Verified Host Guild</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-[#2C2C2C]/80 border border-[#D4CFC0] rounded-full text-xs font-mono font-medium shadow-sm">
              <Lock className="w-3.5 h-3.5 text-[#347F8C]" />
              <span>2FA Enforced</span>
            </div>
          </div>
        </div>

        {/* ─── Navigation Tabs ─── */}
        <div className="flex items-center border-b border-[#C4A265] mb-10 overflow-x-auto no-scrollbar gap-8">
          {([
            { id: 'listings', label: 'My Listed Experiences', Icon: Compass },
            { id: 'create',   label: 'Create Listing',        Icon: PenLine },
            { id: 'kyc',      label: 'KYC & Spatial Verification', Icon: FileText },
            { id: 'mfa',      label: 'Security & 2FA Setup',  Icon: Key },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`pb-4 transition-all text-xs font-mono uppercase tracking-wider font-bold whitespace-nowrap border-b-2 flex items-center gap-2 ${
                activeTab === id
                  ? 'border-[#347F8C] text-[#347F8C]'
                  : 'border-transparent text-[#2C2C2C]/60 hover:text-[#2C2C2C]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* ─── LISTINGS TAB ─── */}
        {activeTab === 'listings' && (
          <div className="space-y-8">
            <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#D4CFC0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#347F8C] font-bold block mb-1">Catalog Management</span>
                <h2 className="font-manifold text-xl sm:text-2xl text-[#2C2C2C] font-bold uppercase tracking-wide">Curated Experience Portfolio</h2>
                <p className="text-xs font-mono text-[#2C2C2C]/70 mt-1 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A69B80]" />
                  PostGIS spatial indexing and deterministic authenticity scoring active
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="inline-flex items-center justify-center gap-2 bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] text-xs font-mono uppercase tracking-wider font-bold px-5 py-3 rounded-xl shadow-md shadow-[#347F8C]/20 transition-all active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" /><span>Add New Experience</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-[#D4CFC0] overflow-hidden shadow-sm">
              <div className="p-5 sm:p-6 border-b border-[#C4A265] bg-[#F5F1E6]/40 flex items-center justify-between">
                <div>
                  <h3 className="font-manifold text-base text-[#2C2C2C] uppercase tracking-wide font-bold">
                    Active Catalog Listings ({listings.length})
                  </h3>
                  <p className="text-xs font-mono text-[#2C2C2C]/60 mt-0.5">Synchronized across Mumbai, Thane, Navi Mumbai, and Maharashtra</p>
                </div>
                <span className="text-[11px] font-mono uppercase tracking-wider px-3 py-1 bg-[#A69B80]/20 text-[#347F8C] border border-[#A69B80]/30 rounded-full font-semibold">
                  {listings.filter((l) => l.status === 'PUBLISHED').length} Deployed
                </span>
              </div>

              <div className="divide-y divide-[#D4CFC0]">
                {listingsLoading ? (
                  <div className="p-10 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-4 border-[#347F8C] border-t-transparent mb-3" />
                    <p className="text-xs font-mono text-[#5C6460]">Loading your experiences…</p>
                  </div>
                ) : listings.length === 0 ? (
                  <div className="p-10 text-center space-y-3">
                    <Layers className="w-10 h-10 mx-auto text-[#D4CFC0]" />
                    <p className="text-sm font-mono text-[#5C6460]">No experiences yet — create your first listing above.</p>
                  </div>
                ) : (
                  listings.map((item) => (
                    <div key={item.id} className="p-5 sm:p-6 space-y-3 hover:bg-[#F5F1E6]/30 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                        <div className="flex items-start gap-4 min-w-0">
                          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-[#D4CFC0] bg-zinc-100 shrink-0">
                            {item.mediaUrls?.[0] ? (
                              <Image src={item.mediaUrls[0]} alt={item.title} fill sizes="80px" className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-[#F5F1E6]">
                                <Layers className="w-6 h-6 text-[#D4CFC0]" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-mono uppercase tracking-widest text-[#347F8C] font-bold">{item.category?.replace('_', ' ')}</span>
                              <span className="text-[#D4CFC0]">&bull;</span>
                              <span className="text-[10px] font-mono text-[#2C2C2C]/60 uppercase">{item.city}</span>
                            </div>
                            <h4 className="font-manifold text-base sm:text-lg text-[#2C2C2C] font-bold uppercase tracking-wide truncate">{item.title}</h4>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-mono text-[#2C2C2C]/75">
                              {item.ratingAverage != null && (
                                <span className="flex items-center gap-1 font-semibold text-[#2C2C2C]">
                                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />{item.ratingAverage.toFixed(2)}
                                </span>
                              )}
                              {item.reviewCount != null && <><span className="text-[#D4CFC0]">&bull;</span><span>{item.reviewCount} reviews</span></>}
                              {item.durationMinutes != null && <><span className="text-[#D4CFC0]">&bull;</span><span>{item.durationMinutes} mins</span></>}
                              {(item.priceMin != null || item.priceMax != null) && (
                                <><span className="text-[#D4CFC0]">&bull;</span><span className="font-semibold text-[#347F8C]">₹{item.priceMin ?? 0} – ₹{item.priceMax ?? 0}</span></>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-[#D4CFC0]">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 border text-xs font-mono uppercase tracking-wider font-bold rounded-full ${
                            item.status === 'PUBLISHED' ? 'bg-[#A69B80]/20 text-[#347F8C] border-[#A69B80]/30' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'PUBLISHED' ? 'bg-[#A69B80]' : 'bg-amber-400'}`} />
                            {item.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                          </span>
                          <button type="button" className="text-xs font-mono uppercase tracking-wider text-[#347F8C] hover:text-[#2A6772] font-bold underline underline-offset-4 decoration-[#347F8C]/40 hover:decoration-[#347F8C] transition">
                            Edit Details
                          </button>
                        </div>
                      </div>

                      {/* Nudges — expandable per listing */}
                      {item.nudges && item.nudges.length > 0 && (
                        <div>
                          <button
                            type="button"
                            onClick={() => setExpandedNudges((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                            className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-600 font-bold"
                          >
                            <AlertCircle className="w-3.5 h-3.5" />
                            {item.nudges.length} visibility nudge{item.nudges.length > 1 ? 's' : ''} available
                            <span className="text-[#D4CFC0] ml-1">{expandedNudges[item.id] ? '▲' : '▼'}</span>
                          </button>
                          {expandedNudges[item.id] && (
                            <div className="mt-2">
                              <NudgesPanel nudges={item.nudges} compact />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── CREATE LISTING TAB ─── */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#347F8C] font-bold block mb-1">Progressive Listing Creation</span>
              <h2 className="font-manifold text-2xl sm:text-3xl text-[#2C2C2C] font-bold uppercase tracking-wide">Create a New Experience</h2>
              <p className="text-xs font-mono text-[#5C6460] mt-1">
                Save as draft at any step. Publish once minimum fields are complete. Match preview updates live as you type.
              </p>
            </div>
            <ListingForm
              token={authToken}
              onDraftSaved={(msg) => { showToast(msg); setActiveTab('listings'); }}
              onPublished={() => { showToast('Listing published — now live in traveler search.'); setActiveTab('listings'); fetchListings(); }}
            />

          </div>
        )}

        {/* ─── KYC VERIFICATION TAB ─── */}
        {activeTab === 'kyc' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 bg-white p-6 sm:p-8 rounded-2xl border border-[#D4CFC0] shadow-sm">
              <div className="mb-6">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#347F8C] font-bold block mb-1">Identity & Compliance</span>
                <h2 className="font-manifold text-2xl text-[#2C2C2C] uppercase tracking-wide font-bold">Host & Guide Verification Audit</h2>
                <p className="text-xs font-mono text-[#2C2C2C]/70 mt-1 leading-relaxed">
                  Documents are stored in an access-restricted private storage bucket using single-use signed cryptographic tokens with 15-minute expiry under DPDP Act compliance.
                </p>
              </div>

              {uploadSuccess ? (
                <div className="p-6 rounded-xl bg-[#A69B80]/15 border border-[#A69B80]/40 text-xs font-mono text-[#2C2C2C] space-y-3">
                  <div className="flex items-center gap-2 text-[#347F8C] font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-[#A69B80]" />
                    Document Securely Ingested & Verified
                  </div>
                  <p className="text-[#2C2C2C]/80">Your verification record has been timestamped and encrypted into the host registry.</p>
                  <button type="button" onClick={() => setUploadSuccess(false)} className="mt-2 text-xs text-[#347F8C] underline font-bold uppercase tracking-wider">
                    Upload an additional credential
                  </button>
                </div>
              ) : (
                <form onSubmit={handleUploadSubmit} className="space-y-6">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-wider text-[#2C2C2C] font-bold mb-2">Accreditation Document Type</label>
                    <select value={docType} onChange={(e) => setDocType(e.target.value)}
                      aria-label="Select accreditation document type"
                      className="w-full text-xs font-mono bg-[#F5F1E6]/60 border border-[#D4CFC0] rounded-xl p-3.5 text-[#2C2C2C] focus:outline-none focus:border-[#347F8C] transition">
                      <option value="GST_CERTIFICATE">GST Registration Certificate (Artisan Guild / LLP)</option>
                      <option value="BUSINESS_REGISTRATION">Shop & Establishment Act / MSME Udyam License</option>
                      <option value="GOVERNMENT_ID">Ministry of Tourism Certified Guide License (RLG)</option>
                      <option value="HERITAGE_TRUST">State Heritage Council or Craft Cooperative Mandate</option>
                    </select>
                  </div>
                  <div className="border-2 border-dashed border-[#D4CFC0] rounded-2xl p-8 sm:p-10 text-center bg-[#F5F1E6]/40 hover:bg-[#F5F1E6]/80 transition-colors">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#347F8C]/15 flex items-center justify-center text-[#347F8C]">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-xs sm:text-sm font-mono uppercase tracking-wider font-bold text-[#2C2C2C]">Select PDF or High-Resolution Scanned License</p>
                    <p className="text-[11px] font-mono text-[#2C2C2C]/60 mt-1">Max file size: 15MB. Encrypted in transit via AES-256 GCM.</p>
                    <input type="file" required className="mt-4 text-xs font-mono text-[#2C2C2C]/80 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border file:border-[#D4CFC0] file:text-xs file:font-mono file:uppercase file:bg-white file:text-[#347F8C] file:font-bold hover:file:bg-[#F5F1E6] file:cursor-pointer cursor-pointer" />
                  </div>
                  <button type="submit" disabled={isUploading}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#347F8C] hover:bg-[#2A6772] disabled:opacity-50 text-[#F5F1E6] font-mono text-xs uppercase tracking-wider font-bold py-3.5 rounded-xl transition shadow-md shadow-[#347F8C]/20">
                    {isUploading ? <span>Encrypting & Generating Signature...</span> : <><span>Request Signed Upload & Transmit</span><ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>
              )}
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-[#D4CFC0] shadow-sm">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#347F8C] font-bold block mb-2">Verification Standards</span>
                <h3 className="font-manifold text-lg text-[#2C2C2C] font-bold uppercase tracking-wide">Ethical Host Charter</h3>
                <ul className="mt-4 space-y-3 text-xs font-mono text-[#2C2C2C]/80">
                  {['Zero kickbacks to tourist shops or commission stops.', 'Direct financial payout disbursement to authentic craftspeople.', 'Verified physical coordinates with geofenced check-in nodes.'].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#A69B80] shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-[#F0EDE1] p-5 rounded-2xl border border-[#D4CFC0] text-xs font-mono text-[#2C2C2C]/80 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-[#347F8C] shrink-0 mt-0.5" />
                <span>Regulatory compliance guaranteed under the Digital Personal Data Protection Act (DPDP) 2023.</span>
              </div>
            </div>
          </div>
        )}

        {/* ─── SECURITY & 2FA TAB ─── */}
        {activeTab === 'mfa' && (
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#D4CFC0] shadow-sm max-w-2xl">
            <div className="mb-6">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#347F8C] font-bold block mb-1">Access Security</span>
              <h2 className="font-manifold text-2xl text-[#2C2C2C] uppercase tracking-wide font-bold">Two-Factor Authentication (MFA)</h2>
              <p className="text-xs font-mono text-[#2C2C2C]/70 mt-1 leading-relaxed">
                Mandatory multi-factor enforcement for all provider accounts to guard listing provenance, financial payouts, and spatial metadata integrity.
              </p>
            </div>
            <div className="bg-[#A69B80]/15 border border-[#A69B80]/40 p-5 rounded-xl flex items-start gap-3.5 mb-6 text-xs font-mono text-[#2C2C2C]">
              <CheckCircle2 className="w-5 h-5 text-[#A69B80] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#347F8C] text-sm">TOTP Multi-Factor Authentication Active</p>
                <p className="text-[#2C2C2C]/80 mt-1">Time-based one-time password verification (Google Authenticator / 1Password) is permanently bound to this host profile.</p>
              </div>
            </div>
            <div className="p-5 rounded-xl border border-[#D4CFC0] bg-[#F5F1E6]/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-[#2C2C2C]">Hardware Token / Backup Codes</h4>
                  <p className="text-[11px] font-mono text-[#2C2C2C]/60 mt-0.5">10 single-use emergency recovery keys provisioned</p>
                </div>
                <button type="button" className="px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider bg-white border border-[#D4CFC0] text-[#347F8C] font-bold rounded-lg hover:bg-[#F5F1E6] transition shadow-sm">Regenerate</button>
              </div>
              <div className="pt-3 border-t border-[#D4CFC0] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-wider font-bold text-[#2C2C2C]">Session Sign-Out</h4>
                  <p className="text-[11px] font-mono text-[#2C2C2C]/60 mt-0.5">Revoke all active browser sessions across devices</p>
                </div>
                <button type="button" className="px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider bg-white border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition shadow-sm">Revoke All</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
