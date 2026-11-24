"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useI18n } from "@/features/i18n/i18n-provider";

export function AppShell({ children }: { children: ReactNode }) {
  const { t, preferenceLoadFailed } = useI18n();

  return (
    <>
      <header className="site-header">
        <Link aria-label={t("app.home")} className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span>{t("app.brand")}</span>
        </Link>
        <nav className="header-nav" aria-label={t("nav.main")}>
          <Link className="header-note" href="/">{t("nav.practice")}</Link>
          <Link className="header-note" href="/progress/">{t("nav.progress")}</Link>
          <Link className="header-note" href="/settings/">{t("nav.settings")}</Link>
        </nav>
      </header>
      {preferenceLoadFailed && <p className="notice-error" role="alert">{t("i18n.error.preferences")}</p>}
      <main>{children}</main>
      <footer className="site-footer">{t("footer.tagline")}</footer>
    </>
  );
}
