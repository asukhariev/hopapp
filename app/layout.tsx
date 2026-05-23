import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HopClaw — hop.agtc.app",
  description:
    "Remote driver for Noraxon MR4 export. Start, stop, download.",
};

/**
 * Theme bootstrap — strictly follows the OS preference.
 *
 * 1. Sets the initial `.dark` class on <html> synchronously before paint.
 * 2. Listens to prefers-color-scheme changes and flips the class live.
 *
 * No localStorage, no manual override — the OS is the single source of truth.
 */
const themeBootstrap = `
(function(){
  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var apply = function() {
      document.documentElement.classList.toggle('dark', mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
