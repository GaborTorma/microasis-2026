import type { Metadata } from "next";
import { privacyContent as c } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Privacy Policy — Guide for MicrOasis 2026",
  description:
    "Privacy policy for the unofficial Guide for MicrOasis 2026 app. No personal data is collected; location is used on-device only and never transmitted.",
};

type Doc = {
  heading: string;
  summary: string;
  sections: { heading: string; body: string }[];
  contact: string;
};

function PolicyDoc({ doc }: { doc: Doc }) {
  return (
    <article>
      <h1 className="font-display text-2xl font-extrabold tracking-wide text-cream">
        {doc.heading}
      </h1>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-cream-dim">
        {doc.summary}
      </p>
      {doc.sections.map((s, i) => (
        <section key={i} className="mt-6">
          <h2 className="font-display text-lg font-bold text-sun">{s.heading}</h2>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-cream-dim">
            {s.body}
          </p>
        </section>
      ))}
      <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-cream-dim">
        {doc.contact}
      </p>
    </article>
  );
}

export default function PrivacyPage() {
  const hu: Doc = {
    heading: "Adatvédelmi szabályzat",
    summary: c.summaryHu,
    sections: c.sections.map((s) => ({ heading: s.headingHu, body: s.bodyHu })),
    contact: c.contactHu,
  };
  const en: Doc = {
    heading: "Privacy Policy",
    summary: c.summaryEn,
    sections: c.sections.map((s) => ({ heading: s.headingEn, body: s.bodyEn })),
    contact: c.contactEn,
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <p className="text-xs uppercase tracking-[0.18em] text-cream-faint">
        Frissítve / Last updated: {c.lastUpdated}
      </p>
      <div className="mt-4">
        <PolicyDoc doc={hu} />
      </div>
      <hr className="my-10 border-line" />
      <div lang="en">
        <PolicyDoc doc={en} />
      </div>
    </div>
  );
}
