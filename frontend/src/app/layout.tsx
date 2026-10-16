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
  title: "FinLegacy AI — The AI Agent That Turns Financial Legacy Into Action",
  description:
    "Discover potential forgotten assets, organise documents, navigate deceased-family-member claims, plan wills, and track every step — from scattered records to a clear, evidence-backed path to resolution.",
  keywords: [
    "FinLegacy AI",
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
    title: "FinLegacy AI",
    description: "The AI Agent That Turns Financial Legacy Into Action.",
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
