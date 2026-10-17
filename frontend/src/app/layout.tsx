import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Financial Legacy — Find what’s yours. Make sure nothing gets left behind.",
  description:
    "An AI assistant that helps Indian families find forgotten financial assets, organise their records, and claim what a loved one left behind — step by step, with every finding backed by evidence.",
  keywords: [
    "Financial Legacy",
    "unclaimed assets India",
    "UDGAM",
    "Bima Bharosa",
    "IEPF",
    "MITRA",
    "estate planning",
    "deceased claim",
    "AI agent BFSI",
  ],
  openGraph: {
    title: "Financial Legacy",
    description: "Find what’s yours. Make sure nothing gets left behind.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a2540",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
