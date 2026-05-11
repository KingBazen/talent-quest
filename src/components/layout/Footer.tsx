import Link from "next/link";
import { Instagram, Youtube, Send } from "lucide-react";
import { BlingLogo } from "@/components/brand/BlingLogo";

export function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background mt-20">
      <div className="container py-12 grid gap-10 md:grid-cols-5">
        <div className="md:col-span-1 space-y-3">
          <BlingLogo variant="lockup" size={44} />
          <p className="text-sm text-muted-foreground max-w-xs">
            A music-first talent competition by Bling Records and Neo Studios —
            built to find Ethiopia&apos;s next icon on stage.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Compete</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/register" className="hover:text-foreground">Apply now</Link></li>
            <li><Link href="/auditions" className="hover:text-foreground">How auditions work</Link></li>
            <li><Link href="/categories" className="hover:text-foreground">Music categories</Link></li>
            <li><Link href="/upload-guide" className="hover:text-foreground">Audition video guide</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">The show</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/about" className="hover:text-foreground">About the show</Link></li>
            <li><Link href="/show-format" className="hover:text-foreground">Show format</Link></li>
            <li><Link href="/judges" className="hover:text-foreground">Industry panel</Link></li>
            <li><Link href="/episodes" className="hover:text-foreground">Episodes</Link></li>
            <li><Link href="/stage-performances" className="hover:text-foreground">Stage performances</Link></li>
            <li><Link href="/reels" className="hover:text-foreground">Reels</Link></li>
            <li><Link href="/showcase" className="hover:text-foreground">Showcase</Link></li>
            <li><Link href="/contestants" className="hover:text-foreground">Contestants</Link></li>
            <li><Link href="/leaderboard" className="hover:text-foreground">Leaderboard</Link></li>
            <li><Link href="/result-checker" className="hover:text-foreground">Result checker</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Legal</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/terms" className="hover:text-foreground">Terms &amp; rules</Link></li>
            <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
            <li><Link href="/refund-policy" className="hover:text-foreground">Refund policy</Link></li>
            <li><Link href="/content-rights" className="hover:text-foreground">Content rights</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold text-sm mb-3">Talk to us</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
            <li><Link href="/faq" className="hover:text-foreground">FAQ / Stage Bot</Link></li>
            <li><Link href="/login" className="hover:text-foreground">Sign in</Link></li>
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
          <p>© {new Date().getFullYear()} The Bling Records Talent Show. All rights reserved.</p>
          <p>Built in Ethiopia · Bling Records × Neo Studios.</p>
        </div>
      </div>
    </footer>
  );
}
