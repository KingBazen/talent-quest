import { Sequence, useVideoConfig } from "remotion";
import { Stage } from "./Stage";
import { Intro } from "./scenes/Intro";
import { Headline } from "./scenes/Headline";
import { Categories } from "./scenes/Categories";
import { Stats } from "./scenes/Stats";
import { CTA } from "./scenes/CTA";

type Layout = "vertical" | "square" | "horizontal";

// 15s @ 30fps = 450 frames, split across 5 beats.
const BEATS = {
  intro: { from: 0, dur: 75 },        // 0.0 – 2.5s
  headline: { from: 75, dur: 90 },    // 2.5 – 5.5s
  categories: { from: 165, dur: 90 }, // 5.5 – 8.5s
  stats: { from: 255, dur: 105 },     // 8.5 – 12.0s
  cta: { from: 360, dur: 90 },        // 12.0 – 15.0s
};

export const Promo: React.FC<{ layout: Layout }> = ({ layout }) => {
  const { width, height } = useVideoConfig();
  // Pick layout from aspect ratio if not explicitly passed.
  const inferred: Layout =
    layout ?? (height > width ? "vertical" : width === height ? "square" : "horizontal");

  return (
    <Stage>
      <Sequence from={BEATS.intro.from} durationInFrames={BEATS.intro.dur}>
        <Intro layout={inferred} />
      </Sequence>
      <Sequence from={BEATS.headline.from} durationInFrames={BEATS.headline.dur}>
        <Headline />
      </Sequence>
      <Sequence from={BEATS.categories.from} durationInFrames={BEATS.categories.dur}>
        <Categories layout={inferred} />
      </Sequence>
      <Sequence from={BEATS.stats.from} durationInFrames={BEATS.stats.dur}>
        <Stats layout={inferred} />
      </Sequence>
      <Sequence from={BEATS.cta.from} durationInFrames={BEATS.cta.dur}>
        <CTA />
      </Sequence>
    </Stage>
  );
};
