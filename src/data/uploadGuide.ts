import {
  Lightbulb,
  Camera,
  Mic,
  Film,
  Smartphone,
  Image,
  Volume2,
  Clock,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

export interface UploadTip {
  icon: LucideIcon;
  title: string;
  summary: string;
  do: string[];
  dont: string[];
}

export const UPLOAD_TIPS: UploadTip[] = [
  {
    icon: Image,
    title: "Background",
    summary: "Keep the frame clean so the eye lands on you.",
    do: [
      "Pick a plain wall, simple curtain, or stage-style backdrop.",
      "Match the mood — a darker background for emotional pieces, brighter for upbeat ones.",
      "Tidy up before pressing record (no laundry on the bed!).",
    ],
    dont: [
      "Don't film in front of windows backlighting you into a silhouette.",
      "Avoid busy patterns or moving people behind you.",
      "Skip filters that distort your face or stage paint.",
    ],
  },
  {
    icon: Lightbulb,
    title: "Lighting",
    summary: "Soft, front-facing light makes everything more cinematic.",
    do: [
      "Face the brightest light source (a window during the day works perfectly).",
      "Use a ring light or two lamps with diffusion (a white cloth or paper).",
      "Keep light slightly above eye level for a flattering angle.",
    ],
    dont: [
      "Don't have only one bulb behind you — you'll be a dark silhouette.",
      "Avoid harsh overhead lights that cast shadows under your eyes.",
      "Don't mix warm (yellow) and cool (white) lights without balancing them.",
    ],
  },
  {
    icon: Camera,
    title: "Camera angle",
    summary: "Frame yourself like a professional production.",
    do: [
      "Place the camera at eye level or slightly above.",
      "Leave a little headroom; center your eyes on the upper third.",
      "Shoot vertical (1080×1920) for reels-style; horizontal (1920×1080) for stage.",
    ],
    dont: [
      "Don't shoot from below — it distorts your face.",
      "Avoid tilted phones unless it's an intentional creative choice.",
      "Don't keep the camera shaking; prop it on a tripod or stable surface.",
    ],
  },
  {
    icon: Volume2,
    title: "Audio quality",
    summary: "Bad audio is the #1 reason great performances get skipped.",
    do: [
      "Record in a quiet room with soft furniture (carpet, sofa, curtains).",
      "Test your audio levels first; voice should be clear and consistent.",
      "Use an external mic if you have one (lavalier or USB).",
    ],
    dont: [
      "Don't record next to fans, AC units, or open windows.",
      "Avoid loud playback that clips and distorts.",
      "Don't add heavy reverb or auto-tune in editing — judges want to hear *you*.",
    ],
  },
  {
    icon: Mic,
    title: "Microphone distance",
    summary: "The right distance changes everything.",
    do: [
      "For singing: 15–20 cm (a hand's width) from a condenser; further for loud notes.",
      "For speaking/comedy: 20–30 cm, slightly off-axis to avoid pops.",
      "Use a windscreen or pop filter if you have one.",
    ],
    dont: [
      "Don't shout into the phone's built-in mic from 5 cm away — it will distort.",
      "Avoid moving toward and away from the mic mid-performance.",
      "Don't tap or bump the mic stand during recording.",
    ],
  },
  {
    icon: Smartphone,
    title: "Phone recording tips",
    summary: "Most submissions are filmed on a phone — make yours stand out.",
    do: [
      "Clean the lens with a soft cloth before recording.",
      "Lock focus and exposure on your face (long-press the screen).",
      "Set resolution to 1080p, 30fps minimum.",
      "Use airplane mode + Do Not Disturb so calls don't ruin the take.",
    ],
    dont: [
      "Don't use 4K unless your phone is on a tripod and storage is plentiful.",
      "Avoid digital zoom — move closer instead.",
      "Don't record with a low battery; record at 50%+ to avoid thermal throttling.",
    ],
  },
  {
    icon: Clock,
    title: "Video duration",
    summary: "60 to 180 seconds is the sweet spot.",
    do: [
      "Hook the judges within the first 10 seconds.",
      "Cut anything that doesn't directly showcase your talent.",
      "End on a strong moment — leave them wanting more.",
    ],
    dont: [
      "Don't waste time on long intros, slate cards, or credits.",
      "Avoid going over 3 minutes unless the category specifically allows it.",
      "Don't pad with fades, slow-motion replays, or unrelated footage.",
    ],
  },
  {
    icon: Film,
    title: "File format",
    summary: "We accept standard, judge-friendly formats.",
    do: [
      "Export as MP4 (H.264) — most universally compatible.",
      "Keep file size under 500 MB.",
      "Aim for 1080p resolution at 30 fps.",
    ],
    dont: [
      "Don't upload .MKV, .AVI, or proprietary formats.",
      "Avoid uncompressed files larger than 1 GB.",
      "Don't screenshot a video and submit a static image.",
    ],
  },
  {
    icon: CheckCircle2,
    title: "How to test before uploading",
    summary: "A 60-second test run will save you a rejected submission.",
    do: [
      "Watch the full video on a phone speaker AND headphones.",
      "Show it to a friend in another room — can they hear and see clearly?",
      "Check the first 10 seconds: does it grab attention?",
      "Verify the file plays from start to finish without freezing.",
    ],
    dont: [
      "Don't upload without watching the final export.",
      "Avoid trusting the preview thumbnail — always full-play it.",
      "Don't submit straight from the camera roll without renaming the file (use Name_Category.mp4).",
    ],
  },
];
