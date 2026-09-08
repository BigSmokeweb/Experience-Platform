'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { API_BASE } from '@/lib/api-client';

export default function AuthLoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'TRAVELER' | 'PROVIDER'>('TRAVELER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function switchRole(newRole: 'TRAVELER' | 'PROVIDER') {
    setRole(newRole);
    setError(null);
    setSuccess(null);
    setRequiresMfa(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          role,
          mfaCode: mfaCode.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 403 && data.requiresMfa) {
          setRequiresMfa(true);
          setError('6-Digit authenticator code required for this account.');
          setIsLoading(false);
          return;
        }
        throw new Error(data.message || 'Invalid email or password.');
      }

      // Save tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('userRole', data.user?.role || role);
      localStorage.setItem('userName', data.user?.name || (role === 'PROVIDER' ? 'Host' : 'Traveler'));
      localStorage.setItem('userEmail', data.user?.email || email);
      window.dispatchEvent(new Event('auth-change'));

      setSuccess(`Signed in as ${data.user?.name || email}! Redirecting...`);
      setTimeout(() => {
        if (data.user?.role === 'PROVIDER') {
          router.push('/provider/portal');
        } else {
          router.push('/trip');
        }
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F1E6] text-[#2C2C2C] pt-28 pb-20 flex items-center justify-center px-4 selection:bg-[#8B7355]/30 selection:text-[#2C2C2C]">
      <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl border border-[#D4CFC0] shadow-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3 bg-[#FFFDF8] px-3 py-1.5 rounded-xl border border-[#D4CFC0]/60 shadow-xs">
            <Image
              src="/images/journi-logo.jpg"
              alt="Journi"
              width={130}
              height={40}
              priority
              className="h-8 w-auto object-contain"
            />
          </div>
          <h1 className="font-manifold text-2xl tracking-wide uppercase text-[#2C2C2C] font-bold">Sign In</h1>
          <p className="text-xs font-mono text-[#2C2C2C]/70 mt-1 uppercase tracking-wider">
            Access your Journi account
          </p>
        </div>

        {/* Role Toggle */}
        <div className="grid grid-cols-2 gap-1 bg-[#F5F1E6] border border-[#D4CFC0] p-1 rounded-xl mb-6 text-xs font-mono uppercase tracking-wider">
          <button
            type="button"
            onClick={() => switchRole('TRAVELER')}
            className={`py-2 rounded-lg transition ${role === 'TRAVELER' ? 'bg-[#347F8C] text-[#F5F1E6] font-bold shadow-sm' : 'text-[#2C2C2C]/70 hover:text-[#2C2C2C]'}`}
          >
            Traveler
          </button>
          <button
            type="button"
            onClick={() => switchRole('PROVIDER')}
            className={`py-2 rounded-lg transition ${role === 'PROVIDER' ? 'bg-[#347F8C] text-[#F5F1E6] font-bold shadow-sm' : 'text-[#2C2C2C]/70 hover:text-[#2C2C2C]'}`}
          >
            Host Guild
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-mono text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-[#A69B80]/20 border border-[#A69B80]/40 rounded-xl text-xs font-mono text-[#347F8C] font-semibold">
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#2C2C2C]/70 mb-1.5 font-semibold">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full text-xs font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-xl p-3 text-[#2C2C2C] placeholder-[#2C2C2C]/40 focus:outline-none focus:border-[#347F8C] transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#2C2C2C]/70 mb-1.5 font-semibold">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full text-xs font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-xl p-3 text-[#2C2C2C] placeholder-[#2C2C2C]/40 focus:outline-none focus:border-[#347F8C] transition"
            />
          </div>

          {requiresMfa && (
            <div className="bg-[#8B7355]/10 border border-[#8B7355]/30 p-3 rounded-xl">
              <label className="block text-xs font-mono uppercase tracking-wider text-[#347F8C] mb-1 font-semibold">
                6-Digit Authenticator (MFA) Code
              </label>
              <input
                type="text"
                maxLength={6}
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
                placeholder="123456"
                className="w-full text-xs font-mono tracking-widest text-center border border-[#347F8C]/40 rounded-xl p-2.5 focus:outline-none focus:border-[#347F8C] bg-white text-[#2C2C2C]"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] font-mono font-bold uppercase tracking-wider py-3 rounded-xl text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#D4CFC0]/60 text-center">
          <p className="text-xs font-mono text-[#2C2C2C]/70">
            Don&apos;t have an account?{' '}
            <a
              href="/auth/register"
              className="text-[#347F8C] hover:text-[#2A6772] font-semibold underline underline-offset-2 transition"
            >
              Register here
            </a>
          </p>
        </div>

        <p className="text-center text-[10px] font-mono text-[#2C2C2C]/50 mt-4 uppercase tracking-wider">
          Secured with Argon2 & PostgreSQL Storage
        </p>
      </div>
    </div>
  );
}
