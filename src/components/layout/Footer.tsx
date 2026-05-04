import Link from "next/link";
import { Sparkles, Instagram, Youtube, Send } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background mt-20">
      <div className="container py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1 space-y-3">
          <div className="flex items-center gap-2 font-bold">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 via-fuchsia-500 to-cyan-400 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-lg tracking-tight">TalentQuest</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs">
            Ethiopia's stage for the next generation of singers, dancers,
            comedians, actors, and one-of-a-kind talents.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Compete</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/register" className="hover:text-foreground">Register</Link></li>
            <li><Link href="/how-it-works" className="hover:text-foreground">How it works</Link></li>
            <li><Link href="/categories" className="hover:text-foreground">Categories</Link></li>
            <li><Link href="/upload-guide" className="hover:text-foreground">Upload guide</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Discover</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/showcase" className="hover:text-foreground">Showcase</Link></li>
            <li><Link href="/result-checker" className="hover:text-foreground">Result checker</Link></li>
            <li><Link href="/faq" className="hover:text-foreground">FAQ / Chatbot</Link></li>
            <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Behind the scenes</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/admin-demo" className="hover:text-foreground">Admin demo</Link></li>
            <li><Link href="/referee-demo" className="hover:text-foreground">Referee demo</Link></li>
          </ul>
          <div className="flex gap-2 mt-4">
            <Link
              href="#"
              aria-label="Instagram"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
            >
              <Instagram className="h-4 w-4" />
            </Link>
            <Link
              href="#"
              aria-label="YouTube"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
            >
              <Youtube className="h-4 w-4" />
            </Link>
            <Link
              href="#"
              aria-label="Telegram"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
            >
              <Send className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-border/40">
        <div className="container py-5 flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} TalentQuest. Phase 1 — promotional demo.</p>
          <p>
            Payments, video upload, judging & AI chatbot are clearly labeled as
            <span className="ml-1 inline-flex items-center rounded-full bg-muted px-2 py-0.5 font-semibold">
              demo / future-production
            </span>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
