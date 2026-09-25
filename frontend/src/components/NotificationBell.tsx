'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, X, Compass, Loader2 } from 'lucide-react';
import {
  fetchUserNotifications,
  markNotificationAsRead,
  respondTripInvitation,
  UserNotificationItem,
} from '@/lib/trip-session-store';

interface NotificationBellProps {
  isDarkNav?: boolean;
}

export function NotificationBell({ isDarkNav }: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<UserNotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(loadNotifications, 15000);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  async function loadNotifications() {
    const list = await fetchUserNotifications();
    setNotifications(list);
  }

  async function handleRespond(
    notification: UserNotificationItem,
    action: 'ACCEPT' | 'REJECT',
  ) {
    const sessionId = notification.data?.tripSessionId;
    const invitationId = notification.data?.invitationId;
    if (!sessionId) return;

    setActingId(notification.id);
    try {
      if (invitationId) {
        await respondTripInvitation(sessionId, invitationId, action);
      }
      await markNotificationAsRead(notification.id);
      await loadNotifications();

      if (action === 'ACCEPT') {
        setIsOpen(false);
        router.push(`/trip/${sessionId}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update invitation status.');
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="View notifications"
        className={`relative p-2 rounded-full transition-all duration-200 active:scale-95 border cursor-pointer ${
          isDarkNav
            ? 'border-white/30 text-white hover:bg-white/15 backdrop-blur-sm'
            : 'border-stone-400/60 text-[#2C2C2C] hover:bg-stone-200/50'
        }`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[9px] font-mono font-bold flex items-center justify-center animate-bounce shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-[#FBF9F4] rounded-2xl shadow-2xl border border-[#D4CFC0] p-3 text-[#2C2C2C] z-50 animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-[#D4CFC0]">
            <div className="flex items-center gap-1.5">
              <span className="font-manifold text-xs uppercase tracking-wider font-bold text-[#2C2C2C]">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-[#347F8C]/15 text-[#347F8C] font-semibold">
                  {unreadCount} New
                </span>
              )}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[#2C2C2C]/50 hover:text-[#2C2C2C] p-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-[#7C8581]">
              No notifications yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifications.map((n) => {
                const isInvitation = n.type === 'TRIP_INVITATION';
                const isActing = actingId === n.id;

                return (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border transition ${
                      n.isRead
                        ? 'bg-white/70 border-[#EBE5D8]'
                        : 'bg-white border-[#347F8C]/40 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-[#347F8C]/15 text-[#347F8C] flex items-center justify-center shrink-0 mt-0.5">
                        <Compass className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold text-[#2C2C2C] truncate">
                            {n.title}
                          </p>
                          <span className="text-[9px] font-mono text-[#7C8581]">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5C6460] mt-0.5 leading-relaxed">
                          {n.message}
                        </p>

                        {/* Interactive Accept / Decline for Trip Invitations */}
                        {isInvitation && (
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleRespond(n, 'ACCEPT')}
                              disabled={isActing}
                              className="inline-flex items-center gap-1 bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] text-[10px] font-mono font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition shadow-xs cursor-pointer disabled:opacity-50"
                            >
                              {isActing ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              <span>Accept & View Route</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRespond(n, 'REJECT')}
                              disabled={isActing}
                              className="inline-flex items-center gap-1 bg-white hover:bg-neutral-100 text-rose-700 border border-rose-300 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition cursor-pointer disabled:opacity-50"
                            >
                              <X className="w-3 h-3" />
                              <span>Decline</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
