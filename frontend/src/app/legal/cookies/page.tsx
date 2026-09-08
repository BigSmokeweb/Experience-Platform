import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy | Journi',
  description: 'What cookies and browser storage Journi uses — an honest account of what is actually set.',
};

export default function CookiePolicyPage() {
  return (
    <main className="min-h-screen bg-[#F5F1E6] py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="text-xs font-mono text-[#347F8C] uppercase tracking-widest mb-2">Legal</p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-[#2C2C2C] leading-tight mb-4">Cookie Policy</h1>
          <p className="text-sm text-[#5C6460] font-light">Last updated: September 2026</p>
          <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            This is a student hackathon project. This policy is illustrative and does not carry legal force.
          </div>
        </div>

        <div className="space-y-8 text-[#2C2C2C]">
          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">What We Actually Use</h2>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light">
              This page is intentionally honest — we describe only what is actually set on your device when you use Journi, based on a direct audit of the platform. We do not use advertising cookies, tracking pixels, or analytics platforms.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">1. Authentication (Browser localStorage)</h2>
            <div className="bg-white/70 border border-[#D4CFC0] rounded-xl p-4 mt-3">
              <div className="grid grid-cols-3 gap-4 text-xs font-mono text-[#5C6460] mb-2 pb-2 border-b border-[#D4CFC0]">
                <span className="font-semibold text-[#2C2C2C]">Key</span>
                <span className="font-semibold text-[#2C2C2C]">Purpose</span>
                <span className="font-semibold text-[#2C2C2C]">Type</span>
              </div>
              {[
                ['accessToken', 'JWT for authenticated API requests', 'localStorage'],
                ['refreshToken', 'Token refresh on session expiry', 'localStorage'],
                ['userName', 'Display name in navbar', 'localStorage'],
                ['userEmail', 'Reference for profile page', 'localStorage'],
                ['userRole', 'Determines traveller vs provider view', 'localStorage'],
              ].map(([key, purpose, type]) => (
                <div key={key} className="grid grid-cols-3 gap-4 text-xs font-mono text-[#5C6460] py-1.5 border-b border-[#D4CFC0]/50 last:border-0">
                  <span className="text-[#347F8C]">{key}</span>
                  <span className="font-light">{purpose}</span>
                  <span className="text-[#5C6460]/70">{type}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[#5C6460]/70 font-mono mt-2">
              These are stored in browser localStorage (not HTTP cookies). They persist until you log out or clear your browser storage. No expiry is set on the client — JWTs have server-side expiry (typically 15 minutes for access tokens, 7 days for refresh tokens).
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">2. Third-Party Resource Cookies</h2>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light mb-3">
              The following third-party domains load resources when you use Journi. These providers may set their own cookies subject to their own privacy policies:
            </p>
            <div className="space-y-3">
              {[
                {
                  domain: 'fonts.googleapis.com / fonts.gstatic.com',
                  what: 'Google Fonts — typeface delivery (Playfair Display, Cormorant Garamond, JetBrains Mono, etc.)',
                  cookies: 'Google may set standard CDN caching cookies.',
                  purpose: 'Typography rendering',
                },
                {
                  domain: 'unpkg.com',
                  what: 'Leaflet CSS for the interactive Cities map',
                  cookies: 'Standard CDN caching headers; no tracking cookies known.',
                  purpose: 'Map styling',
                },
                {
                  domain: '*.tile.openstreetmap.org / *.basemaps.cartocdn.com',
                  what: 'OpenStreetMap tile images for the Cities map',
                  cookies: 'Standard access logging by OSM/Carto; no personal profiling cookies.',
                  purpose: 'Map tile rendering',
                },
                {
                  domain: 'images.unsplash.com / *.wikimedia.org',
                  what: 'Experience imagery served from public CDNs',
                  cookies: 'Standard CDN caching; no tracking cookies.',
                  purpose: 'Experience images',
                },
              ].map((item) => (
                <div key={item.domain} className="bg-white/70 border border-[#D4CFC0] rounded-xl p-4">
                  <p className="text-xs font-mono text-[#347F8C] font-semibold mb-1">{item.domain}</p>
                  <p className="text-xs text-[#5C6460] font-light">{item.what}</p>
                  <p className="text-xs text-[#5C6460]/80 font-mono mt-1">{item.cookies}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">3. What We Do Not Use</h2>
            <ul className="space-y-2 text-sm text-[#5C6460] font-light list-disc list-inside">
              <li>No advertising or retargeting cookies (Google Ads, Meta Pixel, etc.)</li>
              <li>No analytics cookies (Google Analytics, Hotjar, Mixpanel, etc.)</li>
              <li>No session recording tools</li>
              <li>No cross-site tracking pixels of any kind</li>
            </ul>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">4. Managing Storage</h2>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light">
              To clear Journi&apos;s localStorage data: open your browser&apos;s Developer Tools → Application tab → Local Storage → delete the keys listed above. This will log you out. You can also clear all browser storage via your browser&apos;s settings.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[#C4A265]/30">
          <p className="text-xs font-mono text-[#5C6460]/70">
            © {new Date().getFullYear()} Journi — Student Hackathon Project. This policy is illustrative.
          </p>
        </div>
      </div>
    </main>
  );
}
