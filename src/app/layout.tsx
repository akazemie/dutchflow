import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { AppCompositionRoot } from "./composition-root";

export const metadata: Metadata = {
  title: "DutchFlow — Learn Dutch, one step at a time",
  description: "A calm, local-first way to build confidence in Dutch.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <Link aria-label="DutchFlow home" className="brand" href="/">
            <span className="brand-mark" aria-hidden="true">D</span>
            <span>DutchFlow</span>
          </Link>
          <span className="header-note">A little Dutch, every day</span>
        </header>
        <AppCompositionRoot>
          <main>{children}</main>
        </AppCompositionRoot>
        <footer className="site-footer">Learn at your pace. Your progress stays on this device.</footer>
      </body>
    </html>
  );
}
