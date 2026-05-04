# TalentQuest — Promo Videos (Remotion)

Self-contained Remotion project for generating TalentQuest promo videos in three formats:

| Composition       | Size        | Duration | Use for                                       |
|-------------------|-------------|----------|-----------------------------------------------|
| `PromoReels`      | 1080 × 1920 | 15s      | TikTok, IG Reels, YouTube Shorts, FB Reels    |
| `PromoSquare`     | 1080 × 1080 | 15s      | Instagram feed, Facebook feed                 |
| `PromoLandscape`  | 1920 × 1080 | 15s      | YouTube, Telegram channel, Facebook page      |

## Quickstart

```bash
cd videos
npm install
npm run studio       # opens live preview at http://localhost:3000
npm run render:all   # writes out/promo-{reels,square,landscape}.mp4
```

## Project layout

```
src/
  Root.tsx          ← registers the three compositions
  Promo.tsx         ← single 15s timeline reused at all sizes
  Stage.tsx         ← stage gradient + drifting spotlight blobs
  brand.ts          ← colors / copy mirrored from tailwind.config.ts
  scenes/
    Intro.tsx       ← logo + season badge       (0.0 – 2.5s)
    Headline.tsx    ← tagline reveal            (2.5 – 5.5s)
    Categories.tsx  ← 6 talent categories grid  (5.5 – 8.5s)
    Stats.tsx       ← cities, prize, signups    (8.5 – 12.0s)
    CTA.tsx         ← register button + URL     (12.0 – 15.0s)
```

## Editing copy or colors

`src/brand.ts` is the single source of truth. The constants there are mirrored from the main app's `tailwind.config.ts` — keep them in sync if the brand palette changes.

## Adding music

Drop a royalty-free track at `public/track.mp3` and add inside `Promo.tsx`:

```tsx
import { Audio, staticFile } from "remotion";
// ...inside <Stage>:
<Audio src={staticFile("track.mp3")} volume={0.6} />
```

Sources for free tracks: YouTube Audio Library, Pixabay Music, Uppbeat (free tier with attribution).

## Posting per platform

| Platform     | File                  | Notes                                                                |
|--------------|-----------------------|----------------------------------------------------------------------|
| TikTok       | `promo-reels.mp4`     | Add captions on TikTok itself; first 1s is the hook.                 |
| IG Reels     | `promo-reels.mp4`     | Cross-post to FB Reels via Meta Business Suite.                      |
| YT Shorts    | `promo-reels.mp4`     | Title must include `#Shorts` for the Shorts shelf.                   |
| YT main      | `promo-landscape.mp4` | Upload as standard video; add registration link in description.      |
| IG / FB feed | `promo-square.mp4`    | Autoplays muted in feed — bake captions in if any speech is added.   |
| Telegram     | `promo-landscape.mp4` | Post as **video** (not file) so it plays inline in the channel.      |

## Iterating with Claude

Open the Remotion Studio (`npm run studio`), then ask Claude things like:
- "Make the headline land harder — add a subtle camera shake when 'next big talent' appears."
- "Replace the categories grid with a phone mockup that scrolls through three contestant cards."
- "Cut the intro to 1.5s so we hit the headline faster on TikTok."

Claude edits the scene files; the Studio hot-reloads. When the look is right, run `npm run render:all`.
