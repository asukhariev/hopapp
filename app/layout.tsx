import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = {
  title: "HopLab — hop.agtc.app",
  description: "Lab evaluations: create users, run analyses on the Noraxon MR4 kit.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <Providers>
          <AppHeader />
          {children}
        </Providers>
      </body>
    </html>
  );
}
