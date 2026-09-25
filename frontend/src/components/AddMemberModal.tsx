'use client';

import { useState, useEffect } from 'react';
import { UserPlus, Search, Check, Clock, AlertCircle, X, Users, ShieldCheck } from 'lucide-react';
import {
  searchRegisteredUsers,
  inviteTripMember,
  fetchTripMembers,
  TripMemberInfo,
} from '@/lib/trip-session-store';

interface AddMemberModalProps {
  sessionId: string;
  isOpen: boolean;
  onClose: () => void;
  onMemberUpdated?: () => void;
}

export function AddMemberModal({
  sessionId,
  isOpen,
  onClose,
  onMemberUpdated,
}: AddMemberModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; email: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [membersData, setMembersData] = useState<{
    owner: { id: string; name: string; email: string };
    members: TripMemberInfo[];
  }>({
    owner: { id: '', name: 'Organizer', email: '' },
    members: [],
  });
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    loadMembers();
    setStatusMessage(null);
    setSearchTerm('');
    setSearchResults([]);
  }, [isOpen, sessionId]);

  async function loadMembers() {
    setIsLoadingMembers(true);
    try {
      const data = await fetchTripMembers(sessionId);
      setMembersData(data);
    } catch {
      // ignore
    } finally {
      setIsLoadingMembers(false);
    }
  }

  // Debounced search for registered users
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchRegisteredUsers(searchTerm);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  async function handleSendInvite(identifier: string) {
    if (!identifier.trim()) return;
    setIsInviting(true);
    setStatusMessage(null);

    try {
      await inviteTripMember(sessionId, identifier);
      setStatusMessage({
        text: `Invitation sent successfully to "${identifier}"! They will receive a notification to join.`,
        type: 'success',
      });
      setSearchTerm('');
      setSearchResults([]);
      await loadMembers();
      if (onMemberUpdated) onMemberUpdated();
    } catch (err: any) {
      setStatusMessage({
        text: err.message || 'Failed to send invitation.',
        type: 'error',
      });
    } finally {
      setIsInviting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#FBF9F4] rounded-3xl p-6 sm:p-8 max-w-lg w-full border border-[#D4CFC0] shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#D4CFC0] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#347F8C]/15 text-[#347F8C] flex items-center justify-center border border-[#347F8C]/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-manifold text-lg uppercase tracking-wider font-bold text-[#2C2C2C]">
                Add Travel Member
              </h3>
              <p className="text-xs text-[#5C6460]">
                Invite registered users by username to join your continuous itinerary.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#2C2C2C]/50 hover:text-[#2C2C2C] p-1 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-mono flex items-start gap-2.5 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Search & Invite Box */}
        <div className="space-y-3">
          <label className="block text-xs font-mono uppercase tracking-widest text-[#347F8C] font-semibold">
            Search Registered User
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-[#7C8581] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  handleSendInvite(searchTerm.trim());
                }
              }}
              placeholder="Type username or name (e.g. rohan, aanya)..."
              className="w-full bg-white border border-[#D4CFC0] rounded-xl pl-10 pr-24 py-2.5 text-xs text-[#2C2C2C] placeholder:text-[#9A9E9B] focus:outline-hidden focus:border-[#347F8C] focus:ring-1 focus:ring-[#347F8C] transition"
            />
            {searchTerm.trim() && (
              <button
                type="button"
                onClick={() => handleSendInvite(searchTerm.trim())}
                disabled={isInviting}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] text-[11px] font-mono font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isInviting ? 'Inviting...' : 'Invite'}
              </button>
            )}
          </div>

          {/* Autocomplete Results */}
          {isSearching && (
            <p className="text-[11px] font-mono text-[#7C8581]">Searching registered members...</p>
          )}

          {searchResults.length > 0 && (
            <div className="bg-white border border-[#D4CFC0] rounded-2xl overflow-hidden shadow-sm divide-y divide-[#EBE5D8] max-h-48 overflow-y-auto">
              {searchResults.map((u) => {
                const isAlreadyMember = membersData.members.some(
                  (m) => m.userId === u.id && m.status === 'ACCEPTED',
                );
                const isAlreadyInvited = membersData.members.some(
                  (m) => m.userId === u.id && m.status === 'PENDING',
                );

                return (
                  <div
                    key={u.id}
                    className="p-3 flex items-center justify-between hover:bg-[#F5F1E6]/50 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#8B7355]/20 text-[#8B7355] flex items-center justify-center font-bold text-xs">
                        {u.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#2C2C2C]">{u.name}</p>
                        <p className="text-[10px] font-mono text-[#7C8581]">{u.email}</p>
                      </div>
                    </div>

                    {isAlreadyMember ? (
                      <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                        Joined
                      </span>
                    ) : isAlreadyInvited ? (
                      <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                        Pending
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendInvite(u.name)}
                        disabled={isInviting}
                        className="bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] text-[11px] font-mono font-bold uppercase px-3 py-1.5 rounded-lg transition cursor-pointer shadow-2xs"
                      >
                        Invite
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Current Roster */}
        <div className="space-y-3 pt-2 border-t border-[#D4CFC0]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase tracking-widest text-[#2C2C2C] font-semibold flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#347F8C]" />
              <span>Current Itinerary Companions</span>
            </h4>
            <span className="text-[11px] font-mono text-[#7C8581]">
              {(membersData.members.filter((m) => m.status === 'ACCEPTED').length + 1)} Travelers
            </span>
          </div>

          <div className="space-y-2">
            {/* Organizer */}
            <div className="bg-white border border-[#D4CFC0] rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-[#347F8C] text-white flex items-center justify-center font-bold text-xs">
                  {membersData.owner?.name?.charAt(0).toUpperCase() || 'O'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#2C2C2C]">
                      {membersData.owner?.name || 'Trip Creator'}
                    </span>
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-mono uppercase tracking-wider bg-[#347F8C]/15 text-[#347F8C] px-1.5 py-0.5 rounded-md font-semibold">
                      <ShieldCheck className="w-2.5 h-2.5" />
                      Organizer
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-[#7C8581]">
                    {membersData.owner?.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Invited/Accepted Members */}
            {membersData.members.map((m) => (
              <div
                key={m.id}
                className="bg-white border border-[#D4CFC0] rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-[#8B7355]/20 text-[#8B7355] flex items-center justify-center font-bold text-xs">
                    {m.user?.name?.charAt(0).toUpperCase() || 'M'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#2C2C2C] block">
                      {m.user?.name || 'Member'}
                    </span>
                    <span className="text-[10px] font-mono text-[#7C8581]">
                      {m.user?.email}
                    </span>
                  </div>
                </div>

                <div>
                  {m.status === 'ACCEPTED' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-semibold">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Joined
                    </span>
                  ) : m.status === 'PENDING' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                      <Clock className="w-3 h-3 text-amber-600 animate-pulse" />
                      Invite Pending
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase tracking-wider bg-neutral-100 text-neutral-500 border border-neutral-200 px-2 py-0.5 rounded-md">
                      Declined
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-2 text-center">
          <p className="text-[11px] font-light text-[#5C6460]">
            Accepted members will see their live location dot on the Leaflet map, compute shortest A* routes from their location to stops, and collaborate on stops.
          </p>
        </div>
      </div>
    </div>
  );
}
