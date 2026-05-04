import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container py-24 text-center max-w-xl">
      <p className="font-display text-7xl md:text-9xl font-bold gradient-text">
        404
      </p>
      <h1 className="mt-2 font-display text-3xl md:text-4xl font-bold">
        That stage doesn't exist.
      </h1>
      <p className="mt-3 text-muted-foreground">
        The page you're looking for has stepped offstage. Try one of these
        instead.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Button asChild variant="gradient">
          <Link href="/">
            <Sparkles className="h-4 w-4 mr-1.5" />
            Back to home
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/register">Register</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/showcase">Showcase</Link>
        </Button>
      </div>
    </div>
  );
}
