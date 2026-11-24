import type { Metadata } from "next";
import "./globals.css";
import { AppCompositionRoot } from "./composition-root";
import { AppShell } from "@/features/app-shell/app-shell";

export const metadata: Metadata = {
  title: "DutchFlow — Learn Dutch, one step at a time",
  description: "A calm, local-first way to build confidence in Dutch.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppCompositionRoot>
          <AppShell>{children}</AppShell>
        </AppCompositionRoot>
      </body>
    </html>
  );
}
