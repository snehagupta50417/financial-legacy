import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const serif = Fraunces({ variable: "--font-serif-display", subsets: ["latin"], axes: ["SOFT", "WONK", "opsz"] });
const sans = Instrument_Sans({ variable: "--font-sans-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "keeper — know what you own, help your family know what comes next",
  description:
    "Talk to Keeper to discover financial assets, prepare your financial affairs for the end of life, or navigate asset claims after a loved one dies. Prototype with synthetic data.",
  openGraph: { title: "keeper", description: "Know what you own. Help your family know what comes next.", type: "website" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#F5F1E9" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${serif.variable} ${sans.variable}`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
