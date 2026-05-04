import type { ShowcaseClip } from "@/types";

// Demo data — Phase 1. In Phase 2 these come from the videos table via the
// /api/showcase endpoint, with Mux/Cloudinary HLS streams and signed URLs.
export const SHOWCASE_CLIPS: ShowcaseClip[] = [
  {
    id: "vid_001",
    title: "Tezeta — solo vocal",
    contestant: "Hanna T.",
    category: "singing",
    city: "Addis Ababa",
    thumbnail:
      "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800&q=80",
    youtubeId: "dQw4w9WgXcQ",
    durationSec: 168,
    views: 12489,
    likes: 1872,
  },
  {
    id: "vid_002",
    title: "Eskista crew — Lalibela",
    contestant: "Selam Crew",
    category: "dancing",
    city: "Lalibela",
    thumbnail:
      "https://images.unsplash.com/photo-1535525153412-5a42439a210d?w=800&q=80",
    durationSec: 60,
    views: 28310,
    likes: 4023,
  },
  {
    id: "vid_003",
    title: "Krar instrumental",
    contestant: "Yonas G.",
    category: "instruments",
    city: "Bahir Dar",
    thumbnail:
      "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&q=80",
    durationSec: 142,
    views: 8723,
    likes: 941,
  },
  {
    id: "vid_004",
    title: "Stand-up — taxi adventures",
    contestant: "Mikiyas L.",
    category: "comedy",
    city: "Addis Ababa",
    thumbnail:
      "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=800&q=80",
    durationSec: 180,
    views: 41200,
    likes: 6190,
  },
  {
    id: "vid_005",
    title: "Hamlet monologue",
    contestant: "Ruth A.",
    category: "acting",
    city: "Hawassa",
    thumbnail:
      "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80",
    durationSec: 120,
    views: 5021,
    likes: 612,
  },
  {
    id: "vid_006",
    title: "Beatbox loop",
    contestant: "Daniel K.",
    category: "other",
    city: "Dire Dawa",
    thumbnail:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
    durationSec: 75,
    views: 17890,
    likes: 2380,
  },
  {
    id: "vid_007",
    title: "Contemporary duet",
    contestant: "Sara & Kalkidan",
    category: "dancing",
    city: "Addis Ababa",
    thumbnail:
      "https://images.unsplash.com/photo-1518834107812-67b0b7c58434?w=800&q=80",
    durationSec: 165,
    views: 9342,
    likes: 1112,
  },
  {
    id: "vid_008",
    title: "Original ballad — first take",
    contestant: "Mekdes B.",
    category: "singing",
    city: "Mekelle",
    thumbnail:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
    durationSec: 210,
    views: 6712,
    likes: 803,
  },
  {
    id: "vid_009",
    title: "Sketch — interview gone wrong",
    contestant: "Comedy Lab",
    category: "comedy",
    city: "Addis Ababa",
    thumbnail:
      "https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?w=800&q=80",
    durationSec: 95,
    views: 24310,
    likes: 3140,
  },
];
