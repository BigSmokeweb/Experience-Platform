'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Send, X, Compass, Sparkles, ArrowRight } from 'lucide-react';

const FloatingRobotCanvas = dynamic(
  () => import('./FloatingRobotCanvas').then((mod) => mod.FloatingRobotCanvas),
  { ssr: false }
);
import { API_BASE } from '@/lib/api-client';
import { usePathname } from 'next/navigation';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedAction?: {
    label: string;
    href: string;
  };
}

const CURATED_PROMPTS = [
  'Thane Lake & Shrine Enclaves',
  'Navi Mumbai Flamingo Creek Trail',
  'Colaba Dawn Fisherfolk Walk',
];

export function FloatingChatSupport() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const pathname = usePathname();

  // Vector from bottom-right resting button to top-left header emoji box
  const [flyOffset, setFlyOffset] = useState({ x: -290, y: -418, scale: 0.393 });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Namaste! I am Celene, your Living Heritage Concierge. Looking for a hidden culinary trail, artisan masterclass, or custom route across Mumbai, Thane, or Navi Mumbai?',
      timestamp: 'Just now',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiBoxRef = useRef<HTMLDivElement>(null);
  const restingAnchorRef = useRef<HTMLDivElement>(null);

  // Exact geometric alignment between resting bottom-right mascot and header avatar box
  const calculateOffset = useCallback(() => {
    if (typeof window === 'undefined') return;
    const modalWidth = Math.min(window.innerWidth * 0.92, 384);
    const modalHeight = 510;

    // Resting mascot is bottom-6 right-6, 112px x 112px. Center = (-56px, -56px).
    // Target header box: left=16px, top=14px, size=44px. Center relative to modal bottom-right:
    // X = -modalWidth + 16 + 22 = -modalWidth + 38
    // Y = -modalHeight + 14 + 22 = -modalHeight + 36
    // Delta from resting mascot center:
    const dx = -modalWidth + 38 - (-56); // -modalWidth + 94
    const dy = -modalHeight + 36 - (-56); // -510 + 92 = -418
    const scale = 44 / 112; // 0.3928

    setFlyOffset({ x: Math.round(dx), y: Math.round(dy), scale });
  }, []);

  useEffect(() => {
    calculateOffset();
    window.addEventListener('resize', calculateOffset);
    return () => window.removeEventListener('resize', calculateOffset);
  }, [calculateOffset]);

  // Celene is hidden on the fullscreen hero section of the home page, visible only after scrolling past it
  useEffect(() => {
    if (pathname !== '/') {
      setIsVisible(true);
      return;
    }

    const checkHeroScroll = () => {
      const heroThreshold = Math.min(window.innerHeight * 0.7, 560);
      setIsVisible(window.scrollY > heroThreshold);
    };

    checkHeroScroll();
    window.addEventListener('scroll', checkHeroScroll, { passive: true });
    return () => window.removeEventListener('scroll', checkHeroScroll);
  }, [pathname]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Handle send message
  async function handleSend(customText?: string, e?: React.FormEvent) {
    if (e) e.preventDefault();
    const query = (customText || inputMessage).trim();
    if (!query || isTyping) return;

    const userMsg: ChatMessage = {
      id: 'user-' + Date.now(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsTyping(true);

    try {
      const searchRes = await fetch(
        `${API_BASE}/experiences/search?q=${encodeURIComponent(query)}&limit=3`,
        { headers: { 'Content-Type': 'application/json' } }
      ).catch(() => null);

      let replyText = '';
      let action: { label: string; href: string } | undefined;

      if (searchRes && searchRes.ok) {
        const data = await searchRes.json();
        if (data?.data && data.data.length > 0) {
          const top = data.data[0];
          replyText = `I have verified access for "${top.title}" in ${top.city} (${top.category}, ₹${top.priceMin?.toLocaleString()}–₹${top.priceMax?.toLocaleString()}). Guild authenticity rating is ${Math.round((top.authenticityRating || 0.98) * 100)}%.`;
          action = {
            label: `Inspect ${top.title}`,
            href: `/experiences/${top.id}`,
          };
        }
      }

      if (!replyText) {
        const q = query.toLowerCase();
        if (q.includes('mumbai') || q.includes('colaba') || q.includes('fisherfolk') || q.includes('bombay')) {
          replyText =
            'For Mumbai, I arrange dawn access to Sassoon Dock fisherfolk auctions and the 1930s Art Deco apartment circuit along Oval Maidan.';
          action = { label: 'Explore Mumbai Circuit', href: '/cities/mumbai' };
        } else if (q.includes('thane') || q.includes('upvan') || q.includes('lake')) {
          replyText =
            'In Thane, explore centuries-old lakeside promenades at Upvan, historic Portuguese churches, and sacred shrines in the foothills.';
          action = { label: 'Explore Thane Circuit', href: '/cities/thane' };
        } else if (q.includes('navi') || q.includes('flamingo') || q.includes('panvel')) {
          replyText =
            'In Navi Mumbai and Panvel, we guide dawn mangrove boardwalk trails to spot migratory flamingoes and monsoon fort expeditions.';
          action = { label: 'Explore Navi Mumbai Circuit', href: '/cities/navi-mumbai' };
        } else if (q.includes('itinerary') || q.includes('trip') || q.includes('plan')) {
          replyText =
            'You can compose a seamless continuous journey with verified master craftspeople using our Itinerary Atelier.';
          action = { label: 'Launch Itinerary Atelier', href: '/#itinerary' };
        } else {
          replyText =
            'I maintain direct guild relationships with master sculptors, textile preservers, and culinary lineage keepers across India. Which city or craft calls to you?';
          action = { label: 'Browse Verified Expeditions', href: '/explore' };
        }
      }

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: 'asst-' + Date.now(),
            sender: 'assistant',
            text: replyText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedAction: action,
          },
        ]);
        setIsTyping(false);
      }, 650);
    } catch {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: 'asst-' + Date.now(),
            sender: 'assistant',
            text: 'I can connect you directly with master craftspeople and dawn heritage walks across Mumbai, Thane, and Navi Mumbai.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        setIsTyping(false);
      }, 500);
    }
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 pointer-events-none ${
        isOpen ? 'w-[92vw] sm:w-[384px] h-[510px]' : 'w-28 h-28'
      } ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
      } transition-[opacity,transform] duration-400 ease-out`}
    >
      {/* ─── Static Anchor for Bottom-Right Resting Position ─── */}
      <div
        ref={restingAnchorRef}
        className="absolute bottom-0 right-0 w-28 h-28 pointer-events-none opacity-0 select-none"
      />

      {/* ─── CHAT MODAL (Anchored to Bottom-Right) ─── */}
      <div
        className={`absolute inset-0 bg-white/95 backdrop-blur-xl border border-[#D4CFC0] rounded-3xl shadow-[0_24px_50px_-12px_rgba(29,78,86,0.22)] flex flex-col overflow-hidden transition-all duration-400 ease-out ${
          isOpen
            ? 'opacity-100 pointer-events-auto visible scale-100'
            : 'opacity-0 pointer-events-none invisible scale-95'
        }`}
      >
        {/* Curated Header */}
        <div className="bg-gradient-to-b from-[#1C4D56] to-[#153B42] text-[#F5F1E6] px-4 py-3.5 flex items-center justify-between border-b border-white/10 shadow-sm relative overflow-hidden shrink-0">
          <div className="absolute -top-10 -left-10 w-36 h-36 bg-[#A69B80]/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center gap-3 relative z-10">
            {/* ─── The Header Emoji Box (Landing Destination for Celene) ─── */}
            <div
              ref={emojiBoxRef}
              className="w-11 h-11 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center shrink-0 relative shadow-inner"
              title="Celene 3D Concierge Box"
            >
              {/* Subtle ambient green beacon ring inside the box */}
              <div className="w-2 h-2 rounded-full bg-[#A69B80] opacity-50 animate-ping absolute" />
            </div>

            <div>
              <h4 className="font-manifold text-xs uppercase tracking-[0.18em] font-bold text-[#F5F1E6]">
                Celene Concierge
              </h4>
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#DCE7E5] mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#A69B80] shadow-[0_0_6px_#A69B80]" />
                <span>Heritage Specialist &bull; Live</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center transition cursor-pointer text-[#F5F1E6] active:scale-95 relative z-10"
            title="Minimize concierge"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#FAF7EE]/60 no-scrollbar">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'assistant' && (
                <div className="w-6 h-6 rounded-lg bg-[#347F8C]/15 border border-[#347F8C]/30 text-[#1D4E56] flex-shrink-0 flex items-center justify-center mt-1 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-[#347F8C]" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-4 py-3 text-xs ${
                  m.sender === 'user'
                    ? 'bg-[#275A63] text-[#F5F1E6] rounded-br-xs shadow-sm font-medium'
                    : 'bg-white border border-[#E2DDD1] text-[#2C2C2C] rounded-bl-xs shadow-[0_2px_8px_rgba(62,69,65,0.04)]'
                }`}
              >
                <p className="leading-relaxed font-light">{m.text}</p>

                {m.suggestedAction && (
                  <a
                    href={m.suggestedAction.href}
                    className="mt-3 inline-flex items-center gap-1.5 bg-[#F4EFE6] hover:bg-[#EBE3D7] border border-[#D8D0C0] text-[#1D4E56] font-mono font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded-xl transition-all shadow-2xs group"
                  >
                    <Compass className="w-3 h-3 text-[#347F8C] group-hover:rotate-45 transition-transform" />
                    <span>{m.suggestedAction.label}</span>
                    <ArrowRight className="w-3 h-3 text-[#347F8C]" />
                  </a>
                )}

                <span
                  className={`block text-[9px] font-mono mt-1.5 text-right ${
                    m.sender === 'user' ? 'text-white/60' : 'text-[#7C8581]'
                  }`}
                >
                  {m.timestamp}
                </span>
              </div>
            </div>
          ))}

          {/* Curated Prompt Starters */}
          {messages.length === 1 && (
            <div className="pt-2 pl-8 space-y-1.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#7C8581] block">
                Suggested Curations:
              </span>
              <div className="flex flex-col gap-1.5">
                {CURATED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="text-left bg-white/80 hover:bg-white border border-[#D4CFC0] hover:border-[#347F8C]/60 text-[#2C2C2C] text-[11px] font-medium px-3 py-1.5 rounded-xl transition-all flex items-center justify-between group shadow-2xs"
                  >
                    <span>{prompt}</span>
                    <ArrowRight className="w-3 h-3 text-[#347F8C] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {isTyping && (
            <div className="flex gap-2 items-center text-xs text-[#5C6460] font-mono italic pl-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#347F8C] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#347F8C] animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#347F8C] animate-bounce [animation-delay:0.4s]" />
              <span className="ml-1 text-[10px]">Curating authentic lineages...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => handleSend(undefined, e)}
          className="p-3 bg-white border-t border-[#D4CFC0] flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Inquire about sacred weaves, pol houses..."
            className="flex-1 bg-[#FAF8F2] border border-[#D4CFC0] rounded-xl px-3.5 py-2.5 text-xs text-[#2C2C2C] placeholder-[#7C8581] focus:outline-none focus:border-[#347F8C] transition-colors font-light"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isTyping}
            className="bg-[#347F8C] hover:bg-[#27646E] disabled:opacity-35 text-[#F5F1E6] p-2.5 rounded-xl transition-all active:scale-95 shadow-md shadow-[#347F8C]/20 cursor-pointer disabled:cursor-not-allowed"
            title="Send query"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* ─── CELENE MASCOT: GLIDES SMOOTHLY AND NATURALLY INTO THE HEADER BOX ─── */}
      <div className="pointer-events-auto absolute bottom-0 right-0 w-28 h-28 z-30 flex items-center justify-center select-none">
        {/* Outer Idle Wander (Active only when closed) */}
        <div className={`w-full h-full flex items-center justify-center ${!isOpen ? 'celene-drift' : ''}`}>
          {/* Smooth Organic Flight Trajectory */}
          <div
            style={{
              transform: isOpen
                ? `translate3d(${flyOffset.x}px, ${flyOffset.y}px, 0px) scale(${flyOffset.scale})`
                : 'translate3d(0px, 0px, 0px) scale(1)',
              transition: isOpen
                ? 'transform 650ms cubic-bezier(0.16, 1, 0.3, 1)'
                : 'transform 520ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            className="w-full h-full flex items-center justify-center transform-gpu"
          >
            <FloatingRobotCanvas
              isOpen={isOpen}
              onClick={() => {
                calculateOffset();
                setIsOpen((prev) => !prev);
              }}
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
