import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accessibility | Journi',
  description: 'Journi\'s commitment to accessibility and our efforts to meet WCAG AA standards.',
};

export default function AccessibilityPage() {
  return (
    <main className="min-h-screen bg-[#F5F1E6] py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-10">
          <p className="text-xs font-mono text-[#347F8C] uppercase tracking-widest mb-2">Legal</p>
          <h1 className="font-playfair text-4xl sm:text-5xl text-[#2C2C2C] leading-tight mb-4">Accessibility Statement</h1>
          <p className="text-sm text-[#5C6460] font-light">Last updated: September 2026</p>
          <div className="mt-4 inline-flex items-center gap-2 text-[11px] font-mono text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            This is a student hackathon project. This statement reflects genuine effort, not a formal WCAG audit.
          </div>
        </div>

        <div className="space-y-8 text-[#2C2C2C]">
          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">Our Commitment</h2>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light">
              Journi is built with the intent to be usable by as many people as possible, regardless of ability or technology. We aim to meet WCAG 2.1 Level AA as our target standard.
            </p>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">What We Have Done</h2>
            <ul className="space-y-2.5 text-sm text-[#5C6460] font-light list-disc list-inside">
              <li>
                <strong className="text-[#2C2C2C]">Colour contrast</strong> — foreground/background colour combinations across the platform are designed to meet or exceed WCAG AA contrast ratios (4.5:1 for body text, 3:1 for large text and UI components).
              </li>
              <li>
                <strong className="text-[#2C2C2C]">Semantic HTML</strong> — pages use proper heading hierarchy (single h1, sequential h2/h3), landmark elements (nav, main, footer, section), and ARIA labels where needed.
              </li>
              <li>
                <strong className="text-[#2C2C2C]">Keyboard navigation</strong> — all interactive elements (links, buttons, form fields, dropdowns) are reachable and operable via keyboard. Focus states are visible.
              </li>
              <li>
                <strong className="text-[#2C2C2C]">Image alt text</strong> — all meaningful images have descriptive alt text; decorative images are marked with empty alt attributes.
              </li>
              <li>
                <strong className="text-[#2C2C2C]">Motion preferences</strong> — the scroll-fade animation system checks <code className="text-xs font-mono bg-[#EAE5D6] px-1 rounded">prefers-reduced-motion</code> and disables animations for users who have requested reduced motion in their OS settings.
              </li>
              <li>
                <strong className="text-[#2C2C2C]">Video captions</strong> — the hero background video includes a WebVTT captions track describing the atmospheric content for users who cannot view the video.
              </li>
              <li>
                <strong className="text-[#2C2C2C]">Form labels</strong> — all form inputs have visible labels and appropriate autocomplete attributes.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">Known Limitations</h2>
            <ul className="space-y-2.5 text-sm text-[#5C6460] font-light list-disc list-inside">
              <li>
                The <strong className="text-[#2C2C2C]">3D AI concierge model</strong> (Celene) is rendered via WebGL and is not accessible to screen readers. It falls back to a text-based sparkle icon for users whose browsers do not support WebGL.
              </li>
              <li>
                The <strong className="text-[#2C2C2C]">Leaflet interactive map</strong> in the Cities dropdown has limited keyboard operability — map panning and zooming primarily require mouse/touch interaction.
              </li>
              <li>
                Some experience listing images from third-party sources (Wikimedia) have auto-generated alt text that may not be fully descriptive.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-playfair text-xl text-[#2C2C2C] mb-3">Feedback</h2>
            <p className="text-sm text-[#5C6460] leading-relaxed font-light">
              If you encounter an accessibility barrier while using Journi, please contact us through the Partner Portal or your institution&apos;s project feedback channel. We take these reports seriously and will aim to address them promptly within the constraints of a student project timeline.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-[#C4A265]/30">
          <p className="text-xs font-mono text-[#5C6460]/70">
            © {new Date().getFullYear()} Journi — Student Hackathon Project.
          </p>
        </div>
      </div>
    </main>
  );
}
