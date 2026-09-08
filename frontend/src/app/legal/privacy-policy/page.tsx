import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Journi',
  description: 'How Journi collects, uses, and protects your personal data in alignment with responsible data practices.',
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#F5F1E6] py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="text-xs font-mono text-[#347F8C] uppercase tracking-widest mb-2">Legal</p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-[#2C2C2C] leading-tight mb-4">Privacy Policy</h1>
          <p className="text-sm text-[#5C6460] font-light">Last updated: September 2026</p>
          <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            This is a student hackathon project. This policy is illustrative and does not carry legal force.
          </div>
        </div>

        <div className="prose prose-sm max-w-none space-y-8 text-[#2C2C2C]">
          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">1. What We Collect</h2>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light">
              When you use Journi, we collect:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[#5C6460] font-light list-disc list-inside">
              <li><strong className="text-[#2C2C2C]">Account information</strong> — name, email address, and password (hashed) when you register.</li>
              <li><strong className="text-[#2C2C2C]">Traveler preferences</strong> — travel vibes, budget preferences, and interests you optionally provide in your profile to power personalised recommendations.</li>
              <li><strong className="text-[#2C2C2C]">Location data</strong> — approximate geolocation (with your explicit browser permission) used only to sort nearby cities and calculate distances. This is processed client-side and is not stored on our servers.</li>
              <li><strong className="text-[#2C2C2C]">Trip session data</strong> — experiences you add to or remove from your itinerary during active journey planning sessions.</li>
              <li><strong className="text-[#2C2C2C]">Usage logs</strong> — standard server-side access logs (IP address, browser type, pages visited) retained for up to 30 days.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">2. How We Use Your Data</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#5C6460] font-light list-disc list-inside">
              <li>To authenticate you and maintain your session securely (JWT tokens, stored in browser localStorage).</li>
              <li>To generate personalised experience recommendations based on your stated preferences.</li>
              <li>To allow experience providers to list and manage their offerings on the platform.</li>
              <li>To improve the platform based on aggregate, anonymised usage patterns.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">3. What We Do Not Do</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#5C6460] font-light list-disc list-inside">
              <li>We do <strong className="text-[#2C2C2C]">not</strong> sell your data to any third party, ever.</li>
              <li>We do <strong className="text-[#2C2C2C]">not</strong> use your data for advertising profiling or retargeting.</li>
              <li>We do <strong className="text-[#2C2C2C]">not</strong> process real payment information — Journi is a discovery platform, not a payment processor.</li>
              <li>We do <strong className="text-[#2C2C2C]">not</strong> share identifiable personal data with experience providers (providers only see aggregate booking interest signals, not individual user identity).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">4. Third-Party Services</h2>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light">
              Journi uses the following third-party services that may set cookies or load resources:
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[#5C6460] font-light list-disc list-inside">
              <li><strong className="text-[#2C2C2C]">Google Fonts</strong> — to load typefaces (Playfair Display, Cormorant Garamond, etc.). Google may log font requests per their standard privacy policy.</li>
              <li><strong className="text-[#2C2C2C]">Leaflet / OpenStreetMap</strong> (via unpkg CDN) — used to render the Cities map. OpenStreetMap tile servers log standard access requests.</li>
              <li><strong className="text-[#2C2C2C]">Unsplash / Wikimedia Commons</strong> — experience images are served from these public CDNs. No personal data is transmitted.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">5. Your Rights</h2>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light">
              You may request deletion of your account and associated data at any time by contacting us. As a student project, data retention follows best-effort practices rather than a formal DPDP-compliant framework — we aim to comply with the spirit of India&apos;s Digital Personal Data Protection Act 2023.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">6. Contact</h2>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light">
              For any privacy-related queries, contact the Journi team via the Partner Portal or through your institution&apos;s project contact channel.
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
