import { Info } from "lucide-react";

export function DemoBanner() {
  return (
    <div className="bg-gradient-to-r from-brand-500 via-fuchsia-500 to-cyan-400 text-white">
      <div className="container py-2 text-xs sm:text-sm flex items-center gap-2 justify-center text-center">
        <Info className="h-3.5 w-3.5 shrink-0" />
        <span>
          Phase 1 promotional demo — payments, video upload, scoring & AI
          chatbot are mocked. Full production launches in Phase 2.
        </span>
      </div>
    </div>
  );
}
