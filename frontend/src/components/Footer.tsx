'use client';

import Link from 'next/link';
import Image from 'next/image';

const FOOTER_LINK_CLASS = 'hover:text-[#2C2C2C] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#347F8C] rounded';

export function Footer() {
  return (
    <footer className="bg-[#EAE5D6] text-[#5C6460] pt-16 pb-8 border-t border-[#C4A265]/40">
      {/* ── Top Section: Brand + 6 Columns ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-x-8 gap-y-10">

          {/* Brand Column — spans 2 cols on lg */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <div className="flex items-center mb-4">
              <div className="bg-[#FFFDF8] px-2.5 py-1 rounded-xl border border-[#D4CFC0]/60 shadow-xs inline-flex items-center">
                <Image
                  src="/images/Journi-bg-rm.png"
                  alt="Journi"
                  width={130}
                  height={40}
                  className="h-8 w-auto object-contain"
                />
              </div>
            </div>
            <p className="text-xs leading-relaxed max-w-xs font-light text-[#5C6460]">
              Authentic India, thoughtfully presented. Each experience handpicked and verified by our team on the ground.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-mono text-[#347F8C] bg-white border border-[#D4CFC0] px-3 py-1 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#A69B80]" />
              Verified &amp; Trusted
            </div>
          </div>

          {/* Signature Cities */}
          <div>
            <h4 className="text-[#347F8C] font-semibold mb-3 text-xs uppercase tracking-[0.18em]">
              Signature Cities
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link href="/cities/mumbai" className={FOOTER_LINK_CLASS}>Mumbai Coastal &amp; Food</Link></li>
              <li><Link href="/cities/thane" className={FOOTER_LINK_CLASS}>Thane Lakes &amp; Shrines</Link></li>
              <li><Link href="/cities/navi-mumbai" className={FOOTER_LINK_CLASS}>Navi Mumbai Flamingo Trails</Link></li>
              <li><Link href="/cities/powai" className={FOOTER_LINK_CLASS}>Powai Lakeside &amp; Contemporary</Link></li>
              <li><Link href="/cities/panvel" className={FOOTER_LINK_CLASS}>Panvel Heritage Trails</Link></li>
              <li><Link href="/cities/kalyan-dombivli" className={FOOTER_LINK_CLASS}>Kalyan-Dombivli Riverside</Link></li>
            </ul>
          </div>

          {/* Curated Guilds */}
          <div>
            <h4 className="text-[#347F8C] font-semibold mb-3 text-xs uppercase tracking-[0.18em]">
              Curated Guilds
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link href="/explore?cat=FOOD" className={FOOTER_LINK_CLASS}>Culinary &amp; Food Trails</Link></li>
              <li><Link href="/explore?cat=WORKSHOPS" className={FOOTER_LINK_CLASS}>Artisan Workshops</Link></li>
              <li><Link href="/explore?cat=CULTURE" className={FOOTER_LINK_CLASS}>Heritage &amp; Architecture</Link></li>
              <li><Link href="/explore?cat=ADVENTURE" className={FOOTER_LINK_CLASS}>Outdoor &amp; Adventure</Link></li>
              <li><Link href="/explore?cat=HIDDEN_GEMS" className={FOOTER_LINK_CLASS}>Off the Map</Link></li>
              <li><Link href="/explore?cat=NIGHTLIFE" className={FOOTER_LINK_CLASS}>Nightlife &amp; Music</Link></li>
            </ul>
          </div>

          {/* Explore */}
          <div>
            <h4 className="text-[#347F8C] font-semibold mb-3 text-xs uppercase tracking-[0.18em]">
              Explore
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link href="/explore" className={FOOTER_LINK_CLASS}>The Collection</Link></li>
              <li><Link href="/#itinerary" className={FOOTER_LINK_CLASS}>Plan Your Journey</Link></li>
              <li><Link href="/trip" className={FOOTER_LINK_CLASS}>Active Journey</Link></li>
              <li><Link href="/#curated-experiences" className={FOOTER_LINK_CLASS}>Curated Experiences</Link></li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-[#347F8C] font-semibold mb-3 text-xs uppercase tracking-[0.18em]">
              Account
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link href="/auth/login" className={FOOTER_LINK_CLASS}>Log In</Link></li>
              <li><Link href="/auth/register" className={FOOTER_LINK_CLASS}>Sign Up</Link></li>
              <li><Link href="/profile/traveler" className={FOOTER_LINK_CLASS}>Traveller Profile</Link></li>
              <li><Link href="/profile/provider" className={FOOTER_LINK_CLASS}>Partner Profile</Link></li>
              <li><Link href="/provider/portal" className={FOOTER_LINK_CLASS}>Partner Portal</Link></li>
            </ul>
          </div>

          {/* Company + Legal */}
          <div>
            <h4 className="text-[#347F8C] font-semibold mb-3 text-xs uppercase tracking-[0.18em]">
              Company
            </h4>
            <ul className="space-y-2.5 text-xs mb-6">
              <li><Link href="/provider/portal" className={FOOTER_LINK_CLASS}>Partner With Us</Link></li>
            </ul>

            <h4 className="text-[#347F8C] font-semibold mb-3 text-xs uppercase tracking-[0.18em]">
              Legal
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li><Link href="/legal/privacy-policy" className={FOOTER_LINK_CLASS}>Privacy Policy</Link></li>
              <li><Link href="/legal/terms" className={FOOTER_LINK_CLASS}>Terms of Service</Link></li>
              <li><Link href="/legal/cookies" className={FOOTER_LINK_CLASS}>Cookie Policy</Link></li>
              <li><Link href="/legal/accessibility" className={FOOTER_LINK_CLASS}>Accessibility</Link></li>
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom Bar ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-[#C4A265]/40 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#7C8581] gap-4 flex-wrap">
        <span>© {new Date().getFullYear()} Journi. All rights reserved.</span>
        <div className="flex items-center gap-x-5 gap-y-2 flex-wrap justify-center sm:justify-end">
          <Link href="/legal/privacy-policy" className={`${FOOTER_LINK_CLASS} hover:underline`}>Privacy</Link>
          <Link href="/legal/terms" className={`${FOOTER_LINK_CLASS} hover:underline`}>Terms</Link>
          <Link href="/legal/cookies" className={`${FOOTER_LINK_CLASS} hover:underline`}>Cookies</Link>
          <Link href="/legal/accessibility" className={`${FOOTER_LINK_CLASS} hover:underline`}>Accessibility</Link>
          <Link href="/sitemap.xml" className={`${FOOTER_LINK_CLASS} hover:underline`} target="_blank" rel="noopener">Sitemap</Link>
        </div>
      </div>
    </footer>
  );
}
