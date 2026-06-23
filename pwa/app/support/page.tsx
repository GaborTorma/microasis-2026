import type { Metadata } from "next";
import { supportContent as c } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Support — Guide for MANAS 2026",
  description:
    "Help and contact for the unofficial Guide for MANAS 2026 app: how to use the timetable, the Now view, the Apple Watch app, offline use and the nearest-stage location feature.",
};

type Doc = {
  heading: string;
  intro: string;
  aboutHeading: string;
  about: string;
  faqHeading: string;
  faq: { q: string; a: string }[];
};

function SupportDoc({ doc, email }: { doc: Doc; email: string }) {
  return (
    <article>
      <h1 className="font-display text-2xl font-extrabold tracking-wide text-cream">
        {doc.heading}
      </h1>
      <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-cream-dim">
        {doc.intro}
      </p>

      <section className="mt-6">
        <h2 className="font-display text-lg font-bold text-sun">{doc.aboutHeading}</h2>
        <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-cream-dim">
          {doc.about}
        </p>
      </section>

      <section className="mt-6">
        <h2 className="font-display text-lg font-bold text-sun">{doc.faqHeading}</h2>
        <dl className="mt-2 space-y-4">
          {doc.faq.map((f, i) => (
            <div key={i}>
              <dt className="font-semibold text-cream">{f.q}</dt>
              <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-cream-dim">
                {f.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-6 text-sm text-cream-dim">
        <a
          href={`mailto:${email}`}
          className="font-semibold text-sun underline-offset-2 hover:underline"
        >
          {email}
        </a>
      </p>
    </article>
  );
}

export default function SupportPage() {
  const hu: Doc = {
    heading: "Támogatás",
    intro: c.introHu,
    aboutHeading: "Mi ez az alkalmazás?",
    about: c.aboutHu,
    faqHeading: "Gyakori kérdések",
    faq: c.faq.map((f) => ({ q: f.qHu, a: f.aHu })),
  };
  const en: Doc = {
    heading: "Support",
    intro: c.introEn,
    aboutHeading: "What is this app?",
    about: c.aboutEn,
    faqHeading: "Frequently asked questions",
    faq: c.faq.map((f) => ({ q: f.qEn, a: f.aEn })),
  };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8">
      <p className="text-xs uppercase tracking-[0.18em] text-cream-faint">
        Frissítve / Last updated: {c.lastUpdated}
      </p>
      <div className="mt-4">
        <SupportDoc doc={hu} email={c.contactEmail} />
      </div>
      <hr className="my-10 border-line" />
      <div lang="en">
        <SupportDoc doc={en} email={c.contactEmail} />
      </div>
    </div>
  );
}
