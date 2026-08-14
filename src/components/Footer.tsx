"use client";

import Link from "next/link";
import { useApp } from "@/components/Providers";

/**
 * Set NEXT_PUBLIC_COFFEE_URL to turn the tip line into a real link. Until the
 * dev has one it renders as plain, honest text instead of a dead button.
 */
const COFFEE_URL = process.env.NEXT_PUBLIC_COFFEE_URL ?? "";

export function Footer() {
  const { t } = useApp();

  return (
    <footer className="relative z-10 mt-20 border-t border-edge bg-abyss/60">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <p className="text-sm font-bold text-ink">
              Nojos Boss Time <span className="text-spirit">Spirit Vale</span>
            </p>
            <p className="mt-2 text-xs leading-relaxed text-faint">{t("footer.data")}</p>
            <p className="mt-3 text-xs leading-relaxed text-faint">{t("footer.privacy.short")}</p>
          </div>

          <div className="flex flex-col items-start gap-3 sm:items-end">
            {COFFEE_URL ? (
              <a
                href={COFFEE_URL}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center gap-2 rounded-xl border border-imperial/35 bg-imperial/10 px-4 py-2 text-sm font-bold text-imperial transition-colors hover:bg-imperial/20"
              >
                <CoffeeIcon />
                {t("footer.coffee")}
              </a>
            ) : (
              <span className="flex items-center gap-2 rounded-xl border border-edge px-4 py-2 text-sm font-semibold text-faint">
                <CoffeeIcon />
                {t("footer.coffee")} <span className="text-xs">{t("footer.coffee.soon")}</span>
              </span>
            )}
            <Link
              href="/privacidade"
              className="text-xs font-semibold text-muted underline-offset-4 transition-colors hover:text-spirit hover:underline"
            >
              {t("footer.privacy")}
            </Link>
          </div>
        </div>

        <div className="hairline my-8" />

        <p className="text-[11px] leading-relaxed text-faint">{t("footer.fan")}</p>
      </div>
    </footer>
  );
}

function CoffeeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none">
      <path
        d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M8 3v2M12 3v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
