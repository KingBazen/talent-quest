import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DemoBanner } from "@/components/layout/DemoBanner";
import { ChatbotWidget } from "@/components/chatbot/ChatbotWidget";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "Arial", "sans-serif"],
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  fallback: ["system-ui", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://talentquest.example.com"),
  title: {
    default: "TalentQuest — Ethiopia's stage for the next big talent",
    template: "%s · TalentQuest",
  },
  description:
    "Register, submit a video, and compete in singing, dancing, acting, comedy, instruments, and more. AGT-style competition built for Ethiopia.",
  keywords: [
    "talent show",
    "Ethiopia",
    "AGT",
    "Idol",
    "competition",
    "registration",
    "Telebirr",
    "singing",
    "dancing",
    "acting",
  ],
  openGraph: {
    title: "TalentQuest",
    description:
      "Ethiopia's stage for the next generation of singers, dancers, actors, comedians, and one-of-a-kind talents.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${display.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <DemoBanner />
          <Navbar />
          <main className="min-h-[60vh]">{children}</main>
          <Footer />
          <ChatbotWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
