import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OMNI-CRM | Tier-1 Forex Brokerage System",
  description: "Enterprise-grade CRM for Forex Brokerage operations. Smart Task Manager, A-Book/B-Book Analytics, Multi-level IB System, and Real-time Operations.",
  keywords: ["Forex", "CRM", "Brokerage", "Trading", "MT4", "MT5", "IB", "KYC"],
  authors: [{ name: "OMNI-CRM Team" }],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "OMNI-CRM | Tier-1 Forex Brokerage System",
    description: "Enterprise-grade CRM for Forex Brokerage operations",
    type: "website",
  },
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
