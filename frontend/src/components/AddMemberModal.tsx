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
  const [registeredUsers, setRegisteredUsers] = useState<{ id: string; name: string; email: string; role?: string }[]>([]);
  const [searchResults, setSearchResults] = useState<{ id: string; name: string; email: string; role?: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string; email: string; role?: string } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

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

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    setIsLoggedIn(!!token);

    loadMembers();
    setStatusMessage(null);
    setSearchTerm('');
    setSelectedUser(null);
    loadInitialUsers();
  }, [isOpen, sessionId]);

  async function loadInitialUsers() {
    setIsSearching(true);
    try {
      const results = await searchRegisteredUsers('');
      setRegisteredUsers(results);
      setSearchResults(results);
    } catch {
      setRegisteredUsers([]);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }

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

  // Filter or search registered users as the user types
  useEffect(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) {
      setSearchResults(registeredUsers);
      return;
    }

    // First do instantaneous client-side filter for instant 0ms UI responsiveness
    const instantMatches = registeredUsers.filter(
      (u) => u.name.toLowerCase().includes(trimmed) || u.email.toLowerCase().includes(trimmed),
    );
    setSearchResults(instantMatches);

    // Then debounced query to backend to capture any additional registered users
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchRegisteredUsers(trimmed);
        if (results && results.length > 0) {
          // Merge results
          const seen = new Set<string>();
          const merged: { id: string; name: string; email: string; role?: string }[] = [];
          for (const u of [...results, ...instantMatches]) {
            if (!seen.has(u.id)) {
              seen.add(u.id);
              merged.push(u);
            }
          }
          setSearchResults(merged);
        }
      } catch {
        // Keep instant matches
      } finally {
        setIsSearching(false);
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [searchTerm, registeredUsers]);

  async function handleSendInvite(identifier: string, displayName?: string) {
    if (!identifier.trim()) return;
    setIsInviting(true);
    setStatusMessage(null);

    try {
      await inviteTripMember(sessionId, identifier);
      setStatusMessage({
        text: `Invitation sent successfully to ${displayName || identifier}! A notification has been sent to their notification bell.`,
        type: 'success',
      });
      setSearchTerm('');
      setSelectedUser(null);
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

  function highlightMatch(text: string, query: string) {
    if (!query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-[#347F8C]/20 text-[#2A6772] font-semibold px-0.5 rounded-xs">
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </>
    );
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
                Search registered users by name or email to join your continuous itinerary.
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

        {/* Guest Warning if not logged in */}
        {!isLoggedIn && (
          <div className="p-3.5 rounded-2xl text-xs font-mono bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Guest Mode Active</p>
              <p className="mt-0.5 text-[11px] text-amber-700">
                You must sign in to send invitations and collaborate. Registered users can still be previewed below.
              </p>
              <a
                href={`/auth/login?redirect=/trip/${sessionId}`}
                className="inline-block mt-2 font-bold underline text-amber-900 hover:text-amber-950"
              >
                Sign in to your account &rarr;
              </a>
            </div>
          </div>
        )}

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
            <div className="flex-1">
              <span>{statusMessage.text}</span>
              {statusMessage.text.includes('sign in') && (
                <a
                  href={`/auth/login?redirect=/trip/${sessionId}`}
                  className="block mt-1 font-bold underline text-rose-900"
                >
                  Go to Login &rarr;
                </a>
              )}
            </div>
          </div>
        )}

        {/* Search & Selection Box */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono uppercase tracking-widest text-[#347F8C] font-semibold">
              Search Registered Users
            </label>
            <span className="text-[10px] font-mono text-[#7C8581]">
              {searchTerm.trim()
                ? `${searchResults.length} matching`
                : `${searchResults.length} registered members`}
            </span>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#7C8581] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = selectedUser || searchResults[0];
                  if (target) {
                    handleSendInvite(target.email || target.id, target.name);
                  } else if (searchTerm.trim()) {
                    handleSendInvite(searchTerm.trim(), searchTerm.trim());
                  }
                }
              }}
              placeholder="Type name (e.g. kunal, rohan, aarav, gayatri)..."
              className="w-full bg-white border border-[#D4CFC0] rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#2C2C2C] placeholder:text-[#9A9E9B] focus:outline-hidden focus:border-[#347F8C] focus:ring-1 focus:ring-[#347F8C] transition"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7C8581] hover:text-[#2C2C2C] p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Active Selection Banner */}
          {selectedUser && (
            <div className="p-3 bg-[#347F8C]/10 border border-[#347F8C]/40 rounded-2xl flex items-center justify-between animate-fade-in">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#347F8C] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {selectedUser.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-bold text-[#2C2C2C] truncate">{selectedUser.name}</p>
                    <span className="text-[9px] font-mono text-[#347F8C] bg-[#347F8C]/20 px-1.5 py-0.5 rounded font-bold">
                      Selected
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-[#7C8581] truncate">{selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSendInvite(selectedUser.email || selectedUser.id, selectedUser.name)}
                disabled={isInviting}
                className="bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] text-xs font-mono font-bold uppercase px-3 py-1.5 rounded-lg transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50 shrink-0 ml-2"
              >
                {isInviting ? 'Inviting...' : 'Invite Selected'}
              </button>
            </div>
          )}

          {/* Autocomplete / Registered Users Results */}
          {isSearching && (
            <p className="text-[11px] font-mono text-[#7C8581] animate-pulse">Searching registered members...</p>
          )}

          {searchResults.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#7C8581]">
                {searchTerm.trim() ? 'Matching Members (Click any to select or invite):' : 'Registered Members (Click any to select):'}
              </p>
              <div className="bg-white border border-[#D4CFC0] rounded-2xl overflow-hidden shadow-xs divide-y divide-[#EBE5D8] max-h-56 overflow-y-auto">
                {searchResults.map((u) => {
                  const isAlreadyMember = membersData.members.some(
                    (m) => m.userId === u.id && m.status === 'ACCEPTED',
                  );
                  const isAlreadyInvited = membersData.members.some(
                    (m) => m.userId === u.id && m.status === 'PENDING',
                  );
                  const isSelected = selectedUser?.id === u.id;

                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUser(isSelected ? null : u)}
                      className={`p-3 flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? 'bg-[#347F8C]/15 border-l-4 border-l-[#347F8C]'
                          : 'hover:bg-[#F5F1E6]/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected
                              ? 'bg-[#347F8C] text-white shadow-xs'
                              : 'bg-[#8B7355]/20 text-[#8B7355]'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            u.name?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-[#2C2C2C] truncate">
                              {highlightMatch(u.name, searchTerm.trim())}
                            </p>
                            {u.role && u.role !== 'TRAVELER' && (
                              <span className="text-[9px] font-mono text-[#8B7355] bg-[#8B7355]/10 px-1.5 py-0.5 rounded uppercase">
                                {u.role}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-mono text-[#7C8581] truncate">
                            {highlightMatch(u.email, searchTerm.trim())}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 ml-2 flex items-center gap-2">
                        {isAlreadyMember ? (
                          <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">
                            Joined
                          </span>
                        ) : isAlreadyInvited ? (
                          <span className="text-[10px] font-mono font-semibold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                            Pending
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendInvite(u.email || u.id, u.name);
                            }}
                            disabled={isInviting}
                            className="bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] text-[11px] font-mono font-bold uppercase px-3 py-1.5 rounded-lg transition cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                          >
                            Invite
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : !isSearching && searchTerm.trim() ? (
            <div className="p-4 text-center bg-white rounded-2xl border border-[#D4CFC0] text-xs font-mono text-[#7C8581] space-y-2">
              <p>No registered users found matching &quot;{searchTerm}&quot;.</p>
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-xs text-[#347F8C] underline font-bold cursor-pointer"
              >
                Clear search to view all registered users
              </button>
            </div>
          ) : null}
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
