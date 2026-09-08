'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { API_BASE } from '@/lib/api-client';

export default function AuthRegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'TRAVELER' | 'PROVIDER'>('TRAVELER');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Optional profile fields
  const [homeCity, setHomeCity] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Compute lightweight password strength
  function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
    if (!pwd) return { score: 0, label: '', color: 'bg-transparent' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 4) return { score: 2, label: 'Good', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-600' };
  }

  const strength = getPasswordStrength(password);

  function switchRole(newRole: 'TRAVELER' | 'PROVIDER') {
    setRole(newRole);
    setError(null);
    setSuccess(null);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const payload: Record<string, any> = {
        name: name.trim() || (role === 'PROVIDER' ? 'Host' : 'Traveler'),
        email: email.trim().toLowerCase(),
        password,
        role,
      };

      if (role === 'TRAVELER' && homeCity.trim()) {
        payload.homeCity = homeCity.trim();
      }

      if (role === 'PROVIDER') {
        if (businessName.trim()) payload.businessName = businessName.trim();
        if (phone.trim()) payload.phone = phone.trim();
        if (homeCity.trim()) payload.city = homeCity.trim();
      }

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Registration failed. Please try again.');
      }

      // Auto-login (Option A)
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('userRole', data.user?.role || role);
        localStorage.setItem('userName', data.user?.name || name || 'Traveler');
        localStorage.setItem('userEmail', data.user?.email || email);
        window.dispatchEvent(new Event('auth-change'));
      }

      setSuccess(`Account registered successfully! Welcome, ${data.user?.name || name || 'Traveler'}.`);
      
      setTimeout(() => {
        if (role === 'PROVIDER') {
          router.push('/provider/portal');
        } else {
          router.push('/trip');
        }
      }, 900);
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F1E6] text-[#2C2C2C] pt-24 pb-16 flex items-center justify-center px-4 selection:bg-[#8B7355]/30 selection:text-[#2C2C2C]">
      <div className="w-full max-w-lg bg-white p-8 sm:p-10 rounded-3xl border border-[#D4CFC0] shadow-lg">
        {/* Header */}
        <div className="text-center mb-6">
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
          <h1 className="font-manifold text-2xl tracking-wide uppercase text-[#2C2C2C] font-bold">Create Account</h1>
          <p className="text-xs font-mono text-[#2C2C2C]/70 mt-1 uppercase tracking-wider">
            Join Journi — Smarter journeys. Better choices.
          </p>
        </div>

        {/* Role Toggle */}
        <div className="grid grid-cols-2 gap-1 bg-[#F5F1E6] border border-[#D4CFC0] p-1 rounded-xl mb-6 text-xs font-mono uppercase tracking-wider">
          <button
            type="button"
            onClick={() => switchRole('TRAVELER')}
            className={`py-2 rounded-lg transition ${
              role === 'TRAVELER' ? 'bg-[#347F8C] text-[#F5F1E6] font-bold shadow-sm' : 'text-[#2C2C2C]/70 hover:text-[#2C2C2C]'
            }`}
          >
            Traveler
          </button>
          <button
            type="button"
            onClick={() => switchRole('PROVIDER')}
            className={`py-2 rounded-lg transition ${
              role === 'PROVIDER' ? 'bg-[#347F8C] text-[#F5F1E6] font-bold shadow-sm' : 'text-[#2C2C2C]/70 hover:text-[#2C2C2C]'
            }`}
          >
            Host Guild
          </button>
        </div>

        {/* Error / Success Notifications */}
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

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#2C2C2C]/70 mb-1 font-semibold">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === 'PROVIDER' ? 'Aarav Sharma' : 'Maya Kapoor'}
              className="w-full text-xs font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-xl p-3 text-[#2C2C2C] placeholder-[#2C2C2C]/40 focus:outline-none focus:border-[#347F8C] transition"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#2C2C2C]/70 mb-1 font-semibold">
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

          {/* Conditional Profile Fields */}
          {role === 'TRAVELER' && (
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#2C2C2C]/70 mb-1 font-semibold">
                Home City <span className="text-stone-400 normal-case font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={homeCity}
                onChange={(e) => setHomeCity(e.target.value)}
                placeholder="e.g. Mumbai, Jaipur, Bengaluru"
                className="w-full text-xs font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-xl p-3 text-[#2C2C2C] placeholder-[#2C2C2C]/40 focus:outline-none focus:border-[#347F8C] transition"
              />
            </div>
          )}

          {role === 'PROVIDER' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#2C2C2C]/70 mb-1 font-semibold">
                    Business / Studio Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Old Town Culinary Tours"
                    className="w-full text-xs font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-xl p-3 text-[#2C2C2C] placeholder-[#2C2C2C]/40 focus:outline-none focus:border-[#347F8C] transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#2C2C2C]/70 mb-1 font-semibold">
                    Phone Contact
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full text-xs font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-xl p-3 text-[#2C2C2C] placeholder-[#2C2C2C]/40 focus:outline-none focus:border-[#347F8C] transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#2C2C2C]/70 mb-1 font-semibold">
                  Operating City
                </label>
                <input
                  type="text"
                  value={homeCity}
                  onChange={(e) => setHomeCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className="w-full text-xs font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-xl p-3 text-[#2C2C2C] placeholder-[#2C2C2C]/40 focus:outline-none focus:border-[#347F8C] transition"
                />
              </div>
            </>
          )}

          {/* Password with Strength Indicator */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-mono uppercase tracking-wider text-[#2C2C2C]/70 font-semibold">
                Password
              </label>
              {strength.label && (
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#2C2C2C]/70">
                  Strength: <span className={strength.score === 3 ? 'text-emerald-700' : strength.score === 2 ? 'text-amber-700' : 'text-red-700'}>{strength.label}</span>
                </span>
              )}
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full text-xs font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-xl p-3 text-[#2C2C2C] placeholder-[#2C2C2C]/40 focus:outline-none focus:border-[#347F8C] transition"
            />
            {/* Strength Bar */}
            {password.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                <div className={`h-1.5 rounded-full transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-stone-200'}`} />
                <div className={`h-1.5 rounded-full transition-all duration-300 ${strength.score >= 2 ? strength.color : 'bg-stone-200'}`} />
                <div className={`h-1.5 rounded-full transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-stone-200'}`} />
              </div>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase tracking-wider text-[#2C2C2C]/70 mb-1 font-semibold">
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              className="w-full text-xs font-mono bg-[#F5F1E6]/50 border border-[#D4CFC0] rounded-xl p-3 text-[#2C2C2C] placeholder-[#2C2C2C]/40 focus:outline-none focus:border-[#347F8C] transition"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#347F8C] hover:bg-[#2A6772] text-[#F5F1E6] font-mono font-bold uppercase tracking-wider py-3.5 rounded-xl text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 cursor-pointer mt-2"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[#D4CFC0]/60 text-center">
          <p className="text-xs font-mono text-[#2C2C2C]/70">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-[#347F8C] hover:text-[#2A6772] font-semibold underline underline-offset-2 transition"
            >
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-[10px] font-mono text-[#2C2C2C]/50 mt-4 uppercase tracking-wider">
          Secured with Argon2 Hashing & Postgres Storage
        </p>
      </div>
    </div>
  );
}
