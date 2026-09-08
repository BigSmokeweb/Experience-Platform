import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Journi',
  description: 'Terms of Service for the Journi experience discovery platform.',
};

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-[#F5F1E6] py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="text-xs font-mono text-[#347F8C] uppercase tracking-widest mb-2">Legal</p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-[#2C2C2C] leading-tight mb-4">Terms of Service</h1>
          <p className="text-sm text-[#5C6460] font-light">Last updated: September 2026</p>
          <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            This is a student hackathon project. These terms are illustrative and do not carry legal force.
          </div>
        </div>

        <div className="space-y-8 text-[#2C2C2C]">
          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">1. What Journi Is</h2>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light">
              Journi is an experience discovery and itinerary planning platform. It helps travellers discover authentic local experiences across Maharashtra — culinary trails, artisan workshops, heritage walks, and more — and helps experience providers list and showcase their offerings.
            </p>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light mt-3">
              <strong className="text-[#2C2C2C]">Journi is not a booking platform and not a payment processor.</strong> No real financial transactions occur on or through Journi. Any commercial arrangements between travellers and providers happen directly and independently of this platform.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">2. Traveller Responsibilities</h2>
            <ul className="space-y-2 text-sm text-[#5C6460] font-light list-disc list-inside">
              <li>Provide accurate information when creating your account and traveller profile.</li>
              <li>Use the platform only for lawful purposes — discovering and planning real travel experiences.</li>
              <li>Do not attempt to access other users' accounts, scrape the platform, or reverse-engineer the recommendation engine.</li>
              <li>Understand that recommendations are algorithmically generated suggestions — they are not endorsements, and Journi cannot guarantee the quality, safety, or availability of any listed experience.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">3. Provider Responsibilities</h2>
            <ul className="space-y-2 text-sm text-[#5C6460] font-light list-disc list-inside">
              <li>Provide accurate, truthful listings for experiences you actually offer.</li>
              <li>Ensure your experiences comply with all applicable local regulations, permits, and safety standards.</li>
              <li>Respond to KYC verification requests honestly — the verification badge indicates a document submission, not a government licence.</li>
              <li>Do not list fictitious or unavailable experiences to game recommendation scores.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">4. Platform Scope & Limitations</h2>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light">
              Journi provides discovery tools and information on an &quot;as is&quot; basis. We do not guarantee uptime, accuracy of third-party data (e.g., Wikimedia images, OpenStreetMap tiles), or continuous availability of AI-powered recommendations (which depend on external API availability).
            </p>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light mt-3">
              As a student project, the platform may be taken offline or substantially changed at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">5. Intellectual Property</h2>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light">
              The Journi brand, interface design, and original content are the work of the development team. Experience images are sourced from Unsplash and Wikimedia Commons under their respective licences. Provider-submitted content remains the property of the provider.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">6. Account Termination</h2>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light">
              We reserve the right to suspend or delete accounts that violate these terms. Users may delete their account at any time by contacting us.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[#C4A265]/30">
          <p className="text-xs font-mono text-[#5C6460]/70">
            © {new Date().getFullYear()} Journi — Student Hackathon Project. These terms are illustrative.
          </p>
        </div>
      </div>
    </main>
  );
}
