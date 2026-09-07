'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-[#EAE5D6] text-[#5C6460] py-16 border-t border-[#C4A265]/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 text-sm">
        <div>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[#2C2C2C] text-[#F5F1E6] flex items-center justify-center font-extrabold text-xs shadow-md shadow-[#2C2C2C]/15">
              C
            </div>
            <span className="font-manifold text-sm tracking-[0.18em] text-[#2C2C2C] uppercase">
              Celeste
            </span>
          </div>
          <p className="text-[#5C6460] text-xs leading-relaxed max-w-xs font-light">
            Authentic India, thoughtfully presented. Each experience handpicked and verified by our team on the ground.
          </p>
        </div>
        <div>
          <h4 className="text-[#347F8C] font-semibold mb-3 text-xs uppercase tracking-[0.18em]">
            Signature Cities
          </h4>
          <ul className="space-y-2.5 text-xs text-[#5C6460]">
            <li><Link href="/cities/mumbai" className="hover:text-[#2C2C2C] transition-colors">Mumbai Coastal & Food</Link></li>
            <li><Link href="/cities/thane" className="hover:text-[#2C2C2C] transition-colors">Thane Lakes & Shrines</Link></li>
            <li><Link href="/cities/navi-mumbai" className="hover:text-[#2C2C2C] transition-colors">Navi Mumbai Flamingo Trails</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-[#347F8C] font-semibold mb-3 text-xs uppercase tracking-[0.18em]">
            Curated Guilds
          </h4>
          <ul className="space-y-2.5 text-xs text-[#5C6460]">
            <li><Link href="/explore?cat=FOOD" className="hover:text-[#2C2C2C] transition-colors">Culinary & Food Trails</Link></li>
            <li><Link href="/explore?cat=WORKSHOPS" className="hover:text-[#2C2C2C] transition-colors">Master Artisan Workshops</Link></li>
            <li><Link href="/explore?cat=CULTURE" className="hover:text-[#2C2C2C] transition-colors">Heritage & Architecture</Link></li>
            <li><Link href="/explore?cat=ADVENTURE" className="hover:text-[#2C2C2C] transition-colors">Highland & Coastal Trails</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-[#347F8C] font-semibold mb-3 text-xs uppercase tracking-[0.18em]">
            Our Promise
          </h4>
          <p className="text-xs text-[#5C6460] leading-relaxed mb-3 font-light">
            Every guide personally vetted. Every route walked. Your data handled with the discretion you&apos;d expect.
          </p>
          <div className="inline-flex items-center gap-2 text-[11px] font-mono text-[#347F8C] bg-white border border-[#D4CFC0] px-3 py-1 rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#A69B80]" />
            Verified & Trusted
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-[#C4A265]/40 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#7C8581] gap-4">
        <span>© {new Date().getFullYear()} Celeste. All rights reserved.</span>
        <div className="flex items-center space-x-6">
          <Link href="/explore" className="hover:text-[#2C2C2C] transition-colors">The Collection</Link>
          <Link href="/#itinerary" className="hover:text-[#2C2C2C] transition-colors">Your Journey</Link>
          <Link href="/provider/portal" className="hover:text-[#2C2C2C] transition-colors">Partner With Us</Link>
        </div>
      </div>
    </footer>
  );
}
