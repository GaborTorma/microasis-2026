"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { CalendarRange, Disc3, QrCode } from "lucide-react";

// Map route still exists at /map but is intentionally unlinked for now.
// /share shows a QR code so festival-goers can hand the app to each other.
const TABS = [
  { href: "/", key: "timetable", Icon: CalendarRange },
  { href: "/now", key: "now", Icon: Disc3 },
  { href: "/share", key: "share", Icon: QrCode },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center"
      style={{ paddingBottom: "calc(var(--safe-bottom) + 0.6rem)" }}
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-leaf/40 bg-ink/85 p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        {TABS.map(({ href, key, Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={key}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                active
                  ? "bg-sun/15 text-sun shadow-[inset_0_0_0_1px_rgba(94,201,138,0.35)]"
                  : "text-cream-faint hover:text-cream-dim"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
              {/* label only on the active tab to keep the pill compact */}
              <span className={active ? "inline" : "hidden"}>{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
