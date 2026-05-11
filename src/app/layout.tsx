import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

import dynamic from "next/dynamic";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { SessionProvider } from "@/components/auth/SessionProvider";
import { LangProvider } from "@/components/i18n/LangProvider";

// P7-T015: defer the chatbot off the critical path. It only renders on
// interaction, so its framer-motion + chat data + Anthropic-aware client
// shouldn't block first paint.
const ChatbotWidget = dynamic(
  () =>
    import("@/components/chatbot/ChatbotWidget").then((m) => m.ChatbotWidget),
  { ssr: false }
);

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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://blingrecordsshow.com"
  ),
  title: {
    default: "The Bling Records Talent Show — Ethiopia's next musical icon",
    template: "%s · The Bling Records Talent Show",
  },
  description:
    "A music-first talent competition by Bling Records and Neo Studios. Apply, submit your audition video, and rise from your bedroom to the music house.",
  keywords: [
    "Bling Records",
    "Neo Studios",
    "music competition",
    "Ethiopia",
    "audition",
    "rap",
    "singing",
    "songwriter",
    "instruments",
    "Telebirr",
  ],
  applicationName: "Bling Records Talent Show",
  // Convention-based files (`app/icon.png`, `app/apple-icon.png`,
  // `app/opengraph-image.png`, `app/twitter-image.png`) are auto-detected by
  // the App Router. We still declare explicit pointers so older crawlers and
  // share previews that don't follow Next's convention can resolve them.
  icons: {
    icon: [{ url: "/icon.png", type: "image/png" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: ["/icon.png"],
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "The Bling Records Talent Show",
    description:
      "Ethiopia's music-first talent show — by Bling Records and Neo Studios.",
    type: "website",
    siteName: "Bling Records Talent Show",
    locale: "en_ET",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Bling Records Talent Show",
    description:
      "Ethiopia's music-first talent show — by Bling Records and Neo Studios.",
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

// JSON-LD Organization schema — drives the logo + sitelinks rich card in
// Google search results. The `logo` URL must be publicly fetchable, so we
// resolve against the same metadataBase the rest of the metadata uses.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://blingrecordsshow.com";
const ORG_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Bling Records Talent Show",
  alternateName: ["Bling Records", "Bling Records Talent Show"],
  url: SITE_URL,
  logo: `${SITE_URL}/brand/icon-512.png`,
  description:
    "Ethiopia's music-first talent show — by Bling Records and Neo Studios.",
  sameAs: [] as string[],
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
        <script
          type="application/ld+json"
          // Inlined by Next so the bot sees it on first paint without JS.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_SCHEMA) }}
        />
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LangProvider>
            <SessionProvider>
              <Navbar />
              <main className="min-h-[60vh]">{children}</main>
              <Footer />
              <ChatbotWidget />
            </SessionProvider>
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
